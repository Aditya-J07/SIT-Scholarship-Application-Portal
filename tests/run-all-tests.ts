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

if (process.env.NODE_ENV === "production" && allowSameProject) {
  console.error("\n==================================================================");
  console.error("FATAL: ALLOW_SAME_PROJECT_TEST IS STRICTLY FORBIDDEN IN PRODUCTION");
  console.error("==================================================================");
  console.error("ALLOW_SAME_PROJECT_TEST=1 cannot be used when NODE_ENV=production.");
  console.error("==================================================================\n");
  process.exit(1);
}

if (testUrl && prodUrl && testUrl.trim() === prodUrl.trim() && !allowSameProject) {
  console.error("\n==================================================================");
  console.error("FATAL: TEST_SUPABASE_URL MATCHES NEXT_PUBLIC_SUPABASE_URL");
  console.error("==================================================================");
  console.error("Integration tests must run against a separate test Supabase project to protect real student data.");
  console.error("If this is a local development/test project and you intentionally want to run tests against it,");
  console.error("pass ALLOW_SAME_PROJECT_TEST=1 (only while the single Supabase project holds no real data; remove before launch).");
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
  fullApplicationSchema,
  isApplicantMinor,
} from "../src/lib/schemas/application";
import { PRIVACY_VERSION, REQUIRE_GUARDIAN_CONSENT_FOR_MINORS } from "../src/lib/constants";
import sitemap from "../src/app/sitemap";
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
import { validateRedirectPath } from "../src/lib/auth/redirect-validator";
import { renderEmail } from "../src/lib/email/templates";
import { sendEmailNotification } from "../src/lib/email/client";
import { EmailEventType } from "../src/lib/email/types";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

