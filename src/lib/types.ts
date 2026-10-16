// SIT Scholarship Application Portal - Core Types

export type UserRole = 'student' | 'reviewer' | 'admin';

export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'needs_correction'
  | 'shortlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string;
  mobile: string;
  email: string;
  password_hash?: string;
  must_change_password?: boolean;
  email_verified?: boolean;
  token_version?: number;
  two_factor_enabled?: boolean;
  two_factor_secret?: string;
  two_factor_recovery_codes?: string[];
  bank_account_holder?: string;
  bank_acc_no?: string;
  bank_acc_last4?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_ifsc?: string;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScholarshipRules {
  income_limit?: number; // e.g. 300000 for MNC
  cet_required?: boolean; // true for MNC
  max_assistance_pct?: number; // 30% of total fee
  max_scholarship_pct?: number; // 50% of total fee
  allow_backlog?: boolean; // false for MNC
  max_awardees_per_year?: number; // 1 per year
  requires_hod_proctor_recommendation?: boolean; // true for SSKA
  allow_submit_with_warning?: boolean; // admin toggle
}

export interface Scholarship {
  id: string;
  code: string; // MNC, SSKA, SITEB
  name: string;
  active: boolean;
  fee_label: string; // "Total fee per year" or "Tuition fee per year"
  rules: ScholarshipRules;
  requires_recommendation: boolean;
  description?: string;
  created_at: string;
}

export interface AcademicCycle {
  id: string;
  scholarship_id: string;
  academic_year: string; // e.g. "2026-2027"
  opens_at: string;
  closes_at: string;
  status: 'open' | 'closed' | 'upcoming';
  created_at: string;
}

export interface ApplicationFormData {
  // Step 1: Scholarship & Student details
  scholarship_code: string;
  full_name: string;
  usn: string;
  dob: string;
  nationality: string;
  father_or_guardian_name: string;
  address: string;
  pincode?: string;
  mobile: string;
  email: string;

  // Step 2: Family
  parent_occupation: string;
  family_annual_income: number;
  income_cert_issue_date: string;

  // Step 3: Academics
  admitted_through_cet: boolean;
  last_exam_passed: string; // "II PUC", "Diploma", "1st Year B.E.", etc.
  marks_obtained: number;
  marks_gross_total: number;
  percentage?: number; // computed
  course: string; // "CSE", "ECE", "ISE", etc.
  year_of_study: number; // 1 to 4
  semester: number; // 1 to 8
  cgpa?: number | null; // for years 2-4
  has_backlog_history?: boolean; // for years 2-4
  course_duration_years: number; // default 4
  final_exam_month_year: string; // e.g. "2028-06"

  // Step 4: Fees and other assistance
  annual_fee: number; // Total fee or Tuition fee
  applied_earlier: boolean;
  previous_application_ref_no?: string;
  getting_other_scholarship: boolean;
  other_scholarship_amount_per_month?: number;
  scholarship_amount_required_per_month: number;

  // Step 5: Bank details (student's own)
  bank_acc_holder_name: string;
  bank_acc_no: string;
  confirm_bank_acc_no?: string;
  bank_name: string;
  bank_branch: string;
  bank_ifsc: string;

  // Declaration
  declaration_accepted?: boolean;
}

export interface ApplicationComputed {
  percentage: number;
  merit_score: number;
  eligibility_flags: {
    passed_all_hard_rules: boolean;
    income_exceeded: boolean;
    backlog_disqualified: boolean;
    cet_disqualified: boolean;
    other_assistance_exceeded: boolean;
    amount_warn_exceeded: boolean;
    warnings: string[];
    errors: string[];
  };
}

export interface ApplicationFileRecord {
  id: string;
  application_id: string;
  kind: 
    | 'photo'
    | 'sig_student'
    | 'sig_parent'
    | 'cet_order'
    | 'marks_card'
    | 'income_cert'
    | 'aadhaar'
    | 'fee_receipt'
    | 'principal_cert';
  storage_path: string;
  mime: string;
  size_bytes: number;
  sha256: string;
  original_name: string;
  uploaded_at: string;
}

export interface RemarkRecord {
  id: string;
  application_id: string;
  author_id: string;
  author_name: string;
  author_role: UserRole;
  kind: 'internal_note' | 'correction_request' | 'recommendation' | 'decision';
  body: string;
  created_at: string;
}

export interface AuditRecord {
  id: string;
  actor_id?: string;
  actor_email?: string;
  action: string;
  entity: string;
  entity_id: string;
  meta?: Record<string, unknown>;
  ip?: string;
  created_at: string;
}

export interface ApplicationRecord {
  id: string;
  ref_no: string;
  student_id: string;
  cycle_id: string;
  status: ApplicationStatus;
  current_step: number; // for draft resuming
  data: Partial<ApplicationFormData>;
  computed: ApplicationComputed;
  merit_score: number;
  submitted_at?: string;
  decided_at?: string;
  decided_by?: string;
  decision_remark?: string;
  pdf_path?: string;
  pdf_sha256?: string;
  hard_copy_received: boolean;
  recommendation_status?: 'pending' | 'recommended' | 'not_recommended';
  recommendation_note?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSchema {
  profiles: UserProfile[];
  scholarships: Scholarship[];
  cycles: AcademicCycle[];
  applications: ApplicationRecord[];
  application_files: ApplicationFileRecord[];
  remarks: RemarkRecord[];
  audit_logs: AuditRecord[];
}
