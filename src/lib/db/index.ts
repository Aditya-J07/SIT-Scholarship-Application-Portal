import crypto from "crypto";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  UserProfile,
  Scholarship,
  AcademicCycle,
  ApplicationRecord,
  ApplicationFileRecord,
  RemarkRecord,
  AuditRecord,
} from "../types";
import {
  encryptBankAccount,
  decryptBankAccount,
  getBankAccLast4,
} from "../crypto/field-encryption";

import { generateUnambiguousRefNo } from "../crypto/ref-no";
export { generateUnambiguousRefNo };

function mapProfileFromDb(row: Record<string, unknown>): UserProfile {
  let plainBankAcc: string | undefined = undefined;
  if (row.bank_acc_no_encrypted) {
    try {
      plainBankAcc = decryptBankAccount(String(row.bank_acc_no_encrypted));
    } catch {
      plainBankAcc = undefined;
    }
  }

  const last4 = row.bank_acc_last4
    ? String(row.bank_acc_last4)
    : plainBankAcc
    ? getBankAccLast4(plainBankAcc)
    : undefined;

  return {
    id: String(row.id),
    role: row.role as UserProfile["role"],
    full_name: String(row.full_name || ""),
    mobile: String(row.mobile || ""),
    email: String(row.email || ""),
    must_change_password: Boolean(row.must_change_password),
    bank_account_holder: row.bank_account_holder ? String(row.bank_account_holder) : undefined,
    bank_acc_no: plainBankAcc,
    bank_acc_last4: last4,
    bank_name: row.bank_name ? String(row.bank_name) : undefined,
    bank_branch: row.bank_branch ? String(row.bank_branch) : undefined,
    bank_ifsc: row.bank_ifsc ? String(row.bank_ifsc) : undefined,
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

function getSafeClient() {
  try {
    return getAdminClient();
  } catch {
    return null;
  }
}

export const db = {
  // --------------------------------------------------------------------------
  // Profiles / Users
  // --------------------------------------------------------------------------
  findUserByEmail: async (email: string): Promise<UserProfile | null> => {
    const supabase = getSafeClient();
    if (!supabase) return null;
    const normalized = email.trim().toLowerCase();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", normalized)
      .maybeSingle();

    if (error) {
      console.error("[DB] findUserByEmail error:", error.message);
      return null;
    }
    return data ? mapProfileFromDb(data) : null;
  },

  findUserById: async (id: string): Promise<UserProfile | null> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[DB] findUserById error:", error.message);
      return null;
    }
    return data ? mapProfileFromDb(data) : null;
  },

  createUser: async (profile: UserProfile): Promise<UserProfile> => {
    const supabase = getAdminClient();
    const encAccount = profile.bank_acc_no ? encryptBankAccount(profile.bank_acc_no) : null;
    const last4 = profile.bank_acc_no ? getBankAccLast4(profile.bank_acc_no) : null;

    const insertPayload = {
      id: profile.id,
      role: profile.role,
      full_name: profile.full_name,
      mobile: profile.mobile,
      email: profile.email.toLowerCase(),
      must_change_password: profile.must_change_password ?? false,
      bank_account_holder: profile.bank_account_holder || null,
      bank_acc_no_encrypted: encAccount,
      bank_acc_last4: last4,
      bank_name: profile.bank_name || null,
      bank_branch: profile.bank_branch || null,
      bank_ifsc: profile.bank_ifsc || null,
      created_at: profile.created_at || new Date().toISOString(),
      updated_at: profile.updated_at || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("[DB] createUser error:", error.message);
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    return mapProfileFromDb(data);
  },

  updateUser: async (id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> => {
    const supabase = getAdminClient();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.full_name !== undefined) updatePayload.full_name = updates.full_name;
    if (updates.mobile !== undefined) updatePayload.mobile = updates.mobile;
    if (updates.email !== undefined) updatePayload.email = updates.email.toLowerCase();
    if (updates.role !== undefined) updatePayload.role = updates.role;
    if (updates.must_change_password !== undefined)
      updatePayload.must_change_password = updates.must_change_password;
    if (updates.bank_account_holder !== undefined)
      updatePayload.bank_account_holder = updates.bank_account_holder;
    if (updates.bank_name !== undefined) updatePayload.bank_name = updates.bank_name;
    if (updates.bank_branch !== undefined) updatePayload.bank_branch = updates.bank_branch;
    if (updates.bank_ifsc !== undefined) updatePayload.bank_ifsc = updates.bank_ifsc;
    if (updates.bank_acc_no !== undefined) {
      updatePayload.bank_acc_no_encrypted = updates.bank_acc_no
        ? encryptBankAccount(updates.bank_acc_no)
        : null;
      updatePayload.bank_acc_last4 = updates.bank_acc_no
        ? getBankAccLast4(updates.bank_acc_no)
        : null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[DB] updateUser error:", error.message);
      return null;
    }

    return mapProfileFromDb(data);
  },

  listUsers: async (): Promise<UserProfile[]> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DB] listUsers error:", error.message);
      return [];
    }

    return (data || []).map(mapProfileFromDb);
  },

  // --------------------------------------------------------------------------
  // Scholarships
  // --------------------------------------------------------------------------
  listScholarships: async (): Promise<Scholarship[]> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("scholarships")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[DB] listScholarships error:", error.message);
      return [];
    }

    return (data || []) as Scholarship[];
  },

  findScholarshipByCode: async (code: string): Promise<Scholarship | null> => {
    const supabase = getAdminClient();
    const upper = code.trim().toUpperCase();

    const { data, error } = await supabase
      .from("scholarships")
      .select("*")
      .eq("code", upper)
      .maybeSingle();

    if (error) {
      console.error("[DB] findScholarshipByCode error:", error.message);
      return null;
    }

    return (data as Scholarship) || null;
  },

  findScholarshipById: async (id: string): Promise<Scholarship | null> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("scholarships")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[DB] findScholarshipById error:", error.message);
      return null;
    }

    return (data as Scholarship) || null;
  },

  updateScholarship: async (
    id: string,
    updates: Partial<Scholarship>
  ): Promise<Scholarship | null> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("scholarships")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[DB] updateScholarship error:", error.message);
      return null;
    }

    return (data as Scholarship) || null;
  },

  // --------------------------------------------------------------------------
  // Cycles
  // --------------------------------------------------------------------------
  listCycles: async (): Promise<AcademicCycle[]> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("cycles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DB] listCycles error:", error.message);
      return [];
    }

    return (data || []) as AcademicCycle[];
  },

  findCycleById: async (id: string): Promise<AcademicCycle | null> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("cycles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[DB] findCycleById error:", error.message);
      return null;
    }

    return (data as AcademicCycle) || null;
  },

  findActiveCycleForScholarship: async (scholarshipId: string): Promise<AcademicCycle | null> => {
    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("cycles")
      .select("*")
      .eq("scholarship_id", scholarshipId)
      .eq("status", "open")
      .lte("opens_at", now)
      .gte("closes_at", now)
      .maybeSingle();

    if (error) {
      console.error("[DB] findActiveCycleForScholarship error:", error.message);
      return null;
    }

    return (data as AcademicCycle) || null;
  },

  updateCycle: async (
    id: string,
    updates: Partial<AcademicCycle>
  ): Promise<AcademicCycle | null> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("cycles")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[DB] updateCycle error:", error.message);
      return null;
    }

    return (data as AcademicCycle) || null;
  },

  createCycle: async (cycle: AcademicCycle): Promise<AcademicCycle> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("cycles")
      .insert(cycle)
      .select("*")
      .single();

    if (error) {
      console.error("[DB] createCycle error:", error.message);
      throw new Error(`Failed to create cycle: ${error.message}`);
    }

    return data as AcademicCycle;
  },

  // --------------------------------------------------------------------------
  // Applications
  // --------------------------------------------------------------------------
  listApplications: async (): Promise<ApplicationRecord[]> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DB] listApplications error:", error.message);
      return [];
    }

    return (data || []) as ApplicationRecord[];
  },

  findApplicationById: async (id: string): Promise<ApplicationRecord | null> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[DB] findApplicationById error:", error.message);
      return null;
    }

    return (data as ApplicationRecord) || null;
  },

  findApplicationByRefNo: async (refNo: string): Promise<ApplicationRecord | null> => {
    const supabase = getAdminClient();
    const upper = refNo.trim().toUpperCase();

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("ref_no", upper)
      .maybeSingle();

    if (error) {
      console.error("[DB] findApplicationByRefNo error:", error.message);
      return null;
    }

    return (data as ApplicationRecord) || null;
  },

  findApplicationForStudentInCycle: async (
    studentId: string,
    cycleId: string
  ): Promise<ApplicationRecord | null> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("student_id", studentId)
      .eq("cycle_id", cycleId)
      .maybeSingle();

    if (error) {
      console.error("[DB] findApplicationForStudentInCycle error:", error.message);
      return null;
    }

    return (data as ApplicationRecord) || null;
  },

  listApplicationsForStudent: async (studentId: string): Promise<ApplicationRecord[]> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DB] listApplicationsForStudent error:", error.message);
      return [];
    }

    return (data || []) as ApplicationRecord[];
  },

  createApplication: async (app: ApplicationRecord): Promise<ApplicationRecord> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("applications")
      .insert(app)
      .select("*")
      .single();

    if (error) {
      console.error("[DB] createApplication error:", error.message);
      throw new Error(`Failed to create application: ${error.message}`);
    }

    return data as ApplicationRecord;
  },

  /**
   * Updates application with optional concurrency/conflict check.
   * If expectedUpdatedAt is provided, only updates if updated_at matches.
   */
  updateApplication: async (
    id: string,
    updates: Partial<ApplicationRecord>,
    expectedUpdatedAt?: string
  ): Promise<ApplicationRecord | null> => {
    const supabase = getAdminClient();
    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    let query = supabase
      .from("applications")
      .update(updatePayload)
      .eq("id", id);

    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data, error } = await query.select("*").maybeSingle();

    if (error) {
      console.error("[DB] updateApplication error:", error.message);
      return null;
    }

    return (data as ApplicationRecord) || null;
  },

  /**
   * Idempotent submit: Status changes to 'submitted' strictly where current status is 'draft' or 'needs_correction'.
   * Double submissions safely return null / conflict without duplicating state.
   */
  submitApplication: async (
    id: string,
    updates: Partial<ApplicationRecord>
  ): Promise<ApplicationRecord | null> => {
    const supabase = getAdminClient();
    const updatePayload = {
      ...updates,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("applications")
      .update(updatePayload)
      .eq("id", id)
      .in("status", ["draft", "needs_correction"])
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[DB] submitApplication error:", error.message);
      throw error;
    }

    return (data as ApplicationRecord) || null;
  },

  // --------------------------------------------------------------------------
  // Files
  // --------------------------------------------------------------------------
  listFilesForApplication: async (applicationId: string): Promise<ApplicationFileRecord[]> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("application_files")
      .select("*")
      .eq("application_id", applicationId)
      .order("uploaded_at", { ascending: true });

    if (error) {
      console.error("[DB] listFilesForApplication error:", error.message);
      return [];
    }

    return (data || []) as ApplicationFileRecord[];
  },

  findFileById: async (id: string): Promise<ApplicationFileRecord | null> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("application_files")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[DB] findFileById error:", error.message);
      return null;
    }

    return (data as ApplicationFileRecord) || null;
  },

  saveFileRecord: async (file: ApplicationFileRecord): Promise<ApplicationFileRecord> => {
    const supabase = getAdminClient();

    // Upsert or replace existing file record for this application and kind
    await supabase
      .from("application_files")
      .delete()
      .eq("application_id", file.application_id)
      .eq("kind", file.kind);

    const { data, error } = await supabase
      .from("application_files")
      .insert(file)
      .select("*")
      .single();

    if (error) {
      console.error("[DB] saveFileRecord error:", error.message);
      throw new Error(`Failed to save file record: ${error.message}`);
    }

    return data as ApplicationFileRecord;
  },

  // --------------------------------------------------------------------------
  // Remarks
  // --------------------------------------------------------------------------
  listRemarksForApplication: async (applicationId: string): Promise<RemarkRecord[]> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("remarks")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[DB] listRemarksForApplication error:", error.message);
      return [];
    }

    return (data || []) as RemarkRecord[];
  },

  addRemark: async (remark: RemarkRecord): Promise<RemarkRecord> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("remarks")
      .insert(remark)
      .select("*")
      .single();

    if (error) {
      console.error("[DB] addRemark error:", error.message);
      throw new Error(`Failed to add remark: ${error.message}`);
    }

    return data as RemarkRecord;
  },

  // --------------------------------------------------------------------------
  // Audit Log (Immutable, append-only)
  // --------------------------------------------------------------------------
  listAuditLogs: async (): Promise<AuditRecord[]> => {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DB] listAuditLogs error:", error.message);
      return [];
    }

    return (data || []) as AuditRecord[];
  },

  logAudit: async (record: Omit<AuditRecord, "id" | "created_at">): Promise<AuditRecord> => {
    const supabase = getAdminClient();
    const fullRecord: AuditRecord = {
      ...record,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("audit_log")
      .insert(fullRecord)
      .select("*")
      .single();

    if (error) {
      console.error("[DB] logAudit error:", error.message);
      // Return fullRecord even on logging failure so operation is not completely halted
      return fullRecord;
    }

    return (data as AuditRecord) || fullRecord;
  },
};

// Named exports for convenient direct imports
export const findUserById = (id: string) => db.findUserById(id);
export const findUserByEmail = (email: string) => db.findUserByEmail(email);
export const listScholarships = () => db.listScholarships();
export const findScholarshipByCode = (code: string) => db.findScholarshipByCode(code);
export const listCycles = () => db.listCycles();
export const listApplications = () => db.listApplications();
