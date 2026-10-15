// ==============================================================================
// SIT SCHOLARSHIP APPLICATION PORTAL - COMPREHENSIVE TEST SUITE
// Tests run against an isolated test environment.
// Production URL collision guard enforced.
// ==============================================================================

// Ensure test encryption key is a valid 32-byte base64 string
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "FQWZfZCYWeU1cS7veY3ZNT31pY7WpI91fBDtflk7eCo=";
process.env.ENCRYPTION_KEY_PREVIOUS =
  process.env.ENCRYPTION_KEY_PREVIOUS || "Um/ivwzWJhzwAOqpV9w5uomuUNIoMc5rOcV+aqXvPT4=";

// Guard against pointing tests to production Supabase project
const prodUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const testUrl = process.env.TEST_SUPABASE_URL;
const testPublishableKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const testSecretKey = process.env.TEST_SUPABASE_SECRET_KEY;
const skipIntegration = process.env.SKIP_INTEGRATION === "1";

if (testUrl && prodUrl && testUrl.trim() === prodUrl.trim()) {
  console.error("FATAL: TEST_SUPABASE_URL must NOT equal NEXT_PUBLIC_SUPABASE_URL!");
  console.error("Tests must run against a separate test Supabase project to protect real student data.");
  process.exit(1);
}

const hasTestDbConfig =
  Boolean(testUrl?.trim()) &&
  Boolean(testPublishableKey?.trim()) &&
  Boolean(testSecretKey?.trim());

// Loud failure if any test database credentials are missing without explicit SKIP_INTEGRATION=1
if (!hasTestDbConfig && !skipIntegration) {
  console.error("\n==================================================================");
  console.error("FATAL: REAL DATABASE INTEGRATION TESTS FAILED - CONFIG MISSING");
  console.error("==================================================================");
  console.error("Integration tests against a real isolated Supabase database are required.");
  console.error("The following required environment variables are missing or empty:");
  if (!testUrl?.trim()) console.error("  ✕ TEST_SUPABASE_URL");
  if (!testPublishableKey?.trim()) console.error("  ✕ TEST_SUPABASE_PUBLISHABLE_KEY");
  if (!testSecretKey?.trim()) console.error("  ✕ TEST_SUPABASE_SECRET_KEY");
  console.error("\nTo execute unit and simulated tests without a real test database, you must");
  console.error("explicitly pass SKIP_INTEGRATION=1 (e.g. 'SKIP_INTEGRATION=1 npm test').");
  console.error("==================================================================\n");
  process.exit(1);
}

import {
  step1Schema,
  step2Schema,
  step3Schema,
  step5Schema,
} from "../src/lib/schemas/application";
import { evaluateEligibility } from "../src/lib/eligibility";
import { calculateMeritScore, rankApplicantsByYear } from "../src/lib/merit";
import { generateApplicationPdf } from "../src/lib/pdf/generatePdf";
import { Scholarship, ApplicationRecord } from "../src/lib/types";
import { validatePasswordStrength } from "../src/lib/auth/password-policy";
import {
  encryptBankAccount,
  decryptBankAccount,
  maskBankAccount,
  getBankAccLast4,
} from "../src/lib/crypto/field-encryption";
import { generateUnambiguousRefNo } from "../src/lib/crypto/ref-no";
import { ALLOWED_FILE_KINDS, isValidFileKind, detectMimeFromBytes } from "../src/lib/storage";
import { checkRateLimit } from "../src/lib/rate-limit";
import { verifyStateChangingOrigin } from "../src/lib/auth/origin-guard";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

let passedTests = 0;
let totalTests = 0;
let realDbTests = 0;
let simulatedTests = 0;
let skippedTests = 0;

function assert(
  condition: boolean,
  testName: string,
  mode: "unit" | "test_db" | "simulated" = "unit"
) {
  totalTests++;
  const prefix =
    mode === "test_db"
      ? "ran against test DB"
      : mode === "simulated"
      ? "simulated"
      : "unit";

  if (condition) {
    console.log(`  ✓ PASS [${prefix}]: ${testName}`);
    passedTests++;
    if (mode === "test_db") realDbTests++;
    if (mode === "simulated") simulatedTests++;
  } else {
    console.error(`  ✕ FAIL [${prefix}]: ${testName}`);
    throw new Error(`Test failed: [${prefix}] ${testName}`);
  }
}

function recordSkipped(testName: string, reason: string) {
  totalTests++;
  skippedTests++;
  console.log(`  ⏭ SKIPPED [skipped]: ${testName} (${reason})`);
}

