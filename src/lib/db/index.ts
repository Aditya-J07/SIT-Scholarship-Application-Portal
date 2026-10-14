import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserProfile, 
  Scholarship, 
  AcademicCycle, 
  ApplicationRecord, 
  ApplicationFileRecord, 
  RemarkRecord, 
  AuditRecord 
} from '../types';
import { encryptBankAccount, decryptBankAccount } from '../crypto/encryption';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

let _supabaseClient: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) return null;
  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabaseClient;
}

// Default official scholarships per build specification
const DEFAULT_SCHOLARSHIPS: Scholarship[] = [
  {
    id: 'sch_mnc',
    code: 'MNC',
    name: 'Dr. M.N. Channabasappa Endowment Fund Loan Scholarship',
    active: true,
    fee_label: 'Total fee per year',
    requires_recommendation: false,
    description:
      'Endowment fund loan scholarship awarded on merit-cum-means for financially deserving students admitted through CET. Family income must not exceed Rs. 3,00,000 per annum.',
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
    description:
      'Memorial scholarship for undergraduate students requiring tuition fee financial support. Includes Proctor and Head of Department official recommendation verification.',
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
    active: false, // Inactive pending official circular
    fee_label: 'Total fee per year',
    requires_recommendation: false,
    description:
      'Special welfare scholarship for economically and socially challenged students. Application form awaiting official committee circular.',
    rules: {},
    created_at: new Date().toISOString(),
  },
];

// Active Academic Cycles
// TODO [COLLEGE DECISION REQUIRED]: Confirm exact open and close dates for 2026-27 circular
const DEFAULT_CYCLES: AcademicCycle[] = [
  {
    id: 'cycle_mnc_2026',
    scholarship_id: 'sch_mnc',
    academic_year: '2026-2027',
    opens_at: process.env.CYCLE_OPEN_DATE || '2026-09-01T00:00:00.000Z',
    closes_at: process.env.CYCLE_CLOSE_DATE || '2026-12-31T23:59:59.000Z',
    status: 'open',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cycle_sska_2026',
    scholarship_id: 'sch_sska',
    academic_year: '2026-2027',
    opens_at: process.env.CYCLE_OPEN_DATE || '2026-09-01T00:00:00.000Z',
    closes_at: process.env.CYCLE_CLOSE_DATE || '2026-12-31T23:59:59.000Z',
    status: 'open',
    created_at: new Date().toISOString(),
  },
];

// Ephemeral fallback memory store for offline testing (Zero filesystem persistence)
interface MemoryStore {
  profiles: UserProfile[];
  scholarships: Scholarship[];
  cycles: AcademicCycle[];
  applications: ApplicationRecord[];
  application_files: ApplicationFileRecord[];
  remarks: RemarkRecord[];
  audit_logs: AuditRecord[];
}

const memoryStore: MemoryStore = {
  profiles: [], // Zero seeded default accounts - must be bootstrapped via scripts/create-admin.ts
  scholarships: [...DEFAULT_SCHOLARSHIPS],
  cycles: [...DEFAULT_CYCLES],
  applications: [],
  application_files: [],
  remarks: [],
  audit_logs: [],
};

