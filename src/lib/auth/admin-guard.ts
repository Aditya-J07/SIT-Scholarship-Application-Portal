import { NextResponse } from "next/server";
import { getCurrentSession, SessionPayload } from "./session";

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

  // Enforce TOTP MFA (aal2) for staff accounts
  const enforceMfa = options?.requireAal2 ?? true;
  if (enforceMfa && session.aal !== "aal2") {
    // In production or when ENFORCE_MFA is enabled, reject any staff request without verified aal2
    if (process.env.NODE_ENV === "production" || process.env.ENFORCE_MFA === "true") {
      return {
        session: null,
        errorResponse: NextResponse.json(
          {
            code: "MFA_REQUIRED",
            error: { message: "Multi-factor authentication (TOTP) verification is required for staff access." },
          },
          { status: 403 }
        ),
      };
    }
  }

  return { session, errorResponse: null };
}