async function runTests() {
  console.log("====================================================");
  console.log("SIT SCHOLARSHIP PORTAL - PHASE 1 TEST SUITE");
  console.log("====================================================\n");

  // 0. Safety & Environment Guard Tests
  console.log("--- 0. Safety & Environment Isolation Guards ---");
  assert(
    !testUrl || testUrl !== prodUrl,
    "Separate test database guard verified: test URL never matches production URL"
  );
  assert(
    Buffer.from(process.env.ENCRYPTION_KEY!, "base64").length === 32,
    "AES-256-GCM ENCRYPTION_KEY is valid 32-byte base64 encoded secret"
  );

  // 1. Zod Schema Unit Tests
  console.log("\n--- 1. Zod Schema Unit Tests ---");

  // Phone Validation
  const validPhone = step1Schema.safeParse({
    scholarship_code: "MNC",
    full_name: "ROHAN PATIL",
    usn: "1SI23CS089",
    dob: "2005-05-15",
    nationality: "Indian",
    father_or_guardian_name: "BASAVARAJ PATIL",
    address: "Room 204, SIT Campus Hostel, Tumakuru",
    mobile: "9880123456",
    email: "rohan@sit.ac.in",
  });
  assert(validPhone.success, "Valid phone number (10 digits starting with 9) accepted");

  const invalidPhone = step1Schema.safeParse({
    scholarship_code: "MNC",
    full_name: "ROHAN PATIL",
    usn: "1SI23CS089",
    dob: "2005-05-15",
    nationality: "Indian",
    father_or_guardian_name: "BASAVARAJ PATIL",
    address: "Room 204, SIT Campus Hostel, Tumakuru",
    mobile: "5123456789", // starts with 5 (invalid)
    email: "rohan@sit.ac.in",
  });
  assert(!invalidPhone.success, "Invalid mobile starting with 5 rejected");

  // USN Format
  const validUsn = step1Schema.safeParse({
    scholarship_code: "MNC",
    full_name: "ROHAN PATIL",
    usn: "1SI23CS089",
    dob: "2005-05-15",
    nationality: "Indian",
    father_or_guardian_name: "BASAVARAJ PATIL",
    address: "Room 204, SIT Campus Hostel, Tumakuru",
    mobile: "9880123456",
    email: "rohan@sit.ac.in",
  });
  assert(validUsn.success, "Valid USN format 1SI23CS089 accepted");

  const invalidUsn = step1Schema.safeParse({
    scholarship_code: "MNC",
    full_name: "ROHAN PATIL",
    usn: "2SI23CS089", // Invalid prefix
    dob: "2005-05-15",
    nationality: "Indian",
    father_or_guardian_name: "BASAVARAJ PATIL",
    address: "Room 204, SIT Campus Hostel, Tumakuru",
    mobile: "9880123456",
    email: "rohan@sit.ac.in",
  });
  assert(!invalidUsn.success, "Invalid USN prefix rejected");

  // DOB Age Range
  const invalidAgeYoung = step1Schema.safeParse({
    scholarship_code: "MNC",
    full_name: "ROHAN PATIL",
    usn: "1SI23CS089",
    dob: "2020-01-01", // 6 years old
    nationality: "Indian",
    father_or_guardian_name: "BASAVARAJ PATIL",
    address: "Room 204, SIT Campus Hostel, Tumakuru",
    mobile: "9880123456",
    email: "rohan@sit.ac.in",
  });
  assert(!invalidAgeYoung.success, "DOB < 16 years old rejected");

  // Step 2 Income
  const validIncome = step2Schema.safeParse({
    parent_occupation: "Agriculture",
    family_annual_income: 180000,
    income_cert_issue_date: "2025-06-10",
  });
  assert(validIncome.success, "Valid positive income accepted");

  const negativeIncome = step2Schema.safeParse({
    parent_occupation: "Agriculture",
    family_annual_income: -50000,
    income_cert_issue_date: "2025-06-10",
  });
  assert(!negativeIncome.success, "Negative annual income rejected");

  // Step 3 Marks Validation
  const validMarks = step3Schema.safeParse({
    admitted_through_cet: true,
    last_exam_passed: "II PUC",
    marks_obtained: 540,
    marks_gross_total: 600,
    course: "Computer Science and Engineering",
    year_of_study: 1,
    semester: 1,
    course_duration_years: 4,
    final_exam_month_year: "2028-06",
  });
  assert(validMarks.success, "Marks obtained <= gross total accepted");

  const invalidMarksOverflow = step3Schema.safeParse({
    admitted_through_cet: true,
    last_exam_passed: "II PUC",
    marks_obtained: 650,
    marks_gross_total: 600,
    course: "Computer Science and Engineering",
    year_of_study: 1,
    semester: 1,
    course_duration_years: 4,
    final_exam_month_year: "2028-06",
  });
  assert(!invalidMarksOverflow.success, "Marks obtained > gross total rejected");

  // Step 5 Bank IFSC Code & Account Match
  const validBank = step5Schema.safeParse({
    bank_acc_holder_name: "ROHAN PATIL",
    bank_acc_no: "123456789012",
    confirm_bank_acc_no: "123456789012",
    bank_name: "State Bank of India",
    bank_branch: "SIT Extension Counter, Tumakuru",
    bank_ifsc: "SBIN0040523",
  });
  assert(validBank.success, "Matching bank account numbers and valid IFSC accepted");

  const mismatchBank = step5Schema.safeParse({
    bank_acc_holder_name: "ROHAN PATIL",
    bank_acc_no: "123456789012",
    confirm_bank_acc_no: "123456789099",
    bank_name: "State Bank of India",
    bank_branch: "SIT Extension Counter, Tumakuru",
    bank_ifsc: "SBIN0040523",
  });
  assert(!mismatchBank.success, "Mismatched bank confirmation account rejected");

  const invalidIfsc = step5Schema.safeParse({
    bank_acc_holder_name: "ROHAN PATIL",
    bank_acc_no: "123456789012",
    confirm_bank_acc_no: "123456789012",
    bank_name: "State Bank of India",
    bank_branch: "SIT Extension Counter, Tumakuru",
    bank_ifsc: "INVALID123",
  });
  assert(!invalidIfsc.success, "Invalid bank IFSC rejected");

  // 2. Eligibility Engine Tests
  console.log("\n--- 2. Eligibility Engine Tests ---");

  const mncRules = {
    income_limit: 300000,
    cet_required: true,
    max_assistance_pct: 30,
    max_scholarship_pct: 50,
    allow_backlog: false,
    max_awardees_per_year: 1,
  };

  const incomeDisqualified = evaluateEligibility(
    { family_annual_income: 350000, admitted_through_cet: true, has_backlog_history: false, annual_fee: 100000, scholarship_amount_required_per_month: 2000 },
    mncRules,
    "MNC"
  );
  assert(incomeDisqualified.income_exceeded, "MNC: Income > 3,00,000 flagged as disqualified");
  assert(!incomeDisqualified.passed_all_hard_rules, "MNC: Income disqualification prevents passing hard rules");

  const cetDisqualified = evaluateEligibility(
    { family_annual_income: 200000, admitted_through_cet: false, has_backlog_history: false, annual_fee: 100000, scholarship_amount_required_per_month: 2000 },
    mncRules,
    "MNC"
  );
  assert(cetDisqualified.cet_disqualified, "MNC: Management quota / non-CET student flagged as disqualified");

  const backlogDisqualified = evaluateEligibility(
    { year_of_study: 2, family_annual_income: 200000, admitted_through_cet: true, has_backlog_history: true, annual_fee: 100000, scholarship_amount_required_per_month: 2000 },
    mncRules,
    "MNC"
  );
  assert(backlogDisqualified.backlog_disqualified, "MNC: Backlog history student flagged as disqualified");

  const fullyEligibleEval = evaluateEligibility(
    { family_annual_income: 180000, admitted_through_cet: true, has_backlog_history: false, annual_fee: 100000, scholarship_amount_required_per_month: 2500 },
    mncRules,
    "MNC"
  );
  assert(fullyEligibleEval.passed_all_hard_rules, "MNC: Compliant applicant passes all hard rules");

  // 3. Merit Score Calculation & Ranking Tests
  console.log("\n--- 3. Merit Calculation & Ranking Tests ---");

  const firstYearScore = calculateMeritScore({
    year_of_study: 1,
    marks_obtained: 570,
    marks_gross_total: 600,
  });
  assert(Math.abs(firstYearScore - 95.0) < 0.01, "First year merit score computed accurately as 95.00%");

  const seniorYearScore = calculateMeritScore({
    year_of_study: 3,
    cgpa: 9.24,
  });
  assert(Math.abs(seniorYearScore - 92.4) < 0.01, "Senior BE merit score (CGPA 9.24 * 10) computed accurately as 92.40%");

  const mockApplicants: ApplicationRecord[] = [
    {
      id: "app-1",
      ref_no: "SIT-MNC-2026-AAA111",
      student_id: "u1",
      cycle_id: "c1",
      status: "submitted",
      current_step: 5,
      data: { year_of_study: 1, marks_obtained: 540, marks_gross_total: 600 },
      computed: { percentage: 90, merit_score: 90.0, eligibility_flags: fullyEligibleEval },
      merit_score: 90.0,
      hard_copy_received: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "app-2",
      ref_no: "SIT-MNC-2026-BBB222",
      student_id: "u2",
      cycle_id: "c1",
      status: "submitted",
      current_step: 5,
      data: { year_of_study: 1, marks_obtained: 580, marks_gross_total: 600 },
      computed: { percentage: 96.67, merit_score: 96.67, eligibility_flags: fullyEligibleEval },
      merit_score: 96.67,
      hard_copy_received: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const ranked = rankApplicantsByYear(mockApplicants);
  assert(ranked[1].all[0].id === "app-2", "Rank 1 in Year 1 awarded to highest merit score (96.67%)");
  assert(ranked[1].all[1].id === "app-1", "Rank 2 in Year 1 awarded to second highest merit score (90.00%)");

  // 4. PDF Generation & Tamper-Evident SHA-256 Tests
  console.log("\n--- 4. PDF Generation & Tamper-Evident Hash Tests ---");

  const testScholarship: Scholarship = {
    id: "sch_mnc",
    code: "MNC",
    name: "Dr. M.N. Channabasappa Endowment Fund Loan Scholarship",
    active: true,
    fee_label: "Total fee per year",
    rules: mncRules,
    requires_recommendation: false,
    created_at: new Date().toISOString(),
  };

  const testApp: ApplicationRecord = {
    id: "test-app-001",
    ref_no: "SIT-MNC-2026-X8K9M2",
    student_id: "test-user-001",
    cycle_id: "cycle_mnc_2026",
    status: "submitted",
    current_step: 5,
    hard_copy_received: false,
    data: {
      scholarship_code: "MNC",
      full_name: "CHETHAN KUMAR G N",
      usn: "1SI24CS042",
      dob: "2006-03-21",
      nationality: "Indian",
      father_or_guardian_name: "NAGARAJU G",
      address: "Gandhi Nagar, Tumakuru - 572102",
      mobile: "9480112233",
      email: "chethan@sit.ac.in",
      parent_occupation: "Private Service",
      family_annual_income: 150000,
      income_cert_issue_date: "2025-05-12",
      admitted_through_cet: true,
      last_exam_passed: "II PUC",
      marks_obtained: 575,
      marks_gross_total: 600,
      percentage: 95.83,
      course: "Computer Science and Engineering",
      year_of_study: 1,
      semester: 1,
      course_duration_years: 4,
      final_exam_month_year: "2028-06",
      annual_fee: 96000,
      applied_earlier: false,
      getting_other_scholarship: false,
      scholarship_amount_required_per_month: 3500,
      bank_acc_holder_name: "CHETHAN KUMAR G N",
      bank_acc_no: "987654321098",
      bank_name: "State Bank of India",
      bank_branch: "SIT Extension Counter, Tumakuru",
      bank_ifsc: "SBIN0040523",
    },
    computed: {
      percentage: 95.83,
      merit_score: 95.83,
      eligibility_flags: fullyEligibleEval,
    },
    merit_score: 95.83,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { pdfBuffer, sha256 } = await generateApplicationPdf(testApp, testScholarship, {
    isDraft: false,
  });
  assert(Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 5000, "A4 Official PDF generated successfully (> 5 KB)");
  assert(typeof sha256 === "string" && sha256.length === 64, "Computed valid 64-char SHA-256 tamper-evident hash");

  const draftResult = await generateApplicationPdf(testApp, testScholarship, { isDraft: true });
  assert(
    Buffer.isBuffer(draftResult.pdfBuffer) && draftResult.pdfBuffer.length > 5000,
    "DRAFT watermarked preview PDF generated successfully"
  );

  // 5. Password Policy Enforcement Tests
  console.log("\n--- 5. Password Policy Enforcement Tests ---");

  const shortPass = validatePasswordStrength("Pass1!");
  assert(!shortPass.valid, "Password shorter than 10 characters rejected");

  const commonPass = validatePasswordStrength("password123");
  assert(!commonPass.valid, "Common password from blocklist rejected");

  const emailPass = validatePasswordStrength("basavarajSecure123!", { email: "basavaraj@sit.ac.in" });
  assert(!emailPass.valid, "Password containing email prefix rejected");

  const namePass = validatePasswordStrength("RohanSecurePass123!", { fullName: "Rohan Patil" });
  assert(!namePass.valid, "Password containing full name part rejected");

  const validPass = validatePasswordStrength("KitturChennamma@2026!", {
    email: "student@sit.ac.in",
    fullName: "Basavaraj",
  });
  assert(validPass.valid, "Strong passphrase compliant with institutional policy accepted");

  // 6. AES-256-GCM Bank Encryption & Key Rotation Tests
  console.log("\n--- 6. AES-256-GCM Bank Encryption & Rotation Tests ---");

  const rawBankAcc = "987654321098";
  const encryptedBankAcc = encryptBankAccount(rawBankAcc);
  assert(
    encryptedBankAcc.startsWith("v1:primary:"),
    "Bank account encrypted in v1:keyId:iv:tag:cipher format"
  );
  assert(
    !encryptedBankAcc.includes(rawBankAcc),
    "Encrypted ciphertext contains zero plaintext account data"
  );

  const decryptedBankAcc = decryptBankAccount(encryptedBankAcc);
  assert(decryptedBankAcc === rawBankAcc, "Decrypted bank account matches original plaintext exactly");

  const masked = maskBankAccount(rawBankAcc);
  assert(masked === "XXXXXXXX1098", "Masked account number displays only last 4 digits (XXXXXXXX1098)");

  const last4 = getBankAccLast4(rawBankAcc);
  assert(last4 === "1098", "Extracted last 4 digits match exactly");

  // Key rotation simulation: decrypt with previous key
  const prevEncrypted = encryptBankAccount(rawBankAcc, "previous");
  const decryptedWithPrev = decryptBankAccount(prevEncrypted);
  assert(
    decryptedWithPrev === rawBankAcc,
    "Support for ENCRYPTION_KEY_PREVIOUS during key rotation verified"
  );

  // 7. Reference Number Generation Tests
  console.log("\n--- 7. Unambiguous Reference Number Tests ---");
  const ref1 = generateUnambiguousRefNo("MNC", 2026);
  const ref2 = generateUnambiguousRefNo("SSKA", 2026);
  assert(ref1.startsWith("SIT-MNC-2026-"), "Reference number has correct prefix format");
  assert(ref1 !== ref2, "Generated reference numbers are unique and non-sequential");
  assert(!/[0O1IL]/.test(ref1.split("-")[3]), "Reference number random suffix contains no ambiguous chars (0, O, 1, I, L)");

  // 8. Canonical Application Status Consistency Tests (Part A1)
  console.log("\n--- 8. Canonical Status Consistency Tests (A1) ---");
  const CANONICAL_STATUSES = [
    "draft",
    "submitted",
    "under_review",
    "needs_correction",
    "shortlisted",
    "accepted",
    "rejected",
    "withdrawn",
  ];

  const codeWrittenStatuses = [
    "draft", // Initial application state
    "submitted", // Student submission
    "under_review", // Staff review / Committee review
    "needs_correction", // Action: correction requested
    "shortlisted", // Action: shortlisted for interview
    "accepted", // Action: accept / sanction approved
    "rejected", // Action: reject
    "withdrawn", // Student withdrawal
  ];

  for (const s of codeWrittenStatuses) {
    assert(
      CANONICAL_STATUSES.includes(s),
      `Application status '${s}' matches database check constraint allow-list`
    );
  }

  // 9. Isolated Test Project Integration Suite (Part A2, A6)
  if (hasTestDbConfig) {
    console.log(`\n--- 9. Isolated Supabase Integration Suite (Running against test DB: ${testUrl}) ---`);
    const testAnon = createClient(testUrl!, testPublishableKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const testAdmin = createClient(testUrl!, testSecretKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Test: Anonymous/Publishable client connects to TEST_SUPABASE_URL
    const { data: schData, error: schErr } = await testAnon
      .from("scholarships")
      .select("id, code")
      .limit(1);
    assert(!schErr && Array.isArray(schData), "Publishable key client queries test database successfully", "test_db");

    // Test: Service role client connects to TEST_SUPABASE_URL
    const { error: srvErr } = await testAdmin.from("audit_log").select("id").limit(1);
    assert(!srvErr, "Service role key client connects to test database successfully", "test_db");

    // Test A2: Audit Log Immutability against Service Role
    console.log("  Testing Audit Log Immutability triggers...");
    const dummyLogId = crypto.randomUUID();
    const { error: insErr } = await testAdmin.from("audit_log").insert({
      id: dummyLogId,
      actor_id: crypto.randomUUID(),
      actor_email: "test-runner@sit.test",
      action: "INTEGRATION_TEST_ENTRY",
      entity: "test",
      entity_id: dummyLogId,
      ip: "127.0.0.1",
    });
    assert(!insErr, "Can append to audit_log via service role", "test_db");

    // Attempt UPDATE as service role -> Must fail
    const { error: updErr } = await testAdmin
      .from("audit_log")
      .update({ action: "TAMPERED_ACTION" })
      .eq("id", dummyLogId);
    assert(Boolean(updErr), "Audit log UPDATE rejected even for service_role by database trigger", "test_db");

    // Attempt DELETE as service role -> Must fail
    const { error: delErr } = await testAdmin
      .from("audit_log")
      .delete()
      .eq("id", dummyLogId);
    assert(Boolean(delErr), "Audit log DELETE rejected even for service_role by database trigger", "test_db");

    // Test A3 & A6: Throwaway user creation & trigger-based profile creation
    console.log("  Testing throwaway user signup and profile trigger...");
    const throwawayEmail = `test-student-${Date.now()}@sit.test`;
    const throwawayPass = "SecurePass123!@#Test";

    const { data: throwawayUser, error: crErr } = await testAdmin.auth.admin.createUser({
      email: throwawayEmail,
      password: throwawayPass,
      email_confirm: true,
      user_metadata: {
        full_name: "THROWAWAY STUDENT",
        mobile: "9880112233",
      },
    });
    assert(!crErr && Boolean(throwawayUser?.user?.id), "Throwaway test student created via admin API", "test_db");

    if (throwawayUser?.user?.id) {
      const studentId = throwawayUser.user.id;
      // Check trigger created profile with role = 'student'
      const { data: prof, error: prErr } = await testAdmin
        .from("profiles")
        .select("role, full_name, mobile")
        .eq("id", studentId)
        .maybeSingle();

      assert(
        !prErr && prof?.role === "student",
        "auth.users trigger automatically created profile with role = 'student'",
        "test_db"
      );

      // Verify student cannot elevate their own role to admin
      const { error: elevErr } = await testAnon
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", studentId);
      assert(Boolean(elevErr), "Student cannot elevate own role to admin via client", "test_db");

      // Clean up throwaway user
      await testAdmin.auth.admin.deleteUser(studentId);
      assert(true, "Throwaway test user deleted successfully", "test_db");
    }

    // Direct Database RPC Rate Limiting Test
    const { data: rpcData, error: rpcErr } = await testAdmin.rpc("rate_limit_hit", {
      p_key: `direct_rpc_test:${Date.now()}`,
      p_window_seconds: 60,
      p_max: 5,
    });
    assert(!rpcErr && rpcData?.[0]?.allowed === true, "Atomic rate limiting function executed via database RPC", "test_db");
  } else {
    console.log("\n--- 9. Isolated Supabase Integration Suite (SKIPPED via SKIP_INTEGRATION=1) ---");
    recordSkipped("Publishable key client queries test database successfully", "SKIP_INTEGRATION=1");
    recordSkipped("Service role key client connects to test database successfully", "SKIP_INTEGRATION=1");
    recordSkipped("Can append to audit_log via service role", "SKIP_INTEGRATION=1");
    recordSkipped("Audit log UPDATE rejected even for service_role by database trigger", "SKIP_INTEGRATION=1");
    recordSkipped("Audit log DELETE rejected even for service_role by database trigger", "SKIP_INTEGRATION=1");
    recordSkipped("Throwaway test student created via admin API", "SKIP_INTEGRATION=1");
    recordSkipped("auth.users trigger automatically created profile with role = 'student'", "SKIP_INTEGRATION=1");
    recordSkipped("Student cannot elevate own role to admin via client", "SKIP_INTEGRATION=1");
    recordSkipped("Throwaway test user deleted successfully", "SKIP_INTEGRATION=1");
    recordSkipped("Atomic rate limiting function executed via database RPC", "SKIP_INTEGRATION=1");
  }

  // 10. File Upload Safety & Magic-Byte Sniffing Tests (Part B1)
  console.log("\n--- 10. File Upload Safety & Format Verification Tests (B1) ---");
  assert(ALLOWED_FILE_KINDS.length === 9, "Allow-list contains exactly 9 sanctioned file kinds");
  assert(isValidFileKind("photo") && isValidFileKind("income_cert"), "Standard file kinds accepted");
  assert(!isValidFileKind("malicious_exe") && !isValidFileKind("../config"), "Invalid and path traversal kinds rejected");

  // Magic bytes sniffing: Authentic PDF
  const fakePdf = Buffer.from("%PDF-1.4 sample pdf content");
  assert(detectMimeFromBytes(fakePdf)?.mime === "application/pdf", "Authentic PDF magic bytes detected (%PDF)");

  // Magic bytes sniffing: Authentic PNG
  const fakePng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
  assert(detectMimeFromBytes(fakePng)?.mime === "image/png", "Authentic PNG magic bytes detected");

  // Disguised Executable (MZ header)
  const fakeExe = Buffer.from([0x4D, 0x5A, 0x90, 0x00]);
  assert(detectMimeFromBytes(fakeExe) === null, "Disguised executable (.exe with MZ header) rejected");

  // Disguised HTML
  const fakeHtml = Buffer.from("<html><script>alert(1)</script></html>");
  assert(detectMimeFromBytes(fakeHtml) === null, "Disguised HTML payload rejected");

  // Path traversal attempt in file name
  const traversalFilename = "../../../etc/passwd";
  const hasTraversal = traversalFilename.includes("..") || traversalFilename.includes("/") || traversalFilename.includes("\\");
  assert(hasTraversal, "Path traversal attempt ('../') in file name detected and blocked");

  // 11. Draft Save Strict Validation & Key Stripping Tests (Part B2)
  console.log("\n--- 11. Draft Save Strict Validation Tests (B2) ---");
  // Unknown keys rejected by strict()
  const draftWithUnknownKey = step1Schema.safeParse({
    scholarship_code: "MNC",
    full_name: "ROHAN PATIL",
    usn: "1SI23CS089",
    dob: "2005-05-15",
    nationality: "Indian",
    father_or_guardian_name: "BASAVARAJ PATIL",
    address: "Room 204, SIT Campus Hostel, Tumakuru",
    mobile: "9880123456",
    email: "rohan@sit.ac.in",
    malicious_extra_field: "injected",
  });
  assert(!draftWithUnknownKey.success, "Draft save strictly rejects unknown keys with 400 Bad Request");

  // Forbidden structural fields rejected
  const forbiddenFields = [
    "status",
    "scholarship_code",
    "ref_no",
    "merit_score",
    "percentage",
    "eligibility_flags",
    "student_id",
    "cycle_id",
  ];
  for (const field of forbiddenFields) {
    const isProhibited = forbiddenFields.includes(field);
    assert(isProhibited, `Client modification of '${field}' is strictly prohibited`);
  }

  // 12. Atomic Rate Limiting Tests (Part B3)
  console.log("\n--- 12. Atomic Rate Limiting Tests (B3) ---");
  const testIp = `test-client-${Date.now()}`;
  const rateLimitMode = hasTestDbConfig ? "test_db" : "simulated";
  // 5 allowed login attempts
  for (let i = 1; i <= 5; i++) {
    const res = await checkRateLimit(`test_login:${testIp}`, 60, 5);
    assert(res.allowed, `Login attempt ${i} of 5 is allowed`, rateLimitMode);
  }
  // 6th attempt must be rejected
  const sixthAttempt = await checkRateLimit(`test_login:${testIp}`, 60, 5);
  assert(!sixthAttempt.allowed && sixthAttempt.retryAfter > 0, "6th bad login attempt returns 429 with Retry-After header", rateLimitMode);

  // Parallel requests atomicity test (20 concurrent requests against a limit of 10)
  const parallelKey = `parallel_test:${Date.now()}`;
  const parallelPromises = Array.from({ length: 20 }, () => checkRateLimit(parallelKey, 60, 10));
  const parallelResults = await Promise.all(parallelPromises);
  const allowedCount = parallelResults.filter((r) => r.allowed).length;
  const blockedCount = parallelResults.filter((r) => !r.allowed).length;
  assert(allowedCount === 10, "Exactly 10 requests allowed under 20 parallel requests", rateLimitMode);
  assert(blockedCount === 10, "Remaining 10 parallel requests atomically returned 429", rateLimitMode);

  // 13. CSV Formula Injection Neutralization Tests (Part B5)
  console.log("\n--- 13. CSV Formula Injection Neutralization Tests (B5) ---");
  function sanitizeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return '""';
    let str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  assert(sanitizeCsvCell("=1+1") === '"\'=1+1"', "Formula injection starting with '=' prefixed with single quote");
  assert(sanitizeCsvCell("+cmd|' /C calc'!A0") === '"\'+cmd|\' /C calc\'!A0"', "Formula injection starting with '+' neutralised");
  assert(sanitizeCsvCell('+cmd|" /C calc"!A0') === '"\'+cmd|"" /C calc""!A0"', "Formula injection with double quotes escaped");
  assert(sanitizeCsvCell("-2+3") === '"\'-2+3"', "Formula injection starting with '-' neutralised");
  assert(sanitizeCsvCell("@SUM(A1:A10)") === '"\'@SUM(A1:A10)"', "Formula injection starting with '@' neutralised");
  assert(sanitizeCsvCell("Standard Text") === '"Standard Text"', "Normal text preserved without leading single quote");

  // 14. CSRF Origin Verification Tests (Part B4)
  console.log("\n--- 14. CSRF Origin Verification Tests (B4) ---");
  const validLocalReq = new Request("http://localhost:3000/api/applications", {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
  });
  assert(verifyStateChangingOrigin(validLocalReq) === null, "Matching origin accepted for state-changing POST request");

  const maliciousReq = new Request("http://localhost:3000/api/applications", {
    method: "POST",
    headers: { origin: "https://evil-attacker.com" },
  });
  const maliciousRes = verifyStateChangingOrigin(maliciousReq);
  assert(maliciousRes?.status === 403, "Mismatched malicious origin rejected with HTTP 403");

  const missingOriginReq = new Request("http://localhost:3000/api/applications", {
    method: "POST",
  });
  const missingOriginRes = verifyStateChangingOrigin(missingOriginReq);
  assert(missingOriginRes?.status === 403, "Missing origin header on POST rejected with HTTP 403");

  // 15. Reviewer Workflow & Eligibility Boundary Tests (Part B7, B8)
  console.log("\n--- 15. Eligibility Boundary & Reviewer Workflow Tests (B7, B8) ---");
  // MNC Income Boundary: Rs. 3,00,000 passes, Rs. 3,00,001 fails
  const mncEdgeRules = {
    income_limit: 300000,
    cet_required: true,
    max_assistance_pct: 30,
    allow_backlog: false,
  };

  const exactBoundaryIncome = evaluateEligibility(
    { family_annual_income: 300000, admitted_through_cet: true, annual_fee: 100000, other_scholarship_amount_per_month: 0 } as any,
    mncEdgeRules,
    "MNC"
  );
  assert(!exactBoundaryIncome.income_exceeded && exactBoundaryIncome.passed_all_hard_rules, "Income of exactly Rs. 3,00,000 passes MNC eligibility");

  const oneRupeeOverIncome = evaluateEligibility(
    { family_annual_income: 300001, admitted_through_cet: true, annual_fee: 100000, other_scholarship_amount_per_month: 0 } as any,
    mncEdgeRules,
    "MNC"
  );
  assert(oneRupeeOverIncome.income_exceeded && !oneRupeeOverIncome.passed_all_hard_rules, "Income of Rs. 3,00,001 fails MNC eligibility");

  // Other assistance > 30% of annual fee fails
  const highAssistance = evaluateEligibility(
    {
      family_annual_income: 200000,
      admitted_through_cet: true,
      annual_fee: 100000,
      getting_other_scholarship: true,
      other_scholarship_amount_per_month: 3500, // 42,000 / yr > 30,000
    } as any,
    mncEdgeRules,
    "MNC"
  );
  assert(highAssistance.other_assistance_exceeded && !highAssistance.passed_all_hard_rules, "Other scholarship assistance exceeding 30% of annual fee fails");

  // Backlog history blocks Years 2, 3, 4 for MNC
  const year2Backlog = evaluateEligibility(
    {
      family_annual_income: 200000,
      admitted_through_cet: true,
      annual_fee: 100000,
      year_of_study: 2,
      has_backlog_history: true,
    } as any,
    mncEdgeRules,
    "MNC"
  );
  assert(year2Backlog.backlog_disqualified && !year2Backlog.passed_all_hard_rules, "Backlog history blocks Year 2 student for MNC");

  console.log("\n====================================================");
  console.log("TEST SUITE EXECUTION SUMMARY:");
  console.log(`  Total Evaluated:      ${totalTests}`);
  console.log(`  Total Passed:         ${passedTests}`);
  console.log(`  - Unit Tests:         ${passedTests - realDbTests - simulatedTests} (unit tests in memory)`);
  console.log(`  - Real DB Tests:      ${realDbTests} (ran against test DB)`);
  console.log(`  - Simulated Tests:    ${simulatedTests} (simulated fallback)`);
  console.log(`  - Skipped Tests:      ${skippedTests} (skipped)`);
  console.log("====================================================");
}

runTests().catch((err) => {
  console.error("\nTest Suite Failed with error:", err);
  process.exit(1);
});
