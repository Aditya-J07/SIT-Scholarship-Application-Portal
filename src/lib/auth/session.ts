import { NextResponse } from "next/server";
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
  aal?: "aal1" | "aal2";
  last_seen_at?: string;
  exp?: number;
}

/**
 * Validates the current session using Supabase Auth (via Next.js cookies)
 * and retrieves the verified, live profile and role directly from the PostgreSQL profiles table.
 * Roles are strictly database-controlled; never read from client tokens or user_metadata.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  if (process.env.NODE_ENV !== "production" && (globalThis as any).__testSessionOverride) {
    const override = (globalThis as any).__testSessionOverride;
    return override;
  }

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

    let aal: "aal1" | "aal2" = "aal1";
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal2") {
        aal = "aal2";
      }
    } catch {
      aal = "aal1";
    }

    return {
      userId: user.id,
      email: profile.email || user.email || "",
      role: profile.role, // Always use live role from PostgreSQL profiles.role
      fullName: profile.full_name,
      mustChangePassword: profile.must_change_password ?? false,
      bank_acc_last4: profile.bank_acc_last4,
      aal,
      last_seen_at: profile.last_seen_at,
    };
  } catch {
    return null;
  }
}

/**
 * Enforces staff security requirements:
 * 1. 30-minute idle session timeout via last_seen_at (returns 401 IDLE_TIMEOUT)
 * 2. Authenticator Assurance Level 2 (TOTP verified) (returns 403 MFA_REQUIRED)
 * Returns null if compliant or if caller is a student.
 */
export function enforceStaffSession(session: SessionPayload): NextResponse | null {
  if (session.role === "admin" || session.role === "reviewer") {
    // 1. Enforce 30-minute server-side idle timeout for staff accounts
    if (session.last_seen_at) {
      const lastSeenMs = new Date(session.last_seen_at).getTime();
      const idleMinutes = (Date.now() - lastSeenMs) / (1000 * 60);
      if (idleMinutes > 30) {
        return NextResponse.json(
          {
            code: "IDLE_TIMEOUT",
            error: {
              message: "Staff session timed out due to 30 minutes of inactivity. Please log in again.",
            },
          },
          { status: 401 }
        );
      }
    }

    // 2. Enforce TOTP MFA (aal2) for staff accounts: staff at aal1 get zero student or admin data
    if (session.aal !== "aal2") {
      return NextResponse.json(
        {
          code: "MFA_REQUIRED",
          error: {
            message: "Multi-factor authentication (TOTP) verification is required for staff access.",
          },
        },
        { status: 403 }
      );
    }
  }

  return null;
}

/**
 * Shared session helper for all protected routes (student & staff).
 * Validates the session, enforces staff idle & aal2 constraints,
 * and updates staff last_seen_at timestamp on active requests.
 */
export async function getAuthorizedSession(): Promise<
  { session: SessionPayload; errorResponse: null } | { session: null; errorResponse: NextResponse }
> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: { message: "Unauthorized" } },
        { status: 401 }
      ),
    };
  }

  const staffSecurityError = enforceStaffSession(session);
  if (staffSecurityError) {
    return { session: null, errorResponse: staffSecurityError };
  }

  // Update staff last_seen timestamp on valid active request
  if (session.role === "admin" || session.role === "reviewer") {
    try {
      await db.updateStaffLastSeen(session.userId);
    } catch {
      // Non-fatal if DB activity write fails
    }
  }

  return { session, errorResponse: null };
}

/**
 * Returns a 403 response if mustChangePassword is true, or null if compliant.
 * Can be used by API routes to enforce password changes server-side.
 */
export function assertPasswordChanged(session: SessionPayload): NextResponse | null {
  if (session.mustChangePassword) {
    return NextResponse.json(
      {
        code: "PASSWORD_CHANGE_REQUIRED",
        error: { message: "Password change is required before accessing portal features." },
      },
      { status: 403 }
    );
  }
  return null;
}
