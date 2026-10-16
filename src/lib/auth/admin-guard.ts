import { NextResponse } from "next/server";
import { getCurrentSession, SessionPayload } from "./session";
import { createClient } from "@/utils/supabase/server";
import { db } from "../db";

/**
 * Shared administrative guard for all /api/admin/* endpoints and staff workflows.
 * Enforces:
 * 1. Active authenticated session.
 * 2. Role authorization (admin or reviewer).
 * 3. must_change_password compliance.
 * 4. TOTP Authenticator Assurance Level (aal2) verification.
 */
export async function requireAdminSession(options?: {
  allowReviewer?: boolean;
  requireAal2?: boolean;
}): Promise<{ session: SessionPayload; errorResponse: null } | { session: null; errorResponse: NextResponse }> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: { message: "Authentication required" } },
        { status: 401 }
      ),
    };
  }

  // Enforce staff role
  const allowedRoles = options?.allowReviewer ? ["admin", "reviewer"] : ["admin"];
  if (!allowedRoles.includes(session.role)) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: { message: "Administrative or reviewer privileges required." } },
        { status: 403 }
      ),
    };
  }

  // Enforce must_change_password
  if (session.mustChangePassword) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        {
          code: "PASSWORD_CHANGE_REQUIRED",
          error: { message: "Password change is required before accessing administrative features." },
        },
        { status: 403 }
      ),
    };
  }

  // Enforce 30-minute server-side idle timeout for staff accounts
  if (session.last_seen_at) {
    const lastSeenMs = new Date(session.last_seen_at).getTime();
    const idleMinutes = (Date.now() - lastSeenMs) / (1000 * 60);
    if (idleMinutes > 30) {
      try {
        const supabase = await createClient();
        await supabase.auth.signOut();
      } catch {
        // Continue
      }
      return {
        session: null,
        errorResponse: NextResponse.json(
          {
            code: "IDLE_TIMEOUT",
            error: {
              message: "Staff session timed out due to 30 minutes of inactivity. Please log in again.",
            },
          },
          { status: 401 }
        ),
      };
    }
  }

  // Update staff last_seen timestamp on valid active request
  await db.updateStaffLastSeen(session.userId);

  // Enforce TOTP MFA (aal2) for staff accounts
  const enforceMfa = options?.requireAal2 ?? true;
  if (enforceMfa && session.aal !== "aal2") {
    let hasFactors = false;
    try {
      const supabase = await createClient();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.filter((f: { status: string }) => f.status === "verified") || [];
      hasFactors = verified.length > 0;
    } catch {
      hasFactors = false;
    }

    return {
      session: null,
      errorResponse: NextResponse.json(
        {
          code: hasFactors ? "MFA_REQUIRED" : "MFA_ENROLLMENT_REQUIRED",
          error: {
            message: hasFactors
              ? "Multi-factor authentication (TOTP) verification is required for staff access."
              : "TOTP MFA enrollment is required before accessing staff features.",
          },
          enrolled: hasFactors,
          redirect: hasFactors ? "/admin-login/mfa" : "/admin-login/mfa?mode=enroll",
        },
        { status: 403 }
      ),
    };
  }

  return { session, errorResponse: null };
}

export async function requireAdmin(): Promise<
  { session: SessionPayload; errorResponse: null } | { session: null; errorResponse: NextResponse }
> {
  return requireAdminSession({ allowReviewer: false, requireAal2: true });
}

export async function requireAdminOrReviewer(): Promise<
  { session: SessionPayload; errorResponse: null } | { session: null; errorResponse: NextResponse }
> {
  return requireAdminSession({ allowReviewer: true, requireAal2: true });
}

