export * from './constants/departments';
import { SIT_DEPARTMENTS } from './constants/departments';

export const SIT_COURSES = SIT_DEPARTMENTS.map((d) => d.name);

export const ENCLOSURES_METADATA = [
  {
    kind: 'cet_order',
    code: 'a',
    title: 'CET Order Copy',
    description: 'Photocopy of CET admission allotment order',
    required: true,
  },
  {
    kind: 'marks_card',
    code: 'b',
    title: 'Last Examination Marks Card',
    description: 'II PUC marks card (1st year) or previous year grade card (2nd to 4th year)',
    required: true,
  },
  {
    kind: 'income_cert',
    code: 'c',
    title: 'Income Certificate',
    description: 'Issued by competent authority, not more than 5 years old and valid',
    required: true,
  },
  {
    kind: 'aadhaar',
    code: 'd',
    title: 'Student Aadhaar Copy',
    description: 'Photocopy of Student Aadhaar Card (Masked/Document only)',
    required: true,
  },
  {
    kind: 'fee_receipt',
    code: 'e',
    title: 'College Fee Paid Receipt',
    description: 'Official fee payment challan / receipt for current academic year',
    required: true,
  },
  {
    kind: 'principal_cert',
    code: 'f',
    title: "Principal's Certificate",
    description: 'Certificate from Principal SIT confirming no other financial assistance above 30% of fee',
    required: true,
  },
] as const;

export const PRIVACY_VERSION = '2026-1';

// Configuration flag for DPDP parental consent for minor applicants (< 18 years old)
// TODO [COLLEGE DECISION REQUIRED]: Legal confirmation required for minor consent threshold and declaration wording.
export const REQUIRE_GUARDIAN_CONSENT_FOR_MINORS =
  process.env.REQUIRE_GUARDIAN_CONSENT_FOR_MINORS !== 'false';

export const ALL_UPLOAD_KINDS = [
  { kind: 'photo', title: 'Passport Photograph', description: 'Recent passport photograph (JPG/PNG, max 1 MB)' },
  { kind: 'sig_student', title: 'Student Signature', description: 'Digital signature of the applicant student' },
  { kind: 'sig_parent', title: 'Parent/Guardian Signature', description: 'Digital signature of parent or legal guardian' },
  { kind: 'cet_order', title: 'CET Order Copy', description: 'Photocopy of CET admission allotment order' },
  { kind: 'marks_card', title: 'Last Examination Marks Card', description: 'II PUC marks card (1st year) or previous year grade card (2nd to 4th year)' },
  { kind: 'income_cert', title: 'Income Certificate', description: 'Issued by competent authority, not more than 5 years old and valid' },
  { kind: 'aadhaar', title: 'Student Aadhaar Copy', description: 'Photocopy of Student Aadhaar Card (Scanned document only, numbers never stored as text)' },
  { kind: 'fee_receipt', title: 'College Fee Paid Receipt', description: 'Official fee payment challan / receipt for current academic year' },
  { kind: 'principal_cert', title: "Principal's Certificate", description: 'Certificate from Principal SIT confirming no other financial assistance above 30% of fee' },
] as const;