function mapProfileFromDb(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    role: row.role as UserProfile['role'],
    full_name: String(row.full_name || ''),
    mobile: String(row.mobile || ''),
    email: String(row.email || ''),
    password_hash: row.password_hash ? String(row.password_hash) : undefined,
    must_change_password: Boolean(row.must_change_password),
    email_verified: Boolean(row.email_verified),
    token_version: Number(row.token_version ?? 1),
    two_factor_enabled: Boolean(row.two_factor_enabled),
    two_factor_secret: row.two_factor_secret ? String(row.two_factor_secret) : undefined,
    two_factor_recovery_codes: Array.isArray(row.two_factor_recovery_codes)
      ? (row.two_factor_recovery_codes as string[])
      : undefined,
    bank_account_holder: row.bank_account_holder ? String(row.bank_account_holder) : undefined,
    bank_acc_no: row.bank_acc_no_encrypted
      ? decryptBankAccount(String(row.bank_acc_no_encrypted))
      : undefined,
    bank_name: row.bank_name ? String(row.bank_name) : undefined,
    bank_branch: row.bank_branch ? String(row.bank_branch) : undefined,
    bank_ifsc: row.bank_ifsc ? String(row.bank_ifsc) : undefined,
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

export const db = {
  // --------------------------------------------------------------------------
  // Profiles / Users
  // --------------------------------------------------------------------------
  findUserByEmail: async (email: string): Promise<UserProfile | null> => {
    const client = getClient();
    const normalized = email.trim().toLowerCase();

    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .ilike('email', normalized)
          .maybeSingle();

        if (error) {
          console.error('[DB] findUserByEmail error:', error.message);
        } else if (data) {
          return mapProfileFromDb(data);
        }
      } catch (err) {
        console.error('[DB] findUserByEmail exception:', err);
      }
    }

    // Memory fallback
    const found = memoryStore.profiles.find((p) => p.email.toLowerCase() === normalized);
    return found ? { ...found } : null;
  },

  findUserById: async (id: string): Promise<UserProfile | null> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error('[DB] findUserById error:', error.message);
        } else if (data) {
          return mapProfileFromDb(data);
        }
      } catch (err) {
        console.error('[DB] findUserById exception:', err);
      }
    }

    const found = memoryStore.profiles.find((p) => p.id === id);
    return found ? { ...found } : null;
  },

  createUser: async (profile: UserProfile): Promise<UserProfile> => {
    const client = getClient();
    const encAccount = profile.bank_acc_no ? encryptBankAccount(profile.bank_acc_no) : null;

    if (client) {
      try {
        const insertPayload = {
          id: profile.id,
          role: profile.role,
          full_name: profile.full_name,
          mobile: profile.mobile,
          email: profile.email.toLowerCase(),
          password_hash: profile.password_hash || null,
          must_change_password: profile.must_change_password ?? false,
          email_verified: profile.email_verified ?? false,
          token_version: profile.token_version ?? 1,
          two_factor_enabled: profile.two_factor_enabled ?? false,
          two_factor_secret: profile.two_factor_secret || null,
          two_factor_recovery_codes: profile.two_factor_recovery_codes || null,
          bank_account_holder: profile.bank_account_holder || null,
          bank_acc_no_encrypted: encAccount,
          bank_name: profile.bank_name || null,
          bank_branch: profile.bank_branch || null,
          bank_ifsc: profile.bank_ifsc || null,
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || new Date().toISOString(),
        };

        const { data, error } = await client
          .from('profiles')
          .insert(insertPayload)
          .select('*')
          .single();

        if (error) {
          console.error('[DB] createUser error:', error.message);
        } else if (data) {
          return mapProfileFromDb(data);
        }
      } catch (err) {
        console.error('[DB] createUser exception:', err);
      }
    }

    memoryStore.profiles.push({ ...profile });
    return profile;
  },

  updateUser: async (id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> => {
    const client = getClient();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.full_name !== undefined) updatePayload.full_name = updates.full_name;
    if (updates.mobile !== undefined) updatePayload.mobile = updates.mobile;
    if (updates.email !== undefined) updatePayload.email = updates.email.toLowerCase();
    if (updates.role !== undefined) updatePayload.role = updates.role;
    if (updates.password_hash !== undefined) updatePayload.password_hash = updates.password_hash;
    if (updates.must_change_password !== undefined) updatePayload.must_change_password = updates.must_change_password;
    if (updates.email_verified !== undefined) updatePayload.email_verified = updates.email_verified;
    if (updates.token_version !== undefined) updatePayload.token_version = updates.token_version;
    if (updates.two_factor_enabled !== undefined) updatePayload.two_factor_enabled = updates.two_factor_enabled;
    if (updates.two_factor_secret !== undefined) updatePayload.two_factor_secret = updates.two_factor_secret;
    if (updates.two_factor_recovery_codes !== undefined) updatePayload.two_factor_recovery_codes = updates.two_factor_recovery_codes;
    if (updates.bank_account_holder !== undefined) updatePayload.bank_account_holder = updates.bank_account_holder;
    if (updates.bank_name !== undefined) updatePayload.bank_name = updates.bank_name;
    if (updates.bank_branch !== undefined) updatePayload.bank_branch = updates.bank_branch;
    if (updates.bank_ifsc !== undefined) updatePayload.bank_ifsc = updates.bank_ifsc;
    if (updates.bank_acc_no !== undefined) {
      updatePayload.bank_acc_no_encrypted = updates.bank_acc_no ? encryptBankAccount(updates.bank_acc_no) : null;
    }

    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .update(updatePayload)
          .eq('id', id)
          .select('*')
          .single();

        if (error) {
          console.error('[DB] updateUser error:', error.message);
        } else if (data) {
          return mapProfileFromDb(data);
        }
      } catch (err) {
        console.error('[DB] updateUser exception:', err);
      }
    }

    const idx = memoryStore.profiles.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    memoryStore.profiles[idx] = {
      ...memoryStore.profiles[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return { ...memoryStore.profiles[idx] };
  },

  listUsers: async (): Promise<UserProfile[]> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(mapProfileFromDb);
        }
      } catch (err) {
        console.error('[DB] listUsers exception:', err);
      }
    }

    return memoryStore.profiles.map((p) => ({ ...p }));
  },

  // --------------------------------------------------------------------------
  // Scholarships
  // --------------------------------------------------------------------------
  listScholarships: async (): Promise<Scholarship[]> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('scholarships')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as Scholarship[];
        }
      } catch (err) {
        console.error('[DB] listScholarships exception:', err);
      }
    }

    return memoryStore.scholarships.map((s) => ({ ...s }));
  },

  findScholarshipByCode: async (code: string): Promise<Scholarship | null> => {
    const client = getClient();
    const upper = code.trim().toUpperCase();

    if (client) {
      try {
        const { data, error } = await client
          .from('scholarships')
          .select('*')
          .eq('code', upper)
          .maybeSingle();

        if (!error && data) {
          return data as Scholarship;
        }
      } catch (err) {
        console.error('[DB] findScholarshipByCode exception:', err);
      }
    }

    const found = memoryStore.scholarships.find((s) => s.code.toUpperCase() === upper);
    return found ? { ...found } : null;
  },

  findScholarshipById: async (id: string): Promise<Scholarship | null> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('scholarships')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return data as Scholarship;
        }
      } catch (err) {
        console.error('[DB] findScholarshipById exception:', err);
      }
    }

    const found = memoryStore.scholarships.find((s) => s.id === id);
    return found ? { ...found } : null;
  },

  updateScholarship: async (id: string, updates: Partial<Scholarship>): Promise<Scholarship | null> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('scholarships')
          .update(updates)
          .eq('id', id)
          .select('*')
          .single();

        if (!error && data) {
          return data as Scholarship;
        }
      } catch (err) {
        console.error('[DB] updateScholarship exception:', err);
      }
    }

    const idx = memoryStore.scholarships.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    memoryStore.scholarships[idx] = { ...memoryStore.scholarships[idx], ...updates };
    return { ...memoryStore.scholarships[idx] };
  },

  // --------------------------------------------------------------------------
  // Cycles
  // --------------------------------------------------------------------------
  listCycles: async (): Promise<AcademicCycle[]> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('cycles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as AcademicCycle[];
        }
      } catch (err) {
        console.error('[DB] listCycles exception:', err);
      }
    }

    return memoryStore.cycles.map((c) => ({ ...c }));
  },

  findCycleById: async (id: string): Promise<AcademicCycle | null> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('cycles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return data as AcademicCycle;
        }
      } catch (err) {
        console.error('[DB] findCycleById exception:', err);
      }
    }

    const found = memoryStore.cycles.find((c) => c.id === id);
    return found ? { ...found } : null;
  },

  findActiveCycleForScholarship: async (scholarshipId: string): Promise<AcademicCycle | null> => {
    const client = getClient();
    const now = new Date().toISOString();

    if (client) {
      try {
        const { data, error } = await client
          .from('cycles')
          .select('*')
          .eq('scholarship_id', scholarshipId)
          .eq('status', 'open')
          .lte('opens_at', now)
          .gte('closes_at', now)
          .maybeSingle();

        if (!error && data) {
          return data as AcademicCycle;
        }
      } catch (err) {
        console.error('[DB] findActiveCycleForScholarship exception:', err);
      }
    }

    const found = memoryStore.cycles.find(
      (c) =>
        c.scholarship_id === scholarshipId &&
        c.status === 'open' &&
        c.opens_at <= now &&
        c.closes_at >= now
    );
    return found ? { ...found } : null;
  },

  updateCycle: async (id: string, updates: Partial<AcademicCycle>): Promise<AcademicCycle | null> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('cycles')
          .update(updates)
          .eq('id', id)
          .select('*')
          .single();

        if (!error && data) {
          return data as AcademicCycle;
        }
      } catch (err) {
        console.error('[DB] updateCycle exception:', err);
      }
    }

    const idx = memoryStore.cycles.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    memoryStore.cycles[idx] = { ...memoryStore.cycles[idx], ...updates };
    return { ...memoryStore.cycles[idx] };
  },

  createCycle: async (cycle: AcademicCycle): Promise<AcademicCycle> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('cycles')
          .insert(cycle)
          .select('*')
          .single();

        if (!error && data) {
          return data as AcademicCycle;
        }
      } catch (err) {
        console.error('[DB] createCycle exception:', err);
      }
    }

    memoryStore.cycles.push({ ...cycle });
    return cycle;
  },

  // --------------------------------------------------------------------------
  // Applications
  // --------------------------------------------------------------------------
  listApplications: async (): Promise<ApplicationRecord[]> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data as ApplicationRecord[];
        }
      } catch (err) {
        console.error('[DB] listApplications exception:', err);
      }
    }

    return memoryStore.applications.map((a) => ({ ...a }));
  },

  findApplicationById: async (id: string): Promise<ApplicationRecord | null> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('applications')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return data as ApplicationRecord;
        }
      } catch (err) {
        console.error('[DB] findApplicationById exception:', err);
      }
    }

    const found = memoryStore.applications.find((a) => a.id === id);
    return found ? { ...found } : null;
  },

  findApplicationByRefNo: async (refNo: string): Promise<ApplicationRecord | null> => {
    const client = getClient();
    const upper = refNo.trim().toUpperCase();

    if (client) {
      try {
        const { data, error } = await client
          .from('applications')
          .select('*')
          .eq('ref_no', upper)
          .maybeSingle();

        if (!error && data) {
          return data as ApplicationRecord;
        }
      } catch (err) {
        console.error('[DB] findApplicationByRefNo exception:', err);
      }
    }

    const found = memoryStore.applications.find((a) => a.ref_no.toUpperCase() === upper);
    return found ? { ...found } : null;
  },

  findApplicationForStudentInCycle: async (studentId: string, cycleId: string): Promise<ApplicationRecord | null> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('applications')
          .select('*')
          .eq('student_id', studentId)
          .eq('cycle_id', cycleId)
          .maybeSingle();

        if (!error && data) {
          return data as ApplicationRecord;
        }
      } catch (err) {
        console.error('[DB] findApplicationForStudentInCycle exception:', err);
      }
    }

    const found = memoryStore.applications.find(
      (a) => a.student_id === studentId && a.cycle_id === cycleId
    );
    return found ? { ...found } : null;
  },

  listApplicationsForStudent: async (studentId: string): Promise<ApplicationRecord[]> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('applications')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data as ApplicationRecord[];
        }
      } catch (err) {
        console.error('[DB] listApplicationsForStudent exception:', err);
      }
    }

    return memoryStore.applications
      .filter((a) => a.student_id === studentId)
      .map((a) => ({ ...a }));
  },

  createApplication: async (app: ApplicationRecord): Promise<ApplicationRecord> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('applications')
          .insert(app)
          .select('*')
          .single();

        if (!error && data) {
          return data as ApplicationRecord;
        }
      } catch (err) {
        console.error('[DB] createApplication exception:', err);
      }
    }

    memoryStore.applications.push({ ...app });
    return app;
  },

  updateApplication: async (id: string, updates: Partial<ApplicationRecord>): Promise<ApplicationRecord | null> => {
    const client = getClient();
    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (client) {
      try {
        const { data, error } = await client
          .from('applications')
          .update(updatePayload)
          .eq('id', id)
          .select('*')
          .single();

        if (!error && data) {
          return data as ApplicationRecord;
        }
      } catch (err) {
        console.error('[DB] updateApplication exception:', err);
      }
    }

    const idx = memoryStore.applications.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    memoryStore.applications[idx] = {
      ...memoryStore.applications[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return { ...memoryStore.applications[idx] };
  },

  // --------------------------------------------------------------------------
  // Files
  // --------------------------------------------------------------------------
  listFilesForApplication: async (applicationId: string): Promise<ApplicationFileRecord[]> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('application_files')
          .select('*')
          .eq('application_id', applicationId)
          .order('uploaded_at', { ascending: true });

        if (!error && data) {
          return data as ApplicationFileRecord[];
        }
      } catch (err) {
        console.error('[DB] listFilesForApplication exception:', err);
      }
    }

    return memoryStore.application_files
      .filter((f) => f.application_id === applicationId)
      .map((f) => ({ ...f }));
  },

  findFileById: async (id: string): Promise<ApplicationFileRecord | null> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('application_files')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return data as ApplicationFileRecord;
        }
      } catch (err) {
        console.error('[DB] findFileById exception:', err);
      }
    }

    const found = memoryStore.application_files.find((f) => f.id === id);
    return found ? { ...found } : null;
  },

  saveFileRecord: async (file: ApplicationFileRecord): Promise<ApplicationFileRecord> => {
    const client = getClient();
    if (client) {
      try {
        // Delete any existing file for this application and kind first
        await client
          .from('application_files')
          .delete()
          .eq('application_id', file.application_id)
          .eq('kind', file.kind);

        const { data, error } = await client
          .from('application_files')
          .insert(file)
          .select('*')
          .single();

        if (!error && data) {
          return data as ApplicationFileRecord;
        }
      } catch (err) {
        console.error('[DB] saveFileRecord exception:', err);
      }
    }

    memoryStore.application_files = memoryStore.application_files.filter(
      (f) => !(f.application_id === file.application_id && f.kind === file.kind)
    );
    memoryStore.application_files.push({ ...file });
    return file;
  },

  // --------------------------------------------------------------------------
  // Remarks
  // --------------------------------------------------------------------------
  listRemarksForApplication: async (applicationId: string): Promise<RemarkRecord[]> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('remarks')
          .select('*')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          return data as RemarkRecord[];
        }
      } catch (err) {
        console.error('[DB] listRemarksForApplication exception:', err);
      }
    }

    return memoryStore.remarks
      .filter((r) => r.application_id === applicationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((r) => ({ ...r }));
  },

  addRemark: async (remark: RemarkRecord): Promise<RemarkRecord> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('remarks')
          .insert(remark)
          .select('*')
          .single();

        if (!error && data) {
          return data as RemarkRecord;
        }
      } catch (err) {
        console.error('[DB] addRemark exception:', err);
      }
    }

    memoryStore.remarks.push({ ...remark });
    return remark;
  },

  // --------------------------------------------------------------------------
  // Audit Log (Immutable, append-only)
  // --------------------------------------------------------------------------
  listAuditLogs: async (): Promise<AuditRecord[]> => {
    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data as AuditRecord[];
        }
      } catch (err) {
        console.error('[DB] listAuditLogs exception:', err);
      }
    }

    return [...memoryStore.audit_logs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((a) => ({ ...a }));
  },

  logAudit: async (record: Omit<AuditRecord, 'id' | 'created_at'>): Promise<AuditRecord> => {
    const fullRecord: AuditRecord = {
      ...record,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const client = getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('audit_log')
          .insert(fullRecord)
          .select('*')
          .single();

        if (!error && data) {
          return data as AuditRecord;
        }
      } catch (err) {
        console.error('[DB] logAudit exception:', err);
      }
    }

    memoryStore.audit_logs.push(fullRecord);
    return fullRecord;
  },
};

// Named exports for convenient direct imports
export const findUserById = (id: string) => db.findUserById(id);
export const findUserByEmail = (email: string) => db.findUserByEmail(email);
export const listScholarships = () => db.listScholarships();
export const findScholarshipByCode = (code: string) => db.findScholarshipByCode(code);
export const listCycles = () => db.listCycles();
export const listApplications = () => db.listApplications();
