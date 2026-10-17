import { NextResponse } from "next/server";
import { getAuthorizedSession, SessionPayload } from "./session";

/**
 * Shared administrative guard for all /api/admin/* endpoints and staff workflows.
 * Enforces:
 * 1. Active authenticated session.
 * 2. 30-minute idle timeout & aal2 MFA verification (via shared getAuthorizedSession).
 * 3. Role authorization (admin or reviewer).
 * 4. must_change_password compliance.
 */
export async function requireAdminSession(options?: {
  allowReviewer?: boolean;
  requireAal2?: boolean;
}): Promise<{ session: SessionPayload; errorResponse: null } | { session: null; errorResponse: NextResponse }> {
  const { session, errorResponse } = await getAuthorizedSession();
  if (errorResponse) {
    return { session: null, errorResponse };
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

/**
 * Evaluates whether a reviewer with an assigned department has permission to access
 * an application based on the student's enrolled course / branch.
 * If reviewerDept is unset, unrestricted access is granted (e.g. for general staff / admins).
 */
export function canReviewerAccessDepartment(reviewerDept?: string, studentCourse?: string): boolean {
  if (!reviewerDept || !reviewerDept.trim()) return true;
  const sCourse = (studentCourse || '').trim().toLowerCase();
  const rDept = reviewerDept.trim().toLowerCase();
  if (!sCourse) return false;
  if (sCourse.includes(rDept) || rDept.includes(sCourse)) return true;

  // Filter significant keywords (length >= 3, excluding generic academic terms)
  const stopWords = new Set(['and', '&', 'of', 'in', 'the', 'engineering', 'department', 'dept', 'b.e.', 'be', 'btech', 'mtech']);
  const deptKeywords = rDept.split(/[\s,./\-_]+/).filter((w) => w.length >= 3 && !stopWords.has(w));
  if (deptKeywords.length > 0 && deptKeywords.every((kw) => sCourse.includes(kw))) {
    return true;
  }
  return false;
}
