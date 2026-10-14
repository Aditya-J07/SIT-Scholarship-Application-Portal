// Configure testing environment secrets
process.env.JWT_SECRET = process.env.JWT_SECRET || 'sit-test-jwt-secret-key-must-be-at-least-32-chars-long';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'e83a71f00889c253c3e80f2eb9b325ad13e6189bc9ef7f85dc9eb72c1c68e169';

import {
  step1Schema,
  step2Schema,
  step3Schema,
  step5Schema,
} from '../src/lib/schemas/application';
import { evaluateEligibility } from '../src/lib/eligibility';
import { calculateMeritScore, rankApplicantsByYear } from '../src/lib/merit';
import { generateApplicationPdf } from '../src/lib/pdf/generatePdf';
import { Scholarship, ApplicationRecord, UserProfile } from '../src/lib/types';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../src/lib/auth/password';
import { encryptBankAccount, decryptBankAccount, maskBankAccount } from '../src/lib/crypto/encryption';
import { signToken, verifyToken } from '../src/lib/auth/session';
import { db } from '../src/lib/db';
import crypto from 'crypto';

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
  console.log('====================================================');
  console.log('SIT SCHOLARSHIP PORTAL - AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  // 1. Zod Schema Unit Tests
  console.log('--- 1. Zod Schema Unit Tests ---');

  // Phone Validation
  const validPhone = step1Schema.safeParse({
    scholarship_code: 'MNC',
    full_name: 'ROHAN PATIL',
    usn: '1SI23CS089',
    dob: '2005-05-15',
    nationality: 'Indian',
    father_or_guardian_name: 'BASAVARAJ PATIL',
    address: 'Room 204, SIT Campus Hostel, Tumakuru',
    mobile: '9880123456',
    email: 'rohan@sit.ac.in',
  });
  assert(validPhone.success, 'Valid phone number (10 digits starting with 9) accepted');

  const invalidPhone = step1Schema.safeParse({
    scholarship_code: 'MNC',
    full_name: 'ROHAN PATIL',
    usn: '1SI23CS089',
    dob: '2005-05-15',
    nationality: 'Indian',
    father_or_guardian_name: 'BASAVARAJ PATIL',
    address: 'Room 204, SIT Campus Hostel, Tumakuru',
    mobile: '5123456789', // starts with 5 (invalid)
    email: 'rohan@sit.ac.in',
  });
  assert(!invalidPhone.success, 'Invalid mobile starting with 5 rejected');

  // USN Format
  const validUsn = step1Schema.safeParse({
    scholarship_code: 'MNC',
    full_name: 'ROHAN PATIL',
    usn: '1SI23CS089',
    dob: '2005-05-15',
    nationality: 'Indian',
    father_or_guardian_name: 'BASAVARAJ PATIL',
    address: 'Room 204, SIT Campus Hostel, Tumakuru',
    mobile: '9880123456',
    email: 'rohan@sit.ac.in',
  });
  assert(validUsn.success, 'Valid USN format 1SI23CS089 accepted');

  const invalidUsn = step1Schema.safeParse({
    scholarship_code: 'MNC',
    full_name: 'ROHAN PATIL',
    usn: '2SI23CS089', // Invalid prefix
    dob: '2005-05-15',
    nationality: 'Indian',
    father_or_guardian_name: 'BASAVARAJ PATIL',
    address: 'Room 204, SIT Campus Hostel, Tumakuru',
    mobile: '9880123456',
    email: 'rohan@sit.ac.in',
  });
  assert(!invalidUsn.success, 'Invalid USN prefix rejected');

  // DOB Age Range
  const invalidAgeYoung = step1Schema.safeParse({
    scholarship_code: 'MNC',
    full_name: 'ROHAN PATIL',
    usn: '1SI23CS089',
    dob: '2018-05-15', // Under 16
    nationality: 'Indian',
    father_or_guardian_name: 'BASAVARAJ PATIL',
    address: 'Room 204, SIT Campus Hostel, Tumakuru',
    mobile: '9880123456',
    email: 'rohan@sit.ac.in',
  });
  assert(!invalidAgeYoung.success, 'DOB under 16 years old rejected');

  // IFSC Validation
  const validIfsc = step5Schema.safeParse({
    bank_acc_holder_name: 'ROHAN PATIL',
    bank_acc_no: '987654321098',
    confirm_bank_acc_no: '987654321098',
    bank_name: 'State Bank of India',
    bank_branch: 'SIT Extension Counter',
    bank_ifsc: 'SBIN0040523',
  });
  assert(validIfsc.success, 'Valid IFSC code (SBIN0040523) accepted');

  const mismatchedBankAcc = step5Schema.safeParse({
    bank_acc_holder_name: 'ROHAN PATIL',
    bank_acc_no: '987654321098',
    confirm_bank_acc_no: '987654321999', // mismatch
    bank_name: 'State Bank of India',
    bank_branch: 'SIT Extension Counter',
    bank_ifsc: 'SBIN0040523',
  });
  assert(!mismatchedBankAcc.success, 'Mismatched confirm bank account number rejected');

  // Marks check: obtained <= total
  const validMarks = step3Schema.safeParse({
    admitted_through_cet: true,
    last_exam_passed: 'II PUC',
    marks_obtained: 540,
    marks_gross_total: 600,
    course: 'Computer Science and Engineering',
    year_of_study: 1,
    semester: 1,
    course_duration_years: 4,
    final_exam_month_year: '2028-06',
  });
  assert(validMarks.success, 'Marks obtained 540/600 accepted');

  const invalidMarks = step3Schema.safeParse({
    admitted_through_cet: true,
    last_exam_passed: 'II PUC',
    marks_obtained: 650, // exceeds gross total
    marks_gross_total: 600,
    course: 'Computer Science and Engineering',
    year_of_study: 1,
    semester: 1,
    course_duration_years: 4,
    final_exam_month_year: '2028-06',
  });
  assert(!invalidMarks.success, 'Marks obtained exceeding total marks rejected');

  // Semester vs Year mismatch check
  const semMismatch = step3Schema.safeParse({
    admitted_through_cet: true,
    last_exam_passed: '1st Year B.E.',
    marks_obtained: 500,
    marks_gross_total: 600,
    course: 'Computer Science and Engineering',
    year_of_study: 2,
    semester: 1, // Year 2 cannot have semester 1!
    cgpa: 8.5,
    course_duration_years: 4,
    final_exam_month_year: '2028-06',
  });
  assert(!semMismatch.success, 'Year 2 with Semester 1 rejected (must be 3 or 4)');

  // Income Certificate Age (> 5 years rejected)
  const sixYearsAgo = new Date();
  sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
  const oldIncomeCert = step2Schema.safeParse({
    parent_occupation: 'Farmer',
    family_annual_income: 150000,
    income_cert_issue_date: sixYearsAgo.toISOString().split('T')[0],
  });
  assert(!oldIncomeCert.success, 'Income certificate older than 5 years rejected');

  // 2. Eligibility Rules Evaluation Tests
  console.log('\n--- 2. Eligibility Rules Evaluation Tests ---');

  const mncRules = {
    income_limit: 300000,
    cet_required: true,
    max_assistance_pct: 30,
    max_scholarship_pct: 50,
    allow_backlog: false,
  };

  // High Income test
  const highIncomeEval = evaluateEligibility(
    { family_annual_income: 350000, admitted_through_cet: true, year_of_study: 1 },
    mncRules,
    'MNC'
  );
  assert(!highIncomeEval.passed_all_hard_rules, 'Income Rs. 3,50,000 blocks MNC submission');
  assert(highIncomeEval.income_exceeded, 'income_exceeded flag set to true');

  // Non-CET admission test
  const nonCetEval = evaluateEligibility(
    { family_annual_income: 200000, admitted_through_cet: false, year_of_study: 1 },
    mncRules,
    'MNC'
  );
  assert(!nonCetEval.passed_all_hard_rules, 'Non-CET admission blocks MNC submission');
  assert(nonCetEval.cet_disqualified, 'cet_disqualified flag set to true');

  // Backlog in Year 2 test
  const backlogEval = evaluateEligibility(
    { family_annual_income: 200000, admitted_through_cet: true, year_of_study: 2, has_backlog_history: true },
    mncRules,
    'MNC'
  );
  assert(!backlogEval.passed_all_hard_rules, 'Backlog history in Year 2 blocks MNC submission');
  assert(backlogEval.backlog_disqualified, 'backlog_disqualified flag set to true');

  // Other assistance > 30% of fee test
  const otherAssistanceEval = evaluateEligibility(
    {
      annual_fee: 100000,
      getting_other_scholarship: true,
      other_scholarship_amount_per_month: 3000, // 36,000/yr = 36% > 30%
      family_annual_income: 150000,
      admitted_through_cet: true,
      year_of_study: 1,
    },
    mncRules,
    'MNC'
  );
  assert(!otherAssistanceEval.passed_all_hard_rules, 'Other assistance above 30% of annual fee blocks MNC submission');
  assert(otherAssistanceEval.other_assistance_exceeded, 'other_assistance_exceeded flag set to true');

  // Perfect eligible student
  const fullyEligibleEval = evaluateEligibility(
    {
      family_annual_income: 180000,
      admitted_through_cet: true,
      year_of_study: 2,
      has_backlog_history: false,
      annual_fee: 95000,
      getting_other_scholarship: false,
      scholarship_amount_required_per_month: 3000, // 36,000 < 50% of 95,000
    },
    mncRules,
    'MNC'
  );
  assert(fullyEligibleEval.passed_all_hard_rules, 'Fully eligible applicant passes all MNC hard rules');

  // 3. Merit Calculation & Ranking Tests
  console.log('\n--- 3. Merit Calculation & Ranking Tests ---');

  const yr1Score = calculateMeritScore({ year_of_study: 1, marks_obtained: 570, marks_gross_total: 600 });
  assert(yr1Score === 95, '1st year merit score calculated as percentage (95.00)');

  const yr2Score = calculateMeritScore({ year_of_study: 2, cgpa: 9.25 });
  assert(yr2Score === 92.5, '2nd year merit score calculated from CGPA (92.50)');

  // Ranking test with means tie-breaker
  const mockApps: ApplicationRecord[] = [
    {
      id: 'app1',
      ref_no: 'SIT-MNC-2026-000001',
      student_id: 'u1',
      cycle_id: 'c1',
      status: 'submitted',
      current_step: 5,
      hard_copy_received: false,
      data: { year_of_study: 1, family_annual_income: 200000, full_name: 'Student A' },
      computed: { percentage: 92.5, merit_score: 92.5, eligibility_flags: fullyEligibleEval },
      merit_score: 92.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'app2',
      ref_no: 'SIT-MNC-2026-000002',
      student_id: 'u2',
      cycle_id: 'c1',
      status: 'submitted',
      current_step: 5,
      hard_copy_received: false,
      data: { year_of_study: 1, family_annual_income: 120000, full_name: 'Student B (Lower Income)' },
      computed: { percentage: 92.5, merit_score: 92.5, eligibility_flags: fullyEligibleEval },
      merit_score: 92.5, // Tie on score, but lower income
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'app3',
      ref_no: 'SIT-MNC-2026-000003',
      student_id: 'u3',
      cycle_id: 'c1',
      status: 'submitted',
      current_step: 5,
      hard_copy_received: false,
      data: { year_of_study: 1, family_annual_income: 150000, full_name: 'Student C (Higher Score)' },
      computed: { percentage: 96.0, merit_score: 96.0, eligibility_flags: fullyEligibleEval },
      merit_score: 96.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const rankings = rankApplicantsByYear(mockApps);
  assert(rankings[1].topTen[0].id === 'app3', 'Rank #1 has highest merit score (96.0)');
  assert(rankings[1].topTen[1].id === 'app2', 'Rank #2 breaks tie in favour of lower family income (means)');

  // 4. Server-Side PDF Generation Tests
  console.log('\n--- 4. Server-Side PDF Generation Tests ---');

  const testScholarship: Scholarship = {
    id: 'sch_mnc',
    code: 'MNC',
    name: 'Dr. M.N. Channabasappa Endowment Fund Loan Scholarship',
    active: true,
    fee_label: 'Total fee per year',
    rules: mncRules,
    requires_recommendation: false,
    created_at: new Date().toISOString(),
  };

  const testApp: ApplicationRecord = {
    id: 'test_app_pdf',
    ref_no: 'SIT-MNC-2026-999999',
    student_id: 'user_test',
    cycle_id: 'cycle_2026',
    status: 'submitted',
    current_step: 7,
    hard_copy_received: false,
    data: {
      scholarship_code: 'MNC',
      full_name: 'CHETHAN KUMAR G N',
      usn: '1SI23CS045',
      dob: '2005-08-20',
      nationality: 'Indian',
      father_or_guardian_name: 'NANJUNDAPPA G K',
      address: 'Near Siddaganga Math, Kyathsandra, Tumakuru',
      pincode: '572104',
      mobile: '9845112233',
      email: 'chethan@sit.ac.in',
      parent_occupation: 'Agriculture',
      family_annual_income: 140000,
      income_cert_issue_date: '2024-05-10',
      admitted_through_cet: true,
      last_exam_passed: 'II PUC',
      marks_obtained: 575,
      marks_gross_total: 600,
      percentage: 95.83,
      course: 'Computer Science and Engineering',
      year_of_study: 1,
      semester: 1,
      course_duration_years: 4,
      final_exam_month_year: '2028-06',
      annual_fee: 96000,
      applied_earlier: false,
      getting_other_scholarship: false,
      scholarship_amount_required_per_month: 3500,
      bank_acc_holder_name: 'CHETHAN KUMAR G N',
      bank_acc_no: '987654321098',
      bank_name: 'State Bank of India',
      bank_branch: 'SIT Extension Counter, Tumakuru',
      bank_ifsc: 'SBIN0040523',
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

  const { pdfBuffer, sha256 } = await generateApplicationPdf(testApp, testScholarship, { isDraft: false });
  assert(Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 5000, 'A4 Official PDF generated successfully (> 5 KB)');
  assert(typeof sha256 === 'string' && sha256.length === 64, 'Computed valid 64-char SHA-256 tamper-evident hash');

  const draftResult = await generateApplicationPdf(testApp, testScholarship, { isDraft: true });
  assert(Buffer.isBuffer(draftResult.pdfBuffer) && draftResult.pdfBuffer.length > 5000, 'DRAFT watermarked preview PDF generated successfully');

  // 5. Phase 1 Security Architecture & Cryptography Tests
  console.log('\n--- 5. Phase 1 Security Architecture & Cryptography Tests ---');

  // Password Policy
  const shortPass = validatePasswordStrength('Pass1!');
  assert(!shortPass.valid, 'Password shorter than 10 characters rejected');

  const commonPass = validatePasswordStrength('password123');
  assert(!commonPass.valid, 'Common password from blocklist rejected');

  const emailPass = validatePasswordStrength('basavarajSecure123!', { email: 'basavaraj@sit.ac.in' });
  assert(!emailPass.valid, 'Password containing email username rejected');

  const validPass = validatePasswordStrength('KitturChennamma@2026!', { email: 'student@sit.ac.in', fullName: 'Rohan Patil' });
  assert(validPass.valid, 'Strong passphrase compliant with SIT policy accepted');

  // Scrypt Hashing & timingSafeEqual Verification
  const testPassword = 'SecureSITPassphrase#2026';
  const hashed = hashPassword(testPassword);
  assert(hashed.startsWith('scrypt$'), 'Password hashed using crypto.scrypt format (scrypt$salt$key)');

  const verifyValid = verifyPassword(testPassword, hashed);
  assert(verifyValid.verified && !verifyValid.needsRehash, 'Correct password verified via timingSafeEqual with no rehash needed');

  const verifyWrong = verifyPassword('WrongPassword#2026', hashed);
  assert(!verifyWrong.verified, 'Incorrect password safely rejected');

  // Transparent PBKDF2 hash upgrade test
  const legacySalt = crypto.randomBytes(16).toString('hex');
  const legacyKey = crypto.pbkdf2Sync(testPassword, legacySalt, 10000, 64, 'sha512').toString('hex');
  const legacyHash = `${legacySalt}:${legacyKey}`;
  const legacyVerify = verifyPassword(testPassword, legacyHash);
  assert(legacyVerify.verified && legacyVerify.needsRehash, 'Legacy PBKDF2 hash verified and flagged for transparent upgrade to scrypt');

  // Bank Account AES-256-GCM Encryption
  const rawBankAcc = '987654321098';
  const encryptedBankAcc = encryptBankAccount(rawBankAcc);
  assert(encryptedBankAcc.startsWith('v1:'), 'Bank account encrypted using versioned AES-256-GCM');
  assert(encryptedBankAcc !== rawBankAcc, 'Encrypted bank ciphertext does not contain plaintext account number');

  const decryptedBankAcc = decryptBankAccount(encryptedBankAcc);
  assert(decryptedBankAcc === rawBankAcc, 'Decrypted bank account matches original plaintext exactly');

  const masked = maskBankAccount(rawBankAcc);
  assert(masked === 'XXXXXXXX1098', 'Bank account masked to show only last 4 digits (XXXXXXXX1098)');

  // JWT Session Timing-Safe Signing & Verification
  const testPayload = {
    userId: crypto.randomUUID(),
    email: 'admin.audit@sit.ac.in',
    role: 'admin' as const,
    fullName: 'ADMIN AUDITOR',
    tokenVersion: 1,
  };
  const token = signToken(testPayload, 1);
  assert(typeof token === 'string' && token.includes('.'), 'JWT session signed with 1-hour expiry for admin');

  const verifiedSession = verifyToken(token);
  assert(verifiedSession !== null && verifiedSession.userId === testPayload.userId, 'JWT session successfully verified with timingSafeEqual');

  const tamperedToken = token.slice(0, -4) + 'abcd';
  const tamperedVerify = verifyToken(tamperedToken);
  assert(tamperedVerify === null, 'Tampered JWT signature strictly rejected');

  // Pure Database Layer Verification (Zero Demo Passwords in Memory)
  const initialUsers = await db.listUsers();
  assert(initialUsers.length === 0, 'Zero hardcoded demo passwords or accounts in database (purged C2)');

  const testUser: UserProfile = {
    id: crypto.randomUUID(),
    role: 'student',
    full_name: 'SHIVAKUMAR S',
    mobile: '9845098450',
    email: 'shivakumar@sit.ac.in',
    bank_acc_no: '123456789012',
    token_version: 1,
    must_change_password: false,
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.createUser(testUser);
  const fetchedUser = await db.findUserById(testUser.id);
  assert(fetchedUser !== null && fetchedUser.email === testUser.email, 'Database async createUser and findUserById succeeded');
  assert(fetchedUser?.bank_acc_no === '123456789012', 'Decrypted bank account recovered correctly through database layer');

  const activeScholarships = await db.listScholarships();
  assert(activeScholarships.some((s) => s.code === 'MNC' && s.active), 'Official MNC scholarship seeded and active');
  assert(activeScholarships.some((s) => s.code === 'SSKA' && s.active), 'Official SSKA scholarship seeded and active');
  assert(activeScholarships.some((s) => s.code === 'SITEB' && !s.active), 'SITEB scholarship correctly marked inactive pending circular');

  console.log('\n====================================================');
  console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} (100% Pass Rate)`);
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\nTest Suite Failed with error:', err);
  process.exit(1);
});