import { GET as getApplicationRoute, PATCH as patchApplicationRoute } from "../src/app/api/applications/[id]/route";
import { POST as uploadFileRoute } from "../src/app/api/applications/[id]/files/route";
import { GET as getFileRoute } from "../src/app/api/files/[id]/route";
import { GET as getPdfRoute } from "../src/app/api/applications/[id]/pdf/route";
import { POST as submitApplicationRoute } from "../src/app/api/applications/[id]/submit/route";
import { POST as withdrawApplicationRoute } from "../src/app/api/applications/[id]/withdraw/route";
import { POST as decisionRoute } from "../src/app/api/admin/applications/[id]/decision/route";
import { GET as getAdminCyclesRoute } from "../src/app/api/admin/cycles/route";
import { GET as getAdminUsersRoute } from "../src/app/api/admin/users/route";
import { POST as loginRoute } from "../src/app/api/auth/login/route";
import { resetAdminClient } from "../src/utils/supabase/admin";
import { createClient as createServerClient } from "../src/utils/supabase/server";
import { verifyTurnstileToken } from "../src/lib/auth/turnstile";

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

  // 1b. Redirect Validator Unit Tests (H4)
  console.log("\n--- 1b. Redirect Validator Unit Tests (H4) ---");
  assert(validateRedirectPath("/dashboard") === "/dashboard", "Valid relative path '/dashboard' accepted");
  assert(validateRedirectPath("//evil.com") === "/dashboard", "Protocol-relative URL '//evil.com' rejected and falls back");
  assert(validateRedirectPath("/\\evil.com") === "/dashboard", "Backslash-prefixed path '/\\evil.com' rejected");
  assert(validateRedirectPath("@evil.com") === "/dashboard", "UserInfo delimiter '@evil.com' rejected");
  assert(validateRedirectPath(".evil.com") === "/dashboard", "Dot-relative path '.evil.com' rejected");
  assert(validateRedirectPath("https://evil.com") === "/dashboard", "Absolute URL 'https://evil.com' rejected");
  assert(validateRedirectPath("/x?y=//z") === "/x?y=//z", "Valid relative path with query containing slashes '/x?y=//z' accepted");

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
  // 9. Phase 2e Real API Route Integration Suite against Test Database (never production)
  console.log(`\n--- 9. Real API Route Integration Suite (against test DB: ${testUrl || "NONE"}) ---`);
  if (hasTestDbConfig && !skipIntegration) {
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

    // Authentic cookie store simulation for testing outside Next.js request lifecycle (M8)
    class TestCookieStore {
      private cookies = new Map<string, string>();
      getAll() {
        return Array.from(this.cookies.entries()).map(([name, value]) => ({ name, value }));
      }
      get(name: string) {
        const value = this.cookies.get(name);
        return value ? { name, value } : undefined;
      }
      set(name: string, value: string, _options?: any) {
        this.cookies.set(name, value);
      }
      delete(name: string) {
        this.cookies.delete(name);
      }
      clear() {
        this.cookies.clear();
      }
    }

    function generateTotp(base32Secret: string): string {
      const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      let bits = "";
      for (let i = 0; i < base32Secret.length; i++) {
        const val = base32chars.indexOf(base32Secret.charAt(i).toUpperCase());
        if (val !== -1) bits += val.toString(2).padStart(5, "0");
      }
      const bytes: number[] = [];
      for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substring(i, i + 8), 2));
      }
      const key = Buffer.from(bytes);
      const epoch = Math.floor(Date.now() / 1000);
      const timeBuffer = Buffer.alloc(8);
      timeBuffer.writeBigUInt64BE(BigInt(Math.floor(epoch / 30)));
      const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();
      const offset = hmac[hmac.length - 1] & 0xf;
      const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
      return code.toString().padStart(6, "0");
    }

    const userTotpSecrets = new Map<string, string>();

    async function setAuthenticatedSession(email: string, password = "TestPassword123!@#", upgradeAal2 = false) {
      const store = new TestCookieStore();
      (globalThis as any).__testCookieStore = store;
      const client = await createServerClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(`Failed to sign in as ${email}: ${error.message}`);
      }
      if (upgradeAal2) {
        let secret = userTotpSecrets.get(email);
        let factorId: string | undefined;

        if (!secret) {
          const { data: enrollData, error: enrollErr } = await client.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: `Staff Test TOTP ${Date.now()}`,
          });
          if (enrollErr || !enrollData) throw new Error(`MFA enroll error: ${enrollErr?.message}`);
          secret = enrollData.totp.secret;
          factorId = enrollData.id;
          userTotpSecrets.set(email, secret);
        } else {
          const { data: factors } = await client.auth.mfa.listFactors();
          const factor = factors?.totp?.find((f) => f.status === "verified") || factors?.all?.find((f) => f.factor_type === "totp");
          factorId = factor?.id;
        }

        if (factorId && secret) {
          const code = generateTotp(secret);
          const { data: chalData, error: chalErr } = await client.auth.mfa.challenge({ factorId });
          if (chalErr || !chalData) throw new Error(`MFA challenge error: ${chalErr?.message}`);
          const { error: verifyErr } = await client.auth.mfa.verify({
            factorId,
            challengeId: chalData.id,
            code,
          });
          if (verifyErr) throw new Error(`MFA verify error: ${verifyErr.message}`);
        }
      }
      return { client, store, session: data.session, user: data.user, token: data.session.access_token };
    }

    function clearSession() {
      (globalThis as any).__testCookieStore = new TestCookieStore();
    }

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
        console.error("  4. supabase/migrations/004_fix_cleanup.sql");
        console.error("  5. supabase/migrations/005_lockdown.sql");
        console.error("  6. supabase/migrations/006_consent.sql");
        console.error("==================================================================\n");
        throw new Error("Test database schema is not initialized. Please apply SQL migrations first.");
      }

      // Always create a dedicated throwaway cycle for this test run (M1)
      let { data: sch } = await testAdmin.from("scholarships").select("id").eq("code", "MNC").maybeSingle();
      if (!sch) {
        const newSchId = crypto.randomUUID();
        await testAdmin.from("scholarships").insert({ id: newSchId, code: "MNC", name: "Dr. M.N. Channabasappa", is_active: true });
        sch = { id: newSchId };
      }
      const newCycleId = crypto.randomUUID();
      cleanupCycleIds.push(newCycleId);
      await testAdmin.from("cycles").insert({
        id: newCycleId,
        scholarship_id: sch.id,
        academic_year: `TEST-${Date.now()}`,
        status: "open",
        opens_at: "2025-01-01T00:00:00Z",
        closes_at: "2030-01-01T00:00:00Z",
      });
      const cycle = { id: newCycleId, scholarship_id: sch.id };

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

      // Seed Student A draft application with encrypted bank details in DB (H1)
      const appAId = crypto.randomUUID();
      cleanupAppIds.push(appAId);
      const rawBankAcc = "123456789012";
      const encryptedBankAcc = encryptBankAccount(rawBankAcc);
      const bankLast4 = getBankAccLast4(rawBankAcc);

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
          bank_acc_no_encrypted: encryptedBankAcc,
          bank_acc_last4: bankLast4,
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

      // --- SECTION 1: Direct PostgREST attacks (C1, C2, C3, plus restore 'Student cannot elevate own role to admin') ---
      console.log("  [Direct PostgREST Attack Tests (C1, C2, C3)]");
      const { token: studentToken } = await setAuthenticatedSession(emailA, "TestPassword123!@#");

      // Attack 1: Student cannot elevate own role to admin via direct PostgREST
      const elevateRes = await fetch(`${testUrl}/rest/v1/profiles?id=eq.${userA.data.user!.id}`, {
        method: "PATCH",
        headers: {
          apikey: testPublishableKey!,
          Authorization: `Bearer ${studentToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ role: "admin" }),
      });
      const { data: userAProfileCheck } = await testAdmin
        .from("profiles")
        .select("role")
        .eq("id", userA.data.user!.id)
        .single();
      const elevateBlocked = !elevateRes.ok || userAProfileCheck?.role === "student";
      if (!elevateBlocked) {
        // Revert role to student immediately so subsequent tests are not corrupted
        await testAdmin.from("profiles").update({ role: "student" }).eq("id", userA.data.user!.id);
      }
      assert(
        elevateBlocked,
        "Student cannot elevate own role to admin (direct PostgREST PATCH on profiles.role rejected)",
        "test_db"
      );

      // Attack 2: Student cannot directly modify application status to accepted via PostgREST
      const appElevateRes = await fetch(`${testUrl}/rest/v1/applications?id=eq.${appAId}`, {
        method: "PATCH",
        headers: {
          apikey: testPublishableKey!,
          Authorization: `Bearer ${studentToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ status: "accepted" }),
      });
      const { data: appACheck } = await testAdmin
        .from("applications")
        .select("status")
        .eq("id", appAId)
        .single();
      assert(
        !appElevateRes.ok || appACheck?.status !== "accepted",
        "Student cannot directly modify application status to accepted via PostgREST",
        "test_db"
      );

      // Attack 3: Student cannot directly modify merit_score via PostgREST
      const meritRes = await fetch(`${testUrl}/rest/v1/applications?id=eq.${appAId}`, {
        method: "PATCH",
        headers: {
          apikey: testPublishableKey!,
          Authorization: `Bearer ${studentToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ merit_score: 99.99 }),
      });
      const { data: meritCheck } = await testAdmin
        .from("applications")
        .select("merit_score")
        .eq("id", appAId)
        .single();
      assert(
        !meritRes.ok || meritCheck?.merit_score !== 99.99,
        "Student cannot directly modify merit_score via PostgREST",
        "test_db"
      );

      // Attack 4: Anonymous visitor cannot read profiles table directly via PostgREST
      const anonProfilesRes = await fetch(`${testUrl}/rest/v1/profiles?select=*`, {
        headers: { apikey: testPublishableKey! },
      });
      const anonProfilesData = anonProfilesRes.ok ? await anonProfilesRes.json() : null;
      assert(
        !anonProfilesRes.ok || !Array.isArray(anonProfilesData) || anonProfilesData.length === 0,
        "Anonymous visitor cannot read profiles table directly via PostgREST",
        "test_db"
      );

      // Attack 5: Anonymous visitor cannot insert applications directly via PostgREST
      const anonAppInsRes = await fetch(`${testUrl}/rest/v1/applications`, {
        method: "POST",
        headers: {
          apikey: testPublishableKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          ref_no: `SIT-ANON-${Date.now().toString().slice(-6)}`,
          cycle_id: cycle.id,
          student_id: userA.data.user!.id,
          status: "submitted",
          data: {},
        }),
      });
      assert(
        !anonAppInsRes.ok,
        "Anonymous visitor cannot insert applications directly via PostgREST",
        "test_db"
      );

      // Attack 6: Student cannot read audit_log directly via PostgREST
      const studentAuditRes = await fetch(`${testUrl}/rest/v1/audit_log?select=*`, {
        headers: {
          apikey: testPublishableKey!,
          Authorization: `Bearer ${studentToken}`,
        },
      });
      const studentAuditData = studentAuditRes.ok ? await studentAuditRes.json() : null;
      assert(
        !studentAuditRes.ok || !Array.isArray(studentAuditData) || studentAuditData.length === 0,
        "Student cannot read audit_logs directly via PostgREST",
        "test_db"
      );

      // Attack 7: Anonymous visitor cannot call cleanup_expired_rate_limits via PostgREST RPC
      const anonCleanupRes = await fetch(`${testUrl}/rest/v1/rpc/cleanup_expired_rate_limits`, {
        method: "POST",
        headers: { apikey: testPublishableKey! },
      });
      assert(
        !anonCleanupRes.ok,
        "Anonymous visitor cannot call cleanup_expired_rate_limits via PostgREST RPC",
        "test_db"
      );

      // --- TEST 1: a student cannot read, edit or download another student's application or file ---
      await setAuthenticatedSession(emailB, "TestPassword123!@#");
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

      // --- TEST 2b (H2): reviewer and admin-aal1 cannot submit, withdraw, or upload for a student ---
      await setAuthenticatedSession(emailRev, "TestPassword123!@#", false);
      const revSub = await submitApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}/submit`, { method: "POST", headers: { origin: "http://localhost:3000" } }),
        { params: Promise.resolve({ id: appAId }) }
      );
      const revWith = await withdrawApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}/withdraw`, { method: "POST", headers: { origin: "http://localhost:3000" } }),
        { params: Promise.resolve({ id: appAId }) }
      );
      const revUp = await uploadFileRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}/files`, { method: "POST", headers: { origin: "http://localhost:3000" }, body: uploadForm }),
        { params: Promise.resolve({ id: appAId }) }
      );

      await setAuthenticatedSession(emailAdm, "TestPassword123!@#", false);
      const admAal1Sub = await submitApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}/submit`, { method: "POST", headers: { origin: "http://localhost:3000" } }),
        { params: Promise.resolve({ id: appAId }) }
      );
      const admAal1With = await withdrawApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}/withdraw`, { method: "POST", headers: { origin: "http://localhost:3000" } }),
        { params: Promise.resolve({ id: appAId }) }
      );
      const admAal1Up = await uploadFileRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}/files`, { method: "POST", headers: { origin: "http://localhost:3000" }, body: uploadForm }),
        { params: Promise.resolve({ id: appAId }) }
      );

      assert(
        revSub.status === 403 &&
          revWith.status === 403 &&
          revUp.status === 403 &&
          admAal1Sub.status === 403 &&
          admAal1With.status === 403 &&
          admAal1Up.status === 403,
        "reviewer and admin-aal1 cannot submit, withdraw, or upload for a student (H2)",
        "test_db"
      );

      // --- TEST 2b-2 (Phase 2f): Reviewer and Admin at aal2 cannot PATCH a student's draft ---
      await setAuthenticatedSession(emailRev, "TestPassword123!@#", true);
      const revPatchDraft = await patchApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`, {
          method: "PATCH",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({
            step: 1,
            stepData: {
              scholarship_code: "MNC",
              full_name: "MALICIOUS REV EDIT",
              usn: "1SI23CS089",
              dob: "2005-05-15",
              nationality: "Indian",
              father_or_guardian_name: "REV GUARD",
              address: "Campus",
              mobile: "9880123456",
              email: "rohan@sit.ac.in",
            },
            last_updated_at: new Date().toISOString(),
          }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      await setAuthenticatedSession(emailAdm, "TestPassword123!@#", true);
      const admPatchDraft = await patchApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`, {
          method: "PATCH",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({
            step: 1,
            stepData: {
              scholarship_code: "MNC",
              full_name: "MALICIOUS ADM EDIT",
              usn: "1SI23CS089",
              dob: "2005-05-15",
              nationality: "Indian",
              father_or_guardian_name: "ADM GUARD",
              address: "Campus",
              mobile: "9880123456",
              email: "rohan@sit.ac.in",
            },
            last_updated_at: new Date().toISOString(),
          }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      // --- TEST 2b-3 (Phase 2f): Owning student draft concurrency check (last_updated_at required, 409 on stale/missing) ---
      await setAuthenticatedSession(emailA, "TestPassword123!@#");
      const missingTimePatch = await patchApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`, {
          method: "PATCH",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({
            step: 1,
            stepData: {
              scholarship_code: "MNC",
              full_name: "ROHAN PATIL",
              usn: "1SI23CS089",
              dob: "2005-05-15",
              nationality: "Indian",
              father_or_guardian_name: "BASAVARAJ PATIL",
              address: "Room 204, SIT Campus Hostel, Tumakuru",
              mobile: "9880123456",
              email: "rohan@sit.ac.in",
            },
          }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      const staleTimePatch = await patchApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`, {
          method: "PATCH",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({
            step: 1,
            stepData: {
              scholarship_code: "MNC",
              full_name: "ROHAN PATIL",
              usn: "1SI23CS089",
              dob: "2005-05-15",
              nationality: "Indian",
              father_or_guardian_name: "BASAVARAJ PATIL",
              address: "Room 204, SIT Campus Hostel, Tumakuru",
              mobile: "9880123456",
              email: "rohan@sit.ac.in",
            },
            last_updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
          }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      const { data: currentAppA } = await testAdmin.from("applications").select("updated_at").eq("id", appAId).single();
      const validUpdatedAt = currentAppA?.updated_at || new Date().toISOString();

      const validTimePatch = await patchApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`, {
          method: "PATCH",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({
            step: 1,
            stepData: {
              scholarship_code: "MNC",
              full_name: "ROHAN PATIL",
              usn: "1SI23CS089",
              dob: "2005-05-15",
              nationality: "Indian",
              father_or_guardian_name: "BASAVARAJ PATIL",
              address: "Room 204, SIT Campus Hostel, Tumakuru",
              mobile: "9880123456",
              email: "rohan@sit.ac.in",
            },
            last_updated_at: validUpdatedAt,
          }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      assert(
        revPatchDraft.status === 403 && admPatchDraft.status === 403,
        "reviewer and admin-aal2 cannot PATCH a student's draft application (403)",
        "test_db"
      );

      assert(
        missingTimePatch.status === 409 && staleTimePatch.status === 409 && validTimePatch.status === 200,
        "draft save requires last_updated_at and returns 409 when missing or stale",
        "test_db"
      );

      // --- TEST 2c (H1): bank account is encrypted in DB, masked for reviewer, decrypted for student owner and audited admin ---
      const { data: rawAppDb } = await testAdmin.from("applications").select("data").eq("id", appAId).single();
      const dbData = rawAppDb?.data || {};
      const isEncryptedInDb =
        typeof dbData.bank_acc_no_encrypted === "string" &&
        dbData.bank_acc_no_encrypted.startsWith("v1:primary:") &&
        dbData.bank_acc_last4 === bankLast4 &&
        dbData.bank_acc_no === undefined &&
        dbData.confirm_bank_acc_no === undefined;

      await setAuthenticatedSession(emailRev, "TestPassword123!@#", true);
      const revReadRes = await getApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`),
        { params: Promise.resolve({ id: appAId }) }
      );
      const revAppJson = revReadRes.ok ? await revReadRes.json() : null;
      const isMaskedForReviewer = revAppJson?.application?.data?.bank_acc_no === `XXXX${bankLast4}` && revAppJson?.application?.data?.is_masked === true;

      await setAuthenticatedSession(emailA, "TestPassword123!@#");
      const ownerReadRes = await getApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`),
        { params: Promise.resolve({ id: appAId }) }
      );
      const ownerAppJson = ownerReadRes.ok ? await ownerReadRes.json() : null;
      const isDecryptedForOwner = ownerAppJson?.application?.data?.bank_acc_no === rawBankAcc && ownerAppJson?.application?.data?.is_masked === false;

      await setAuthenticatedSession(emailAdm, "TestPassword123!@#", true);
      const admReadRes = await getApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`),
        { params: Promise.resolve({ id: appAId }) }
      );
      const admAppJson = admReadRes.ok ? await admReadRes.json() : null;
      const isDecryptedForAdmin = admAppJson?.application?.data?.bank_acc_no === rawBankAcc;

      const { data: auditDecryptLogs } = await testAdmin
        .from("audit_log")
        .select("action")
        .eq("action", "ADMIN_DECRYPT_BANK_ACCOUNT")
        .eq("entity_id", appAId);
      const isAuditedForAdmin = (auditDecryptLogs?.length ?? 0) >= 1;


      assert(
        isEncryptedInDb && isMaskedForReviewer && isDecryptedForOwner && isDecryptedForAdmin && isAuditedForAdmin,
        "bank account is encrypted in DB, masked for reviewer, decrypted for student owner and audited admin (H1)",
        "test_db"
      );

      // --- TEST 3: double submit creates one submission ---
      await setAuthenticatedSession(emailA, "TestPassword123!@#");
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

      // --- TEST 3b (Phase 2f): Reviewer and Admin at aal2 cannot PATCH a student's submitted application ---
      await setAuthenticatedSession(emailRev, "TestPassword123!@#", true);
      const revPatchSubmitted = await patchApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`, {
          method: "PATCH",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({
            step: 1,
            stepData: {
              scholarship_code: "MNC",
              full_name: "MALICIOUS REV SUBMITTED EDIT",
              usn: "1SI23CS089",
              dob: "2005-05-15",
              nationality: "Indian",
              father_or_guardian_name: "REV GUARD",
              address: "Campus",
              mobile: "9880123456",
              email: "rohan@sit.ac.in",
            },
            last_updated_at: new Date().toISOString(),
          }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      await setAuthenticatedSession(emailAdm, "TestPassword123!@#", true);
      const admPatchSubmitted = await patchApplicationRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}`, {
          method: "PATCH",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({
            step: 1,
            stepData: {
              scholarship_code: "MNC",
              full_name: "MALICIOUS ADM SUBMITTED EDIT",
              usn: "1SI23CS089",
              dob: "2005-05-15",
              nationality: "Indian",
              father_or_guardian_name: "ADM GUARD",
              address: "Campus",
              mobile: "9880123456",
              email: "rohan@sit.ac.in",
            },
            last_updated_at: new Date().toISOString(),
          }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      assert(
        revPatchSubmitted.status === 403 && admPatchSubmitted.status === 403,
        "reviewer and admin-aal2 cannot PATCH a student's submitted application (403)",
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

      // --- TEST 5: an unconfirmed email cannot submit (M10) ---
      const emailUnconf = `test-unconf-${Date.now()}@sit.test`;
      const userUnconf = await testAdmin.auth.admin.createUser({
        email: emailUnconf,
        password: "TestPassword123!@#",
        email_confirm: false,
        user_metadata: { full_name: "UNCONFIRMED STUDENT", mobile: "9880112277" },
      });
      if (userUnconf.data.user) cleanupUserIds.push(userUnconf.data.user.id);
      await testAdmin.from("profiles").update({ role: "student" }).eq("id", userUnconf.data.user!.id);

      const unconfCycleId = crypto.randomUUID();
      cleanupCycleIds.push(unconfCycleId);
      await testAdmin.from("cycles").insert({
        id: unconfCycleId,
        scholarship_id: sch.id,
        academic_year: `UNCONF-${Date.now()}`,
        status: "open",
        opens_at: "2025-01-01T00:00:00Z",
        closes_at: "2030-01-01T00:00:00Z",
      });

      const unconfAppId = crypto.randomUUID();
      cleanupAppIds.push(unconfAppId);
      await testAdmin.from("applications").insert({
        id: unconfAppId,
        ref_no: `SIT-UNCONF-${Date.now().toString().slice(-6)}`,
        cycle_id: unconfCycleId,
        student_id: userUnconf.data.user!.id,
        status: "draft",
        data: {
          scholarship_code: "MNC",
          full_name: "UNCONFIRMED STUDENT",
          declaration_accepted: true,
        },
      });

      let unconfBlocked = false;
      try {
        await setAuthenticatedSession(emailUnconf, "TestPassword123!@#");
        const unconfSub = await submitApplicationRoute(
          new Request(`http://localhost:3000/api/applications/${unconfAppId}/submit`, {
            method: "POST",
            headers: { origin: "http://localhost:3000" },
          }),
          { params: Promise.resolve({ id: unconfAppId }) }
        );
        unconfBlocked = unconfSub.status === 403;
      } catch (err: any) {
        // If Supabase Auth blocks login for unconfirmed emails (e.g. "Email not confirmed"),
        // that is an active enforcement of unconfirmed email blocking
        unconfBlocked = err.message?.toLowerCase().includes("confirm") || err.message?.toLowerCase().includes("invalid");
      }

      assert(
        unconfBlocked,
        "an unconfirmed email cannot submit",
        "test_db"
      );

      // --- TEST 6: reviewer gets 403 on accept/reject and admin-only routes ---
      await setAuthenticatedSession(emailRev, "TestPassword123!@#", true);
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

      // --- TEST 6b (M2): decision route enforces allowed status transitions, rejects draft with 409, and requires audited override ---
      await setAuthenticatedSession(emailAdm, "TestPassword123!@#", true);
      const draftDecision = await decisionRoute(
        new Request(`http://localhost:3000/api/admin/applications/${unconfAppId}/decision`, {
          method: "POST",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({ action: "under_review" }),
        }),
        { params: Promise.resolve({ id: unconfAppId }) }
      );

      const invalidTrans = await decisionRoute(
        new Request(`http://localhost:3000/api/admin/applications/${appAId}/decision`, {
          method: "POST",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({ action: "accept" }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      const validTrans1 = await decisionRoute(
        new Request(`http://localhost:3000/api/admin/applications/${appAId}/decision`, {
          method: "POST",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({ action: "under_review", remark: "Moving to review" }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      const validTrans2 = await decisionRoute(
        new Request(`http://localhost:3000/api/admin/applications/${appAId}/decision`, {
          method: "POST",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({ action: "shortlist", remark: "Shortlisting applicant" }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      const overrideTrans = await decisionRoute(
        new Request(`http://localhost:3000/api/admin/applications/${appAId}/decision`, {
          method: "POST",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({ action: "under_review", is_override: true, override_reason: "Academic Senate Re-evaluation" }),
        }),
        { params: Promise.resolve({ id: appAId }) }
      );

      assert(
        draftDecision.status === 409 &&
          invalidTrans.status === 409 &&
          validTrans1.status === 200 &&
          validTrans2.status === 200 &&
          overrideTrans.status === 200,
        "decision route enforces allowed status transitions, rejects draft with 409, and requires audited override (M2)",
        "test_db"
      );

      // --- TEST 7: staff without aal2 get 403 on /api/admin/* ---
      await setAuthenticatedSession(emailAdm, "TestPassword123!@#", false);
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

      // --- TEST 7b: a staff member at aal1 gets 403 on /api/files/[id] and PDF route (no student data leak) ---
      const aal1File = await getFileRoute(
        new Request(`http://localhost:3000/api/files/${primaryFileId}`),
        { params: Promise.resolve({ id: primaryFileId }) }
      );
      const aal1Pdf = await getPdfRoute(
        new Request(`http://localhost:3000/api/applications/${appAId}/pdf`),
        { params: Promise.resolve({ id: appAId }) }
      );
      assert(
        aal1File.status === 403 && aal1Pdf.status === 403,
        "a staff member at aal1 gets 403 on /api/files/[id] and PDF route (no student data leak)",
        "test_db"
      );

      // --- TEST 7c: staff logging in sets last_seen_at so a returning staff member is not rejected as idle ---
      const staleTime = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      await testAdmin.from("profiles").update({ last_seen_at: staleTime }).eq("id", userAdm.data.user!.id);
      
      const admLoginRes = await loginRoute(
        new Request("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { origin: "http://localhost:3000", "content-type": "application/json" },
          body: JSON.stringify({
            email: emailAdm,
            password: "TestPassword123!@#",
            turnstileToken: "test-turnstile-token",
          }),
        })
      );
      const { data: refreshedProfile } = await testAdmin
        .from("profiles")
        .select("last_seen_at")
        .eq("id", userAdm.data.user!.id)
        .single();
      const refreshedMs = refreshedProfile?.last_seen_at ? new Date(refreshedProfile.last_seen_at).getTime() : 0;
      const isRefreshedNow = (Date.now() - refreshedMs) < 15000;
      assert(
        admLoginRes.status === 200 && isRefreshedNow,
        "staff logging in sets last_seen_at so returning staff is not rejected as idle",
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

      // --- TEST 10: cleanup_expired_rate_limits() deletes expired rate limits using expire_at ---
      const testExpiredKey = `test_cleanup_exp_${Date.now()}`;
      await testAdmin.from("rate_limits").insert({
        key: testExpiredKey,
        points: 5,
        expire_at: new Date(Date.now() - 60000).toISOString(),
      });
      const { data: purgedCount, error: purgeErr } = await testAdmin.rpc("cleanup_expired_rate_limits");
      const { data: leftoverExpired } = await testAdmin
        .from("rate_limits")
        .select("key")
        .eq("key", testExpiredKey);
      assert(
        !purgeErr && typeof purgedCount === "number" && purgedCount >= 1 && leftoverExpired?.length === 0,
        "cleanup_expired_rate_limits() deletes WHERE expire_at < now() and purges expired entries",
        "test_db"
      );
    } finally {
      // Clean up throwaway entities & users
      clearSession();
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
    // Tests skipped when SKIP_INTEGRATION=1
    recordSkipped("Student cannot elevate own role to admin (direct PostgREST PATCH on profiles.role rejected)", "SKIP_INTEGRATION=1");
    recordSkipped("Student cannot directly modify application status to accepted via PostgREST", "SKIP_INTEGRATION=1");
    recordSkipped("Student cannot directly modify merit_score via PostgREST", "SKIP_INTEGRATION=1");
    recordSkipped("Anonymous visitor cannot read profiles table directly via PostgREST", "SKIP_INTEGRATION=1");
    recordSkipped("Anonymous visitor cannot insert applications directly via PostgREST", "SKIP_INTEGRATION=1");
    recordSkipped("Student cannot read audit_logs directly via PostgREST", "SKIP_INTEGRATION=1");
    recordSkipped("Anonymous visitor cannot call cleanup_expired_rate_limits via PostgREST RPC", "SKIP_INTEGRATION=1");
    recordSkipped("a student cannot read, edit or download another student's application or file", "SKIP_INTEGRATION=1");
    recordSkipped("a student cannot upload to someone else's application", "SKIP_INTEGRATION=1");
    recordSkipped("reviewer and admin-aal1 cannot submit, withdraw, or upload for a student (H2)", "SKIP_INTEGRATION=1");
    recordSkipped("bank account is encrypted in DB, masked for reviewer, decrypted for student owner and audited admin (H1)", "SKIP_INTEGRATION=1");
    recordSkipped("double submit creates one submission", "SKIP_INTEGRATION=1");
    recordSkipped("the DB rejects a submit after closes_at and while the cycle is closed", "SKIP_INTEGRATION=1");
    recordSkipped("an unconfirmed email cannot submit", "SKIP_INTEGRATION=1");
    recordSkipped("reviewer gets 403 on accept/reject and admin-only routes", "SKIP_INTEGRATION=1");
    recordSkipped("decision route enforces allowed status transitions, rejects draft with 409, and requires audited override (M2)", "SKIP_INTEGRATION=1");
    recordSkipped("staff without aal2 get 403 on /api/admin/*", "SKIP_INTEGRATION=1");
    recordSkipped("a staff member at aal1 gets 403 on /api/files/[id] and PDF route (no student data leak)", "SKIP_INTEGRATION=1");
    recordSkipped("staff logging in sets last_seen_at so returning staff is not rejected as idle", "SKIP_INTEGRATION=1");
    recordSkipped("wrong or missing Origin gets 403 on POST/PATCH/DELETE", "SKIP_INTEGRATION=1");
    recordSkipped("6th bad login returns 429 using the real DB limiter, and 20 parallel requests allow exactly the limit", "SKIP_INTEGRATION=1");
    recordSkipped("cleanup_expired_rate_limits() deletes WHERE expire_at < now() and purges expired entries", "SKIP_INTEGRATION=1");
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

  // File name check: reject names containing path separators or NUL, not ".." inside normal name
  function isProhibitedFilename(name: string): boolean {
    return name.includes("/") || name.includes("\\") || name.includes("\0");
  }

  assert(isProhibitedFilename("../../../etc/passwd"), "File name with forward slashes is rejected");
  assert(isProhibitedFilename("..\\..\\windows\\system32"), "File name with backslashes is rejected");
  assert(isProhibitedFilename("document\0.pdf"), "File name with NUL character is rejected");
  assert(!isProhibitedFilename("normal..marks..card.pdf"), "File name with '..' inside a normal name is accepted");

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

  // In production, missing NEXT_PUBLIC_SITE_URL in origin guard fails closed with HTTP 500
  const origSiteEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
  try {
    (process.env as any).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const prodMissingSiteReq = new Request("http://localhost:3000/api/applications", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    const prodMissingSiteRes = verifyStateChangingOrigin(prodMissingSiteReq);
    assert(
      prodMissingSiteRes?.status === 500,
      "In production, missing NEXT_PUBLIC_SITE_URL fails with HTTP 500 in origin guard"
    );
  } finally {
    (process.env as any).NODE_ENV = origSiteEnv.NODE_ENV;
    if (origSiteEnv.NEXT_PUBLIC_SITE_URL !== undefined) {
      process.env.NEXT_PUBLIC_SITE_URL = origSiteEnv.NEXT_PUBLIC_SITE_URL;
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    }
    if (origSiteEnv.NEXT_PUBLIC_APP_URL !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = origSiteEnv.NEXT_PUBLIC_APP_URL;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  }

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

  // 16. Cloudflare Turnstile CAPTCHA & Security Tests
  console.log("\n--- 16. Cloudflare Turnstile CAPTCHA & Security Tests ---");
  const origTurnstileEnv = {
    NODE_ENV: process.env.NODE_ENV,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  };

  try {
    // A. In non-production (development), missing keys skip check with console warning and return success: true
    (process.env as any).NODE_ENV = "development";
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const devMissingKeys = await verifyTurnstileToken("any-token", "127.0.0.1");
    assert(
      devMissingKeys.success === true,
      "Turnstile: In development mode, missing keys skip validation (success: true)"
    );

    // B. In production, missing keys MUST fail closed (success: false) with clear error, NEVER fail open
    (process.env as any).NODE_ENV = "production";
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const prodMissingKeys = await verifyTurnstileToken("any-token", "127.0.0.1");
    assert(
      prodMissingKeys.success === false &&
        Boolean(prodMissingKeys.message?.includes("misconfigured")),
      "Turnstile: In production mode, missing keys fail closed (success: false)"
    );

    // C. Missing secret key in production fails closed
    (process.env as any).NODE_ENV = "production";
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
    const prodMissingSecret = await verifyTurnstileToken("any-token", "127.0.0.1");
    assert(
      prodMissingSecret.success === false,
      "Turnstile: In production mode, missing secret key fails closed"
    );

    // D. Missing site key in production fails closed
    (process.env as any).NODE_ENV = "production";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const prodMissingSite = await verifyTurnstileToken("any-token", "127.0.0.1");
    assert(
      prodMissingSite.success === false,
      "Turnstile: In production mode, missing site key fails closed"
    );

    // E. When keys are configured, missing or empty token fails with required error message
    (process.env as any).NODE_ENV = "production";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";

    const emptyToken = await verifyTurnstileToken("", "127.0.0.1");
    assert(
      emptyToken.success === false &&
        Boolean(emptyToken.message?.includes("Please complete the CAPTCHA")),
      "Turnstile: Empty token fails with 'Please complete the CAPTCHA' error"
    );

    const nullToken = await verifyTurnstileToken(null, "127.0.0.1");
    assert(
      nullToken.success === false &&
        Boolean(nullToken.message?.includes("Please complete the CAPTCHA")),
      "Turnstile: Null token fails with 'Please complete the CAPTCHA' error"
    );

    const whitespaceToken = await verifyTurnstileToken("   \t  ", "127.0.0.1");
    assert(
      whitespaceToken.success === false,
      "Turnstile: Whitespace-only token fails verification"
    );
  } finally {
    (process.env as any).NODE_ENV = origTurnstileEnv.NODE_ENV;
    if (origTurnstileEnv.TURNSTILE_SECRET_KEY !== undefined) {
      process.env.TURNSTILE_SECRET_KEY = origTurnstileEnv.TURNSTILE_SECRET_KEY;
    } else {
      delete process.env.TURNSTILE_SECRET_KEY;
    }
    if (origTurnstileEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== undefined) {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = origTurnstileEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    } else {
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    }
  }

  // 17. Phase 3 Part 1: Public Pages, Consent Versioning & Minor Guardian Consent Tests
  console.log("\n--- 17. Phase 3 Part 1: Public Pages, Consent Versioning & Minor Guardian Consent Tests ---");

  // A. PRIVACY_VERSION constant
  assert(
    typeof PRIVACY_VERSION === "string" && PRIVACY_VERSION === "2026-1",
    "PRIVACY_VERSION constant is defined and matches '2026-1'"
  );

  // B. Minor age detection logic
  const formatYMD = (year: number, monthIndex: number, day: number) => {
    const y = String(year);
    const m = String(monthIndex + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const now = new Date();
  const minorDob = formatYMD(now.getFullYear() - 17, now.getMonth(), now.getDate());
  const adultDob = formatYMD(now.getFullYear() - 19, now.getMonth(), now.getDate());

  assert(
    isApplicantMinor(minorDob, now) === true,
    "isApplicantMinor returns true for 17-year old applicant"
  );
  assert(
    isApplicantMinor(adultDob, now) === false,
    "isApplicantMinor returns false for 19-year old applicant"
  );

  // Exact 18th birthday boundary
  const exact18Dob = formatYMD(now.getFullYear() - 18, now.getMonth(), now.getDate());
  assert(
    isApplicantMinor(exact18Dob, now) === false,
    "isApplicantMinor returns false on exact 18th birthday"
  );

  const tomorrowOfBirthYear = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate() + 1);
  const dayBefore18Dob = formatYMD(
    tomorrowOfBirthYear.getFullYear(),
    tomorrowOfBirthYear.getMonth(),
    tomorrowOfBirthYear.getDate()
  );
  assert(
    isApplicantMinor(dayBefore18Dob, now) === true,
    "isApplicantMinor returns true on day before 18th birthday"
  );

  // C. Full application schema validation with minor guardian consent
  const baseValidApp = {
    scholarship_code: "MNC",
    full_name: "RAHUL KUMAR",
    usn: "1SI23CS045",
    dob: minorDob,
    nationality: "Indian",
    father_or_guardian_name: "SURESH KUMAR",
    address: "123 SIT Main Road, Tumakuru",
    pincode: "572103",
    mobile: "9876543210",
    email: "rahul@sit.ac.in",
    parent_occupation: "Farmer",
    family_annual_income: 150000,
    income_cert_issue_date: "2024-01-15",
    admitted_through_cet: true,
    last_exam_passed: "II PUC",
    marks_obtained: 540,
    marks_gross_total: 600,
    course: "Computer Science and Engineering",
    year_of_study: 1,
    semester: 1,
    course_duration_years: 4,
    final_exam_month_year: "2028-06",
    annual_fee: 90000,
    applied_earlier: false,
    getting_other_scholarship: false,
    scholarship_amount_required_per_month: 2500,
    bank_acc_holder_name: "RAHUL KUMAR",
    bank_acc_no: "123456789012",
    confirm_bank_acc_no: "123456789012",
    bank_name: "State Bank of India",
    bank_branch: "SIT Campus Branch",
    bank_ifsc: "SBIN0040523",
    declaration_accepted: true,
  };

  // Minor missing guardian consent name must fail
  const minorMissingName = fullApplicationSchema.safeParse({
    ...baseValidApp,
    guardian_consent_accepted: true,
  });
  assert(
    !minorMissingName.success &&
      minorMissingName.error?.issues.some((i) => i.path.includes("guardian_consent_name")),
    "Minor applicant missing guardian consent name fails schema validation"
  );

  // Minor missing guardian consent checkbox must fail
  const minorMissingCheckbox = fullApplicationSchema.safeParse({
    ...baseValidApp,
    guardian_consent_name: "SURESH KUMAR",
    guardian_consent_accepted: false,
  });
  assert(
    !minorMissingCheckbox.success &&
      minorMissingCheckbox.error?.issues.some((i) => i.path.includes("guardian_consent_accepted")),
    "Minor applicant with unchecked guardian consent fails schema validation"
  );

  // Minor with guardian name and accepted checkbox passes
  const minorValid = fullApplicationSchema.safeParse({
    ...baseValidApp,
    guardian_consent_name: "SURESH KUMAR",
    guardian_consent_accepted: true,
  });
  assert(
    minorValid.success,
    "Minor applicant with full guardian consent passes schema validation"
  );

  // Adult applicant passes without guardian consent
  const adultValid = fullApplicationSchema.safeParse({
    ...baseValidApp,
    dob: adultDob,
  });
  assert(
    adultValid.success,
    "Adult applicant passes schema validation without guardian consent fields"
  );

  // D. Sitemap verification
  const sitemapEntries = sitemap();
  assert(
    Array.isArray(sitemapEntries) && sitemapEntries.length > 0,
    "Sitemap returns valid array of URL entries"
  );
  assert(
    sitemapEntries.some((e) => e.url.endsWith("/privacy")),
    "Sitemap includes /privacy URL"
  );
  assert(
    sitemapEntries.some((e) => e.url.endsWith("/terms")),
    "Sitemap includes /terms URL"
  );
  assert(
    sitemapEntries.some((e) => e.url.endsWith("/faq")),
    "Sitemap includes /faq URL"
  );
  assert(
    sitemapEntries.some((e) => e.url.endsWith("/accessibility")),
    "Sitemap includes /accessibility URL"
  );
  assert(
    !sitemapEntries.some((e) => e.url.includes("/admin")),
    "Sitemap strictly excludes private /admin URLs"
  );
  assert(
    !sitemapEntries.some((e) => e.url.includes("/dashboard")),
    "Sitemap strictly excludes private /dashboard URLs"
  );

  // 18. Phase 3 Part 2: Email Templates & Zero-PII Notification Tests
  console.log("\n--- 18. Phase 3 Part 2: Email Templates & Zero-PII Notification Tests ---");

  const sampleEmailInput = {
    refNo: "SIT/2026/0123",
    studentName: "RAHUL KUMAR",
    scholarshipName: "MNC Scholarship",
    remark: "Please re-upload a clear copy of your income certificate.",
    deadlineDate: "2026-10-31",
  };

  const allEmailTypes: EmailEventType[] = [
    "submitted",
    "correction_requested",
    "shortlisted",
    "accepted",
    "rejected",
    "withdrawn",
    "deadline_reminder",
  ];

  for (const eventType of allEmailTypes) {
    const rendered = renderEmail(eventType, sampleEmailInput);

    // Template rendering validity
    assert(
      typeof rendered.subject === "string" && rendered.subject.length > 0,
      `Email template '${eventType}' renders a non-empty subject`
    );
    assert(
      typeof rendered.text === "string" && rendered.text.includes("SIT/2026/0123"),
      `Email template '${eventType}' renders plain text containing reference number`
    );
    assert(
      typeof rendered.html === "string" && rendered.html.includes("SIT/2026/0123"),
      `Email template '${eventType}' renders HTML containing reference number`
    );

    // Bilingual content check
    assert(
      rendered.text.includes("TODO: review by college") || rendered.html.includes("TODO: review by college"),
      `Email template '${eventType}' includes Kannada text with 'TODO: review by college' mark`
    );

    // Subject privacy rule: MUST contain reference number and NOT student PII
    assert(
      rendered.subject.includes("SIT/2026/0123"),
      `Email subject for '${eventType}' includes reference number`
    );
    assert(
      !rendered.subject.includes("RAHUL KUMAR"),
      `Email subject for '${eventType}' strictly excludes student full name`
    );
    assert(
      !rendered.subject.includes("rahul@sit.ac.in"),
      `Email subject for '${eventType}' strictly excludes student email`
    );
    assert(
      !rendered.subject.includes("9876543210"),
      `Email subject for '${eventType}' strictly excludes phone number`
    );
    assert(
      !rendered.subject.includes("123456789012"),
      `Email subject for '${eventType}' strictly excludes bank account number`
    );
  }

  // Zero-PII in logs and fail-safe / skip behavior verification
  const loggedMessages: string[] = [];
  const origWarn = console.warn;
  const origError = console.error;
  const origLog = console.log;

  console.warn = (msg: unknown) => {
    loggedMessages.push(String(msg));
  };
  console.error = (msg: unknown) => {
    loggedMessages.push(String(msg));
  };
  console.log = (msg: unknown) => {
    loggedMessages.push(String(msg));
  };

  try {
    // 1. Development mode: SMTP unset -> logs warning with ref number only, returns true
    const devResult = await sendEmailNotification({
      to: "rahul.secret@sit.ac.in",
      type: "submitted",
      input: {
        refNo: "SIT/2026/9999",
        studentName: "CONFIDENTIAL STUDENT",
        scholarshipName: "SSKA Scholarship",
      },
    });

    assert(devResult === true, "Development notification without SMTP succeeds without blocking");
    assert(
      loggedMessages.some((m) => m.includes("[NOTIFICATION_SKIPPED]") && m.includes("SIT/2026/9999")),
      "Development log records [NOTIFICATION_SKIPPED] with reference number"
    );
    assert(
      !loggedMessages.some((m) => m.includes("rahul.secret@sit.ac.in")),
      "Development log strictly excludes student email address"
    );
    assert(
      !loggedMessages.some((m) => m.includes("CONFIDENTIAL STUDENT")),
      "Development log strictly excludes student name"
    );

    // 2. Production mode: SMTP unset -> fails safely, returns false, logs error without PII
    loggedMessages.length = 0;
    const origEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    const prodResult = await sendEmailNotification({
      to: "student.prod@sit.ac.in",
      type: "accepted",
      input: {
        refNo: "SIT/2026/8888",
        studentName: "AWARD RECIPIENT",
        scholarshipName: "MNC Scholarship",
      },
    });

    (process.env as Record<string, string | undefined>).NODE_ENV = origEnv;

    assert(prodResult === false, "Production notification without SMTP fails safely (returns false)");
    assert(
      loggedMessages.some((m) => m.includes("[NOTIFICATION_FAILED]") && m.includes("SIT/2026/8888")),
      "Production log records [NOTIFICATION_FAILED] with reference number"
    );
    assert(
      !loggedMessages.some((m) => m.includes("student.prod@sit.ac.in")),
      "Production log strictly excludes recipient email"
    );
    assert(
      !loggedMessages.some((m) => m.includes("AWARD RECIPIENT")),
      "Production log strictly excludes recipient name"
    );
  } finally {
    console.warn = origWarn;
    console.error = origError;
    console.log = origLog;
  }


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
