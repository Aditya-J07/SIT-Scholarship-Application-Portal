import { z } from 'zod';
import { REQUIRE_GUARDIAN_CONSENT_FOR_MINORS } from '../constants';

export function isApplicantMinor(dobStr: string, asOfDate: Date = new Date()): boolean {
  const parts = dobStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [bYear, bMonth, bDay] = parts;
  let age = asOfDate.getFullYear() - bYear;
  const m = (asOfDate.getMonth() + 1) - bMonth;
  if (m < 0 || (m === 0 && asOfDate.getDate() < bDay)) {
    age--;
  }
  return age < 18;
}

export const step1Fields = {
  scholarship_code: z.string().min(1, 'Scholarship must be selected'),
  full_name: z
    .string()
    .trim()
    .refine((v) => /^[A-Za-z\s.]{3,80}$/.test(v), {
      message: 'Enter full name in capital letters (3 to 80 characters, letters and dots only)',
    })
    .transform((v) => v.toUpperCase()),
  usn: z
    .string()
    .trim()
    .refine((v) => /^1SI\d{2}[A-Za-z]{2,3}\d{3}$/i.test(v), {
      message: 'Enter a valid SIT USN format (e.g., 1SI23CS089)',
    })
    .transform((v) => v.toUpperCase()),
  dob: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((val) => {
      const birth = new Date(val);
      if (isNaN(birth.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 16 && age <= 35;
    }, {
      message: 'Age must be between 16 and 35 years as on the application date',
    }),
  nationality: z.string().default('Indian'),
  father_or_guardian_name: z
    .string()
    .trim()
    .refine((v) => /^[A-Za-z\s.]{3,80}$/.test(v), {
      message: "Enter Father's/Guardian's name (3 to 80 characters, letters and dots only)",
    })
    .transform((v) => v.toUpperCase()),
  address: z
    .string()
    .trim()
    .min(10, 'Address must be at least 10 characters long')
    .max(250, 'Address cannot exceed 250 characters'),
  pincode: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{6}$/.test(v), {
      message: 'Enter a valid 6-digit PIN code',
    })
    .optional(),
  mobile: z
    .string()
    .trim()
    .refine((v) => /^[6-9]\d{9}$/.test(v), {
      message: 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9',
    }),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address')
    .transform((v) => v.toLowerCase()),
};

export const step2Fields = {
  parent_occupation: z
    .string()
    .trim()
    .min(2, 'Enter parent/guardian occupation (at least 2 characters)')
    .max(60, 'Occupation cannot exceed 60 characters'),
  family_annual_income: z
    .coerce
    .number()
    .int('Income must be an integer')
    .min(0, 'Income cannot be negative')
    .max(9999999, 'Annual income cannot exceed Rs. 99,99,999'),
  income_cert_issue_date: z
    .string()
    .min(1, 'Income certificate issue date is required')
    .refine((val) => {
      const issue = new Date(val);
      if (isNaN(issue.getTime())) return false;
      const today = new Date();
      if (issue > today) return false;
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(today.getFullYear() - 5);
      return issue >= fiveYearsAgo;
    }, {
      message: 'Income certificate must not be older than 5 years and cannot be a future date',
    }),
};

export const step3Fields = {
  admitted_through_cet: z.boolean(),
  last_exam_passed: z
    .string()
    .trim()
    .min(2, 'Enter last examination passed (e.g. II PUC, 1st Year B.E.)'),
  marks_obtained: z
    .coerce
    .number()
    .int('Marks must be an integer')
    .min(0, 'Marks obtained cannot be negative'),
  marks_gross_total: z
    .coerce
    .number()
    .int('Total marks must be an integer')
    .min(1, 'Total marks must be greater than zero'),
  percentage: z.number().optional(),
  course: z.string().min(1, 'Select your course'),
  year_of_study: z.coerce.number().int().min(1).max(4),
  semester: z.coerce.number().int().min(1).max(8),
  cgpa: z.coerce.number().min(0).max(10).optional().nullable(),
  has_backlog_history: z.boolean().default(false),
  course_duration_years: z.coerce.number().int().default(4),
  final_exam_month_year: z
    .string()
    .min(1, 'Month and year of final exam is required')
    .refine((val) => {
      const date = new Date(`${val}-01`);
      if (isNaN(date.getTime())) return false;
      const now = new Date();
      return date > now;
    }, {
      message: 'Final examination date must be in the future',
    }),
};

export const step4Fields = {
  annual_fee: z
    .coerce
    .number()
    .int('Fee must be an integer')
    .min(1, 'Fee per year must be greater than zero'),
  applied_earlier: z.boolean(),
  previous_application_ref_no: z.string().trim().optional(),
  getting_other_scholarship: z.boolean(),
  other_scholarship_amount_per_month: z
    .coerce
    .number()
    .int()
    .min(0)
    .optional(),
  scholarship_amount_required_per_month: z
    .coerce
    .number()
    .int('Amount must be an integer')
    .min(1, 'Requested scholarship amount must be greater than zero'),
};

export const step5Fields = {
  bank_acc_holder_name: z
    .string()
    .trim()
    .min(3, 'Enter account holder name as per bank passbook')
    .transform((v) => v.toUpperCase()),
  bank_acc_no: z
    .string()
    .trim()
    .refine((v) => /^\d{9,18}$/.test(v), {
      message: 'Savings bank account number must be between 9 and 18 digits',
    }),
  confirm_bank_acc_no: z.string().trim(),
  bank_name: z.string().trim().min(2, 'Enter bank name'),
  bank_branch: z.string().trim().min(2, 'Enter branch address'),
  bank_ifsc: z
    .string()
    .trim()
    .refine((v) => /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(v), {
      message: 'Enter a valid 11-character IFSC code (e.g., SBIN0040523)',
    })
    .transform((v) => v.toUpperCase()),
};

export const step7Fields = {
  declaration_accepted: z.literal(true),
  guardian_consent_name: z.string().trim().optional(),
  guardian_consent_accepted: z.boolean().optional(),
};

// Refinement for Step 3
function refineStep3(data: any, ctx: z.RefinementCtx) {
  if (data.marks_obtained > data.marks_gross_total) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['marks_obtained'],
      message: 'Marks obtained cannot exceed gross total marks',
    });
  }

  const expectedMinSem = (data.year_of_study - 1) * 2 + 1;
  const expectedMaxSem = data.year_of_study * 2;
  if (data.semester < expectedMinSem || data.semester > expectedMaxSem) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['semester'],
      message: `For Year ${data.year_of_study}, semester must be either Semester ${expectedMinSem} or ${expectedMaxSem}`,
    });
  }

  if (data.year_of_study > 1 && (data.cgpa === undefined || data.cgpa === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cgpa'],
      message: 'CGPA is required for 2nd, 3rd, and 4th year students (scale 0.00 to 10.00)',
    });
  }
}

