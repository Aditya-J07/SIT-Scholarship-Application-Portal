import fs from 'fs';
import path from 'path';
import { 
  DatabaseSchema, 
  UserProfile, 
  Scholarship, 
  AcademicCycle, 
  ApplicationRecord, 
  ApplicationFileRecord, 
  RemarkRecord, 
  AuditRecord 
} from '../types';
import { hashPassword } from '../auth/password';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const STORAGE_DIR = path.join(DATA_DIR, 'storage');

// Ensure storage and data directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function getInitialDatabase(): DatabaseSchema {
  const adminPasswordHash = hashPassword('Admin@123');
  const studentPasswordHash = hashPassword('Student@123');

  const adminUser: UserProfile = {
    id: 'user_admin_001',
    role: 'admin',
    full_name: 'COLLEGE ADMINISTRATOR (SIT)',
    mobile: '9845012345',
    email: 'admin@sit.ac.in',
    password_hash: adminPasswordHash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const studentUser: UserProfile = {
    id: 'user_student_001',
    role: 'student',
    full_name: 'ROHAN PATIL',
    mobile: '9880123456',
    email: 'student@sit.ac.in',
    password_hash: studentPasswordHash,
    bank_account_holder: 'ROHAN PATIL',
    bank_acc_no: '987654321098',
    bank_name: 'State Bank of India',
    bank_branch: 'SIT Campus Extension Counter, Tumakuru',
    bank_ifsc: 'SBIN0040523',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const scholarships: Scholarship[] = [
    {
      id: 'sch_mnc',
      code: 'MNC',
      name: 'Dr. M.N. Channabasappa Endowment Fund Loan Scholarship',
      active: true,
      fee_label: 'Total fee per year',
      requires_recommendation: false,
      description: 'Endowment fund loan scholarship awarded on merit-cum-means for financially deserving students admitted through CET. Family income must not exceed Rs. 3,00,000 per annum.',
      rules: {
        income_limit: 300000,
        cet_required: true,
        max_assistance_pct: 30,
        max_scholarship_pct: 50,
        allow_backlog: false,
        max_awardees_per_year: 1,
        allow_submit_with_warning: false,
      },
      created_at: new Date().toISOString(),
    },
    {
      id: 'sch_sska',
      code: 'SSKA',
      name: 'Sri Sripathi K A Memorial Scholarship',
      active: true,
      fee_label: 'Tuition fee per year',
      requires_recommendation: true,
      description: 'Memorial scholarship for undergraduate students requiring tuition fee financial support. Includes Proctor and Head of Department official recommendation verification.',
      rules: {
        income_limit: 500000,
        requires_hod_proctor_recommendation: true,
        max_assistance_pct: 30,
        allow_submit_with_warning: true,
      },
      created_at: new Date().toISOString(),
    },
    {
      id: 'sch_siteb',
      code: 'SITEB',
      name: 'SIT Scholarship to Economically Backward and Socially Challenged Students',
      active: false, // Mark inactive until form is supplied as per build spec!
      fee_label: 'Total fee per year',
      requires_recommendation: false,
      description: 'Special welfare scholarship for economically and socially challenged students. Application form awaiting official committee circular.',
      rules: {},
      created_at: new Date().toISOString(),
    },
  ];

  const cycles: AcademicCycle[] = [
    {
      id: 'cycle_mnc_2026',
      scholarship_id: 'sch_mnc',
      academic_year: '2026-2027',
      opens_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      closes_at: new Date(Date.now() + 60 * 86400000).toISOString(), // Open for 60 more days
      status: 'open',
      created_at: new Date().toISOString(),
    },
    {
      id: 'cycle_sska_2026',
      scholarship_id: 'sch_sska',
      academic_year: '2026-2027',
      opens_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      closes_at: new Date(Date.now() + 60 * 86400000).toISOString(),
      status: 'open',
      created_at: new Date().toISOString(),
    },
  ];

  // Seed two demo applications for admin review & merit ranking
  const sampleApplications: ApplicationRecord[] = [
    {
      id: 'app_seed_001',
      ref_no: 'SIT-MNC-2026-000101',
      student_id: 'user_student_001',
      cycle_id: 'cycle_mnc_2026',
      status: 'submitted',
      current_step: 7,
      hard_copy_received: false,
      data: {
        scholarship_code: 'MNC',
        full_name: 'ROHAN PATIL',
        usn: '1SI23CS089',
        dob: '2005-04-12',
        nationality: 'Indian',
        father_or_guardian_name: 'BASAVARAJ PATIL',
        address: 'ROOM 204, GANGADHAR HOSTEL, SIT CAMPUS, TUMAKURU - 572103',
        pincode: '572103',
        mobile: '9880123456',
        email: 'student@sit.ac.in',
        parent_occupation: 'Farmer',
        family_annual_income: 120000,
        income_cert_issue_date: '2024-06-15',
        admitted_through_cet: true,
        last_exam_passed: 'II PUC',
        marks_obtained: 568,
        marks_gross_total: 600,
        percentage: 94.67,
        course: 'Computer Science and Engineering',
        year_of_study: 1,
        semester: 1,
        course_duration_years: 4,
        final_exam_month_year: '2028-06',
        annual_fee: 98000,
        applied_earlier: false,
        getting_other_scholarship: false,
        scholarship_amount_required_per_month: 3500,
        bank_acc_holder_name: 'ROHAN PATIL',
        bank_acc_no: '987654321098',
        bank_name: 'State Bank of India',
        bank_branch: 'SIT Campus Extension Counter, Tumakuru',
        bank_ifsc: 'SBIN0040523',
        declaration_accepted: true,
      },
      computed: {
        percentage: 94.67,
        merit_score: 94.67,
        eligibility_flags: {
          passed_all_hard_rules: true,
          income_exceeded: false,
          backlog_disqualified: false,
          cet_disqualified: false,
          other_assistance_exceeded: false,
          amount_warn_exceeded: false,
          warnings: [],
          errors: [],
        },
      },
      merit_score: 94.67,
      submitted_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];

  return {
    profiles: [adminUser, studentUser],
    scholarships,
    cycles,
    applications: sampleApplications,
    application_files: [],
    remarks: [],
    audit_logs: [
      {
        id: 'audit_init_001',
        action: 'SYSTEM_INITIALIZED',
        entity: 'system',
        entity_id: 'sit_portal',
        created_at: new Date().toISOString(),
      },
    ],
  };
}

class Database {
  private memoryDb: DatabaseSchema | null = null;

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.memoryDb = JSON.parse(raw);
        return this.memoryDb!;
      }
    } catch (err) {
      console.error('Error loading db.json, reinitializing...', err);
    }
    const initial = getInitialDatabase();
    this.save(initial);
    return initial;
  }

  private save(data: DatabaseSchema) {
    this.memoryDb = data;
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public getDb(): DatabaseSchema {
    if (!this.memoryDb) {
      return this.load();
    }
    return this.memoryDb;
  }

  public mutate<T>(updater: (db: DatabaseSchema) => T): T {
    const db = this.getDb();
    const result = updater(db);
    this.save(db);
    return result;
  }
}

