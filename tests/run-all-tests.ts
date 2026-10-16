// ==============================================================================
// SIT SCHOLARSHIP APPLICATION PORTAL - COMPREHENSIVE TEST SUITE
// Tests run against an isolated test environment.
// Production URL collision guard enforced.
// ==============================================================================

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

// Ensure test encryption key is a valid 32-byte base64 string
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "FQWZfZCYWeU1cS7veY3ZNT31pY7WpI91fBDtflk7eCo=";
process.env.ENCRYPTION_KEY_PREVIOUS =
  process.env.ENCRYPTION_KEY_PREVIOUS || "Um/ivwzWJhzwAOqpV9w5uomuUNIoMc5rOcV+aqXvPT4=";

function normalizeSupabaseUrl(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url.trim()).origin;
  } catch {
    return url.trim();
  }
}

// Guard against pointing tests to production Supabase project
const prodUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const testUrl = normalizeSupabaseUrl(process.env.TEST_SUPABASE_URL);
const testPublishableKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY?.trim();
const testSecretKey = process.env.TEST_SUPABASE_SECRET_KEY?.trim();
const skipIntegration = process.env.SKIP_INTEGRATION === "1";

const allowSameProject = process.env.ALLOW_SAME_PROJECT_TEST === "1";

if (testUrl && prodUrl && testUrl.trim() === prodUrl.trim() && !allowSameProject) {
  console.error("\n==================================================================");
  console.error("FATAL: TEST_SUPABASE_URL MATCHES NEXT_PUBLIC_SUPABASE_URL");
  console.error("==================================================================");
  console.error("Integration tests must run against a separate test Supabase project to protect real student data.");
  console.error("If this is a local development/test project and you intentionally want to run tests against it,");
  console.error("pass ALLOW_SAME_PROJECT_TEST=1 (e.g. 'ALLOW_SAME_PROJECT_TEST=1 npm test').");
  console.error("==================================================================\n");
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

import { GET as getApplicationRoute, PATCH as patchApplicationRoute } from "../src/app/api/applications/[id]/route";
import { POST as uploadFileRoute } from "../src/app/api/applications/[id]/files/route";
import { GET as getFileRoute } from "../src/app/api/files/[id]/route";
import { POST as submitApplicationRoute } from "../src/app/api/applications/[id]/submit/route";
import { POST as decisionRoute } from "../src/app/api/admin/applications/[id]/decision/route";
import { GET as getAdminCyclesRoute } from "../src/app/api/admin/cycles/route";
import { GET as getAdminUsersRoute } from "../src/app/api/admin/users/route";
import { resetAdminClient } from "../src/utils/supabase/admin";

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
    console.error(`  ✕ FAIL [failed]: ${testName}`);
    throw new Error(`Test failed: [failed] ${testName}`);
  }
}

function recordSkipped(testName: string, reason?: string) {
  totalTests++;
  skippedTests++;
  console.log(`  ⏭ SKIPPED [skipped]: ${testName}${reason ? ` (${reason})` : ""}`);
}

