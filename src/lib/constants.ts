export const SIT_COURSES = [
  'Computer Science and Engineering',
  'Information Science and Engineering',
  'Artificial Intelligence and Data Science',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics and Instrumentation Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Master of Computer Applications (MCA)',
  'Master of Business Administration (MBA)',
] as const;

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
