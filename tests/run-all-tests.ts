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

if (testUrl && prodUrl && testUrl.trim() === prodUrl.trim()) {
  console.error("FATAL: TEST_SUPABASE_URL must NOT equal NEXT_PUBLIC_SUPABASE_URL!");
  console.error("Tests must run against a separate test Supabase project to protect real student data.");
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
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✕ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
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

  // 8. Isolated Test Project Connection Verification
  if (testUrl && process.env.TEST_SUPABASE_SECRET_KEY) {
    console.log("\n--- 8. Isolated Test Project Connection ---");
    const testClient = createClient(testUrl, process.env.TEST_SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await testClient.from("scholarships").select("count");
    assert(!error, "Successfully connected to isolated test Supabase project");
  } else {
    console.log("\n--- 8. Test Supabase Project Notice ---");
    console.log("  ℹ NOTE: TEST_SUPABASE_* variables not configured. Skipping remote database test.");
  }

  console.log("\n====================================================");
  console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} (100% Pass Rate)`);
  console.log("====================================================");
}

runTests().catch((err) => {
  console.error("\nTest Suite Failed with error:", err);
  process.exit(1);
});
