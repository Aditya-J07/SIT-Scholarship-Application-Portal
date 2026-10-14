import { createClient } from "@/utils/supabase/server";
import { db } from "../db";
import { UserRole } from "../types";

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  mustChangePassword: boolean;
  bank_acc_last4?: string;
  exp?: number;
}

/**
 * Validates the current session using Supabase Auth (via Next.js cookies)
 * and retrieves the verified, live profile and role directly from the PostgreSQL profiles table.
 * Roles are strictly database-controlled; never read from client tokens or user_metadata.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Always fetch live profile from Postgres using the verified user ID
    const profile = await db.findUserById(user.id);
    if (!profile) {
      // If profile has not yet finished creating (race condition on signup), default safely to student
      return {
        userId: user.id,
        email: user.email || "",
        role: "student",
        fullName: "",
        mustChangePassword: false,
      };
    }

    return {
      userId: user.id,
      email: profile.email || user.email || "",
      role: profile.role, // Always use live role from PostgreSQL profiles.role
      fullName: profile.full_name,
      mustChangePassword: profile.must_change_password ?? false,
      bank_acc_last4: profile.bank_acc_last4,
    };
  } catch {
    return null;
  }
}