// Refinement for Step 4
function refineStep4(data: any, ctx: z.RefinementCtx) {
  if (data.applied_earlier && (!data.previous_application_ref_no || data.previous_application_ref_no.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['previous_application_ref_no'],
      message: 'Reference or file number is required if previously applied',
    });
  }

  if (data.getting_other_scholarship) {
    if (!data.other_scholarship_amount_per_month || data.other_scholarship_amount_per_month <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['other_scholarship_amount_per_month'],
        message: 'Enter the monthly financial assistance/stipend amount received from other sources',
      });
    }
  }
}

// Refinement for Step 5
function refineStep5(data: any, ctx: z.RefinementCtx) {
  if (data.bank_acc_no !== data.confirm_bank_acc_no) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirm_bank_acc_no'],
      message: 'Account numbers do not match. Please re-enter carefully.',
    });
  }
}

// Refinement for Step 7 (Minor Parental Consent)
function refineStep7(data: any, ctx: z.RefinementCtx) {
  if (REQUIRE_GUARDIAN_CONSENT_FOR_MINORS && data.dob && isApplicantMinor(data.dob)) {
    if (!data.guardian_consent_name || data.guardian_consent_name.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guardian_consent_name'],
        message: 'Guardian name is required for applicants under 18 years of age (minimum 3 characters)',
      });
    }
    if (data.guardian_consent_accepted !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guardian_consent_accepted'],
        message: 'Guardian consent checkbox is mandatory for applicants under 18 years of age',
      });
    }
  }
}

// Step Schemas (Strict: rejects unknown client keys per H2 / B2)
export const step1Schema = z.object(step1Fields).strict();
export const step2Schema = z.object(step2Fields).strict();
export const step3Schema = z.object(step3Fields).strict().superRefine(refineStep3);
export const step4Schema = z.object(step4Fields).strict().superRefine(refineStep4);
export const step5Schema = z.object(step5Fields).strict().superRefine(refineStep5);
export const step7Schema = z.object(step7Fields).strict();

// Full Application Schema
export const fullApplicationSchema = z
  .object({
    ...step1Fields,
    ...step2Fields,
    ...step3Fields,
    ...step4Fields,
    ...step5Fields,
    ...step7Fields,
  })
  .superRefine((data, ctx) => {
    refineStep3(data, ctx);
    refineStep4(data, ctx);
    refineStep5(data, ctx);
    refineStep7(data, ctx);
  });

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type Step5Data = z.infer<typeof step5Schema>;
export type Step7Data = z.infer<typeof step7Schema>;
export type FullApplicationInput = z.infer<typeof fullApplicationSchema>;