export const dbInstance = new Database();

// Repositories
export const db = {
  // Profiles
  findUserByEmail: (email: string) => {
    const data = dbInstance.getDb();
    return data.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase()) || null;
  },
  findUserById: (id: string) => {
    const data = dbInstance.getDb();
    return data.profiles.find((p) => p.id === id) || null;
  },
  createUser: (profile: UserProfile) => {
    return dbInstance.mutate((data) => {
      data.profiles.push(profile);
      return profile;
    });
  },
  updateUser: (id: string, updates: Partial<UserProfile>) => {
    return dbInstance.mutate((data) => {
      const idx = data.profiles.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      data.profiles[idx] = {
        ...data.profiles[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return data.profiles[idx];
    });
  },
  listUsers: () => {
    return dbInstance.getDb().profiles;
  },

  // Scholarships
  listScholarships: () => {
    return dbInstance.getDb().scholarships;
  },
  findScholarshipByCode: (code: string) => {
    return dbInstance.getDb().scholarships.find((s) => s.code.toUpperCase() === code.toUpperCase()) || null;
  },
  findScholarshipById: (id: string) => {
    return dbInstance.getDb().scholarships.find((s) => s.id === id) || null;
  },
  updateScholarship: (id: string, updates: Partial<Scholarship>) => {
    return dbInstance.mutate((data) => {
      const idx = data.scholarships.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      data.scholarships[idx] = { ...data.scholarships[idx], ...updates };
      return data.scholarships[idx];
    });
  },

  // Cycles
  listCycles: () => {
    return dbInstance.getDb().cycles;
  },
  findCycleById: (id: string) => {
    return dbInstance.getDb().cycles.find((c) => c.id === id) || null;
  },
  findActiveCycleForScholarship: (scholarshipId: string) => {
    const now = new Date().toISOString();
    return (
      dbInstance
        .getDb()
        .cycles.find(
          (c) =>
            c.scholarship_id === scholarshipId &&
            c.status === 'open' &&
            c.opens_at <= now &&
            c.closes_at >= now
        ) || null
    );
  },
  updateCycle: (id: string, updates: Partial<AcademicCycle>) => {
    return dbInstance.mutate((data) => {
      const idx = data.cycles.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      data.cycles[idx] = { ...data.cycles[idx], ...updates };
      return data.cycles[idx];
    });
  },
  createCycle: (cycle: AcademicCycle) => {
    return dbInstance.mutate((data) => {
      data.cycles.push(cycle);
      return cycle;
    });
  },

  // Applications
  listApplications: () => {
    return dbInstance.getDb().applications;
  },
  findApplicationById: (id: string) => {
    return dbInstance.getDb().applications.find((a) => a.id === id) || null;
  },
  findApplicationByRefNo: (refNo: string) => {
    return dbInstance.getDb().applications.find((a) => a.ref_no.toUpperCase() === refNo.toUpperCase()) || null;
  },
  findApplicationForStudentInCycle: (studentId: string, cycleId: string) => {
    return (
      dbInstance
        .getDb()
        .applications.find((a) => a.student_id === studentId && a.cycle_id === cycleId) || null
    );
  },
  listApplicationsForStudent: (studentId: string) => {
    return dbInstance.getDb().applications.filter((a) => a.student_id === studentId);
  },
  createApplication: (app: ApplicationRecord) => {
    return dbInstance.mutate((data) => {
      data.applications.push(app);
      return app;
    });
  },
  updateApplication: (id: string, updates: Partial<ApplicationRecord>) => {
    return dbInstance.mutate((data) => {
      const idx = data.applications.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      data.applications[idx] = {
        ...data.applications[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return data.applications[idx];
    });
  },

  // Files
  listFilesForApplication: (applicationId: string) => {
    return dbInstance.getDb().application_files.filter((f) => f.application_id === applicationId);
  },
  findFileById: (id: string) => {
    return dbInstance.getDb().application_files.find((f) => f.id === id) || null;
  },
  saveFileRecord: (file: ApplicationFileRecord) => {
    return dbInstance.mutate((data) => {
      // Remove any existing file for the same application and kind
      data.application_files = data.application_files.filter(
        (f) => !(f.application_id === file.application_id && f.kind === file.kind)
      );
      data.application_files.push(file);
      return file;
    });
  },

  // Remarks
  listRemarksForApplication: (applicationId: string) => {
    return dbInstance
      .getDb()
      .remarks.filter((r) => r.application_id === applicationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },
  addRemark: (remark: RemarkRecord) => {
    return dbInstance.mutate((data) => {
      data.remarks.push(remark);
      return remark;
    });
  },

  // Audit Log
  listAuditLogs: () => {
    return [...dbInstance.getDb().audit_logs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
  logAudit: (record: Omit<AuditRecord, 'id' | 'created_at'>) => {
    const fullRecord: AuditRecord = {
      ...record,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    return dbInstance.mutate((data) => {
      data.audit_logs.push(fullRecord);
      return fullRecord;
    });
  },
};