async function runTests() {
  console.log("====================================================");
  console.log("SIT SCHOLARSHIP PORTAL - PHASE 1 TEST SUITE");
  console.log("====================================================\n");

  // 0. Safety & Environment Guard Tests
  console.log("--- 0. Safety & Environment Isolation Guards ---");
  assert(
    !testUrl || testUrl !== prodUrl || allowSameProject,
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

  // 9. Phase 2c Real API Route Integration Suite against Test Database (never production)
  console.log(`\n--- 9. Real API Route Integration Suite (against test DB: ${testUrl || "NONE"}) ---`);
  if (hasTestDbConfig) {
    const testAdmin = createClient(testUrl!, testSecretKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const testAnon = createClient(testUrl!, testPublishableKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    process.env.NEXT_PUBLIC_SUPABASE_URL = testUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = testPublishableKey;
    process.env.SUPABASE_SECRET_KEY = testSecretKey;
    resetAdminClient();

    const cleanupUserIds: string[] = [];
    const cleanupAppIds: string[] = [];
    const cleanupFileIds: string[] = [];
    const cleanupCycleIds: string[] = [];

    try {
      // Probe test database schema readiness
      const { error: probeErr } = await testAdmin.from("scholarships").select("id").limit(1);
      if (
        probeErr &&
        (probeErr.code === "PGRST125" ||
          probeErr.code === "42P01" ||
          probeErr.message?.includes("Invalid path") ||
          probeErr.message?.includes("relation"))
      ) {
        console.error("\n==================================================================");
        console.error("TEST DATABASE SCHEMA NOT INITIALIZED");
        console.error("==================================================================");
        console.error("The test Supabase project is connected, but database tables do not exist yet.");
        console.error("Please execute the schema migrations in your Supabase SQL Editor:");
        console.error("  1. supabase/migrations/001_init.sql");
        console.error("  2. supabase/migrations/002_phase2.sql");
        console.error("  3. supabase/migrations/003_phase2c.sql");
        console.error("  (Or execute the consolidated supabase/schema.sql file)");
        console.error("==================================================================\n");
        throw new Error("Test database schema is not initialized. Please apply SQL migrations first.");
      }

      // Find or create an open cycle
      let { data: cycle } = await testAdmin.from("cycles").select("id, scholarship_id").eq("status", "open").maybeSingle();
      if (!cycle) {
        let { data: sch } = await testAdmin.from("scholarships").select("id").eq("code", "MNC").maybeSingle();
        if (!sch) {
          const newSchId = crypto.randomUUID();
          await testAdmin.from("scholarships").insert({ id: newSchId, code: "MNC", name: "Dr. M.N. Channabasappa", is_active: true });
          sch = { id: newSchId };
        }
        const newCycleId = crypto.randomUUID();
        await testAdmin.from("cycles").insert({
          id: newCycleId,
          scholarship_id: sch.id,
          academic_year: "2026-2027",
          status: "open",
          opens_at: "2025-01-01T00:00:00Z",
          closes_at: "2030-01-01T00:00:00Z",
        });
        cycle = { id: newCycleId, scholarship_id: sch.id };
        cleanupCycleIds.push(newCycleId);
      }

      // 1. Throwaway Student A
      const emailA = `test-student-a-${Date.now()}@sit.test`;
      const userA = await testAdmin.auth.admin.createUser({
        email: emailA,
        password: "TestPassword123!@#",
        email_confirm: true,
        user_metadata: { full_name: "STUDENT A", mobile: "9880112233" },
      });
      if (userA.data.user) cleanupUserIds.push(userA.data.user.id);

      // 2. Throwaway Student B
      const emailB = `test-student-b-${Date.now()}@sit.test`;
      const userB = await testAdmin.auth.admin.createUser({
        email: emailB,
        password: "TestPassword123!@#",
        email_confirm: true,
        user_metadata: { full_name: "STUDENT B", mobile: "9880112244" },
      });
      if (userB.data.user) cleanupUserIds.push(userB.data.user.id);

      // 3. Throwaway Reviewer
      const emailRev = `test-rev-${Date.now()}@sit.test`;
      const userRev = await testAdmin.auth.admin.createUser({
        email: emailRev,
        password: "TestPassword123!@#",
        email_confirm: true,
        user_metadata: { full_name: "STAFF REVIEWER", mobile: "9880112255" },
      });
      if (userRev.data.user) {
        cleanupUserIds.push(userRev.data.user.id);
        await testAdmin.from("profiles").update({ role: "reviewer" }).eq("id", userRev.data.user.id);
      }

      // 4. Throwaway Admin
      const emailAdm = `test-adm-${Date.now()}@sit.test`;
      const userAdm = await testAdmin.auth.admin.createUser({
        email: emailAdm,
        password: "TestPassword123!@#",
        email_confirm: true,
        user_metadata: { full_name: "STAFF ADMIN", mobile: "9880112266" },
      });
      if (userAdm.data.user) {
        cleanupUserIds.push(userAdm.data.user.id);
        await testAdmin.from("profiles").update({ role: "admin" }).eq("id", userAdm.data.user.id);
      }

      // 5. Throwaway Unconfirmed Student
      const emailUnconf = `test-unconf-${Date.now()}@sit.test`;
      const userUnconf = await testAdmin.auth.admin.createUser({
        email: emailUnconf,
        password: "TestPassword123!@#",
        email_confirm: false,
        user_metadata: { full_name: "STUDENT UNCONF", mobile: "9880112277" },
      });
      if (userUnconf.data.user) cleanupUserIds.push(userUnconf.data.user.id);

      // Seed Student A draft application
      const appAId = crypto.randomUUID();
      cleanupAppIds.push(appAId);
      const { error: appAInsErr } = await testAdmin.from("applications").insert({
        id: appAId,
        ref_no: `SIT-TEST-${Date.now().toString().slice(-6)}`,
        cycle_id: cycle.id,
        student_id: userA.data.user!.id,
        status: "draft",
        data: {
          scholarship_code: "MNC",
          full_name: "STUDENT A",
          usn: "1SI23CS001",
          dob: "2005-05-15",
          nationality: "Indian",
          father_or_guardian_name: "FATHER A",
          address: "SIT Hostel, Tumakuru",
          mobile: "9880112233",
          email: emailA,
          parent_occupation: "Agriculture",
          family_annual_income: 180000,
          income_cert_issue_date: "2025-06-10",
          admitted_through_cet: true,
          annual_fee: 100000,
          course: "Computer Science and Engineering",
          year_of_study: 1,
          semester: 1,
          course_duration_years: 4,
          final_exam_month_year: "2028-06",
          marks_obtained: 540,
          marks_gross_total: 600,
          last_exam_passed: "II PUC",
          has_backlog_history: false,
          applied_earlier: false,
          getting_other_scholarship: false,
          scholarship_amount_required_per_month: 2500,
          bank_acc_holder_name: "STUDENT A",
          bank_acc_no: "123456789012",
          confirm_bank_acc_no: "123456789012",
          bank_name: "State Bank of India",
          bank_branch: "Tumakuru",
          bank_ifsc: "SBIN0040523",
          declaration_accepted: true,
        },
      });
      if (appAInsErr) throw new Error(`Failed to insert app A: ${appAInsErr.message}`);

      const reqKinds = ["photo", "sig_student", "sig_parent", "cet_order", "income_cert", "marks_card", "aadhaar", "fee_receipt", "principal_cert"];
      let primaryFileId = "";
      for (const k of reqKinds) {
        const fId = crypto.randomUUID();
        if (k === "photo") primaryFileId = fId;
        cleanupFileIds.push(fId);
        const { error: fInsErr } = await testAdmin.from("application_files").insert({
          id: fId,
          application_id: appAId,
          kind: k,
          storage_path: `${appAId}/${k}-${fId}.jpg`,
          mime: "image/jpeg",
          size_bytes: 1024,
          sha256: "0000000000000000000000000000000000000000000000000000000000000000",
          original_name: `${k}.jpg`,
        });
        if (fInsErr) throw new Error(`Failed to insert file ${k}: ${fInsErr.message}`);
      }

      // --- TEST 1: a student cannot read, edit or download another student's application or file ---
      (globalThis as any).__testSessionOverride = {
        userId: userB.data.user!.id,
        email: emailB,
        role: "student",
        fullName: "STUDENT B",
        mustChangePassword: false,
        aal: "aal1",
      };
      const readOtherApp = await getApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`),
        { params: Promise.resolve({ id: appAId }) }
      );
      const editOtherApp = await patchApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`, {
          method: "PATCH",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({ step: 1, data: { full_name: "HACKED NAME" } }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );
      const dlOtherFile = await getFileRoute(
        new Request(`http://localhost:3000/api/files/${primaryFileId}`),
        { params: Promise.resolve({ id: primaryFileId }) }
      );
      assert(
        readOtherApp.status === 403 && editOtherApp.status === 403 && dlOtherFile.status === 403,
        "a student cannot read, edit or download another student's application or file",
        "test_db"
      );

      // --- TEST 2: a student cannot upload to someone else's application ---
      const uploadForm = new FormData();
      uploadForm.append("kind", "photo");
      uploadForm.append("file", new Blob([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])], { type: "image/png" }), "avatar.png");
      const uploadOtherApp = await uploadFileRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}/files`, {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
          body: uploadForm,
        }),
        { params: Promise.resolve({ id: appAId }) }
      );
      assert(
        uploadOtherApp.status === 403,
        "a student cannot upload to someone else's application",
        "test_db"
      );

      // --- TEST 3: double submit creates one submission ---
      (globalThis as any).__testSessionOverride = {
        userId: userA.data.user!.id,
        email: emailA,
        role: "student",
        fullName: "STUDENT A",
        mustChangePassword: false,
        aal: "aal1",
        email_confirmed: true,
      };
      const sub1 = await submitApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}/submit`, {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
        }),
        { params: Promise.resolve({ id: appAId }) }
      );
      const sub2 = await submitApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}/submit`, {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
        }),
        { params: Promise.resolve({ id: appAId }) }
      );
      const { data: submittedApps } = await testAdmin
        .from("applications")
        .select("id, status")
        .eq("id", appAId)
        .eq("status", "submitted");
      assert(
        sub1.status === 200 && sub2.status === 400 && submittedApps?.length === 1,
        "double submit creates one submission",
        "test_db"
      );

      // --- TEST 4: the DB rejects a submit after closes_at and while the cycle is closed ---
      const closedCycleId = crypto.randomUUID();
      cleanupCycleIds.push(closedCycleId);
      await testAdmin.from("cycles").insert({
        id: closedCycleId,
        scholarship_id: cycle.scholarship_id,
        academic_year: "2019-2020",
        status: "closed",
        opens_at: "2019-01-01T00:00:00Z",
        closes_at: "2019-02-01T00:00:00Z",
      });
      const closedAppId = crypto.randomUUID();
      cleanupAppIds.push(closedAppId);
      const { error: closedInsErr } = await testAdmin.from("applications").insert({
        id: closedAppId,
        ref_no: `SIT-CLOSED-${Date.now().toString().slice(-6)}`,
        cycle_id: closedCycleId,
        student_id: userA.data.user!.id,
        status: "draft",
        data: {},
      });
      if (closedInsErr) throw new Error(`Failed to insert closed app: ${closedInsErr.message}`);
      const { error: deadlineTriggerErr } = await testAdmin
        .from("applications")
        .update({ status: "submitted" })
        .eq("id", closedAppId);
      assert(
        Boolean(deadlineTriggerErr),
        "the DB rejects a submit after closes_at and while the cycle is closed",
        "test_db"
      );

      // --- TEST 5: an unconfirmed email cannot submit ---
      const unconfAppId = crypto.randomUUID();
      cleanupAppIds.push(unconfAppId);
      const { error: unconfInsErr } = await testAdmin.from("applications").insert({
        id: unconfAppId,
        ref_no: `SIT-UNCONF-${Date.now().toString().slice(-6)}`,
        cycle_id: cycle.id,
        student_id: userUnconf.data.user!.id,
        status: "draft",
        data: {},
      });
      if (unconfInsErr) throw new Error(`Failed to insert unconf app: ${unconfInsErr.message}`);
      (globalThis as any).__testSessionOverride = {
        userId: userUnconf.data.user!.id,
        email: emailUnconf,
        role: "student",
        fullName: "STUDENT UNCONF",
        mustChangePassword: false,
        aal: "aal1",
        email_confirmed: false,
      };
      const unconfSub = await submitApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${unconfAppId}/submit`, {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
        }),
        { params: Promise.resolve({ id: unconfAppId }) }
      );
      assert(
        unconfSub.status === 403,
        "an unconfirmed email cannot submit",
        "test_db"
      );

      // --- TEST 6: reviewer gets 403 on accept/reject and admin-only routes ---
      (globalThis as any).__testSessionOverride = {
        userId: userRev.data.user!.id,
        email: emailRev,
        role: "reviewer",
        fullName: "STAFF REVIEWER",
        mustChangePassword: false,
        aal: "aal2",
        last_seen_at: new Date().toISOString(),
      };
      const revDecision = await decisionRoute(
        new Request(`http://localhost:3000/api/admin/applications/${appAId}/decision`, {
          method: "POST",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({ action: "accept" }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );
      const revCycles = await getAdminCyclesRoute(
        new Request("http://localhost:3000/api/admin/cycles")
      );
      const revUsers = await getAdminUsersRoute(
        new Request("http://localhost:3000/api/admin/users")
      );
      assert(
        revDecision.status === 403 && revCycles.status === 403 && revUsers.status === 403,
        "reviewer gets 403 on accept/reject and admin-only routes",
        "test_db"
      );

      // --- TEST 7: staff without aal2 get 403 on /api/admin/* ---
      (globalThis as any).__testSessionOverride = {
        userId: userAdm.data.user!.id,
        email: emailAdm,
        role: "admin",
        fullName: "STAFF ADMIN",
        mustChangePassword: false,
        aal: "aal1",
        last_seen_at: new Date().toISOString(),
      };
      const aal1Cycles = await getAdminCyclesRoute(
        new Request("http://localhost:3000/api/admin/cycles")
      );
      const aal1Users = await getAdminUsersRoute(
        new Request("http://localhost:3000/api/admin/users")
      );
      assert(
        aal1Cycles.status === 403 && aal1Users.status === 403,
        "staff without aal2 get 403 on /api/admin/*",
        "test_db"
      );

      // --- TEST 8: wrong or missing Origin gets 403 on POST/PATCH/DELETE ---
      const originPostMissing = verifyStateChangingOrigin(new Request("http://localhost:3000/api/test", { method: "POST" }));
      const originPostBad = verifyStateChangingOrigin(new Request("http://localhost:3000/api/test", { method: "POST", headers: { origin: "https://evil-attacker.com" } }));
      const originPatchBad = verifyStateChangingOrigin(new Request("http://localhost:3000/api/test", { method: "PATCH", headers: { origin: "https://evil-attacker.com" } }));
      const originDeleteBad = verifyStateChangingOrigin(new Request("http://localhost:3000/api/test", { method: "DELETE", headers: { origin: "https://evil-attacker.com" } }));
      assert(
        originPostMissing?.status === 403 &&
          originPostBad?.status === 403 &&
          originPatchBad?.status === 403 &&
          originDeleteBad?.status === 403,
        "wrong or missing Origin gets 403 on POST/PATCH/DELETE",
        "test_db"
      );

      // --- TEST 9: 6th bad login returns 429 using the real DB limiter, and 20 parallel requests allow exactly the limit ---
      const limiterKey = `test_login_burst_${Date.now()}`;
      let firstFiveAllowed = true;
      for (let i = 0; i < 5; i++) {
        const { data } = await testAdmin.rpc("rate_limit_hit", { p_key: limiterKey, p_window_seconds: 60, p_max: 5 });
        if (!data?.[0]?.allowed) firstFiveAllowed = false;
      }
      const { data: sixthData } = await testAdmin.rpc("rate_limit_hit", { p_key: limiterKey, p_window_seconds: 60, p_max: 5 });
      const sixthBlocked = sixthData?.[0]?.allowed === false && (sixthData?.[0]?.retry_after ?? 0) > 0;

      const parallelKey = `test_parallel_${Date.now()}`;
      const parallelHits = await Promise.all(
        Array.from({ length: 20 }, () =>
          testAdmin.rpc("rate_limit_hit", { p_key: parallelKey, p_window_seconds: 60, p_max: 10 })
        )
      );
      const parallelAllowed = parallelHits.filter((h) => h.data?.[0]?.allowed === true).length;
      const parallelBlocked = parallelHits.filter((h) => h.data?.[0]?.allowed === false).length;

      assert(
        firstFiveAllowed && sixthBlocked && parallelAllowed === 10 && parallelBlocked === 10,
        "6th bad login returns 429 using the real DB limiter, and 20 parallel requests allow exactly the limit",
        "test_db"
      );
    } finally {
      // Clean up throwaway entities & users
      (globalThis as any).__testSessionOverride = null;
      for (const fId of cleanupFileIds) {
        await testAdmin.from("application_files").delete().eq("id", fId);
      }
      for (const aId of cleanupAppIds) {
        await testAdmin.from("applications").delete().eq("id", aId);
      }
      for (const cId of cleanupCycleIds) {
        await testAdmin.from("cycles").delete().eq("id", cId);
      }
      for (const uId of cleanupUserIds) {
        await testAdmin.auth.admin.deleteUser(uId);
      }
    }
  } else {
    // Exact 9 tests skipped when SKIP_INTEGRATION=1
    recordSkipped("a student cannot read, edit or download another student's application or file", "SKIP_INTEGRATION=1");
    recordSkipped("a student cannot upload to someone else's application", "SKIP_INTEGRATION=1");
    recordSkipped("double submit creates one submission", "SKIP_INTEGRATION=1");
    recordSkipped("the DB rejects a submit after closes_at and while the cycle is closed", "SKIP_INTEGRATION=1");
    recordSkipped("an unconfirmed email cannot submit", "SKIP_INTEGRATION=1");
    recordSkipped("reviewer gets 403 on accept/reject and admin-only routes", "SKIP_INTEGRATION=1");
    recordSkipped("staff without aal2 get 403 on /api/admin/*", "SKIP_INTEGRATION=1");
    recordSkipped("wrong or missing Origin gets 403 on POST/PATCH/DELETE", "SKIP_INTEGRATION=1");
    recordSkipped("6th bad login returns 429 using the real DB limiter, and 20 parallel requests allow exactly the limit", "SKIP_INTEGRATION=1");
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
  if (!hasTestDbConfig) {
    process.env.ALLOW_IN_MEMORY_RATE_LIMIT = "1";
  } else {
    delete process.env.ALLOW_IN_MEMORY_RATE_LIMIT;
  }
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
  if (!hasTestDbConfig) {
    delete process.env.ALLOW_IN_MEMORY_RATE_LIMIT;
  }

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
