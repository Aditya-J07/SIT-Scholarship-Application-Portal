import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-guard";
import { db } from "@/lib/db";
import { getAdminClient } from "@/utils/supabase/admin";
import { getClientIp } from "@/lib/rate-limit";
import { normalizeDepartment } from "@/lib/constants/departments";

const ALLOWED_ROLES = new Set(["student", "reviewer", "admin"]);

export async function GET(_request?: Request) {
  const { errorResponse } = await requireAdminSession({ allowReviewer: false, requireAal2: true });
  if (errorResponse) return errorResponse;

  try {
    const users = await db.listUsers();
    return NextResponse.json({ users });
  } catch (err: unknown) {
    console.error("List users error:", err);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { session, errorResponse } = await requireAdminSession({ allowReviewer: false, requireAal2: true });
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { full_name, email, mobile, role, department } = body;

    if (!full_name || !email || !role) {
      return NextResponse.json(
        { error: { message: "Full name, email, and role are required" } },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { error: { message: "Role must be student, reviewer, or admin" } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await db.findUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json(
        { error: { message: "A user with this email already exists" } },
        { status: 409 }
      );
    }

    let normDept: string | null = null;
    if (role === "reviewer") {
      if (!department) {
        return NextResponse.json(
          { error: { message: "Department is required for reviewer accounts" } },
          { status: 400 }
        );
      }
      normDept = normalizeDepartment(department);
      if (!normDept) {
        return NextResponse.json(
          { error: { message: "Invalid department. Must be one of the recognized SIT departments." } },
          { status: 400 }
        );
      }
    }

    const adminSupabase = getAdminClient();
    let authUserId: string;

    // Phase 3c Item 5: Use Supabase inviteUserByEmail for staff accounts (admin, reviewer)
    // so the person sets their own password.
    if (role === "admin" || role === "reviewer") {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const { data: authData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          redirectTo: `${siteUrl}/reset-password`,
          data: {
            full_name: full_name.trim().toUpperCase(),
            role,
            department: normDept || undefined,
          },
        }
      );

      if (inviteError || !authData.user) {
        return NextResponse.json(
          { error: { message: inviteError?.message || "Failed to send staff invitation email" } },
          { status: 400 }
        );
      }
      authUserId = authData.user.id;
    } else {
      // Student accounts created with standard password
      const password = body.password;
      if (!password) {
        return NextResponse.json(
          { error: { message: "Password is required for student accounts" } },
          { status: 400 }
        );
      }
      const { data: authData, error: createAuthError } = await adminSupabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
      });

      if (createAuthError || !authData.user) {
        return NextResponse.json(
          { error: { message: createAuthError?.message || "Failed to create user account" } },
          { status: 400 }
        );
      }
      authUserId = authData.user.id;
    }

    // Create profile in PostgreSQL profiles table
    // must_change_password is kept ONLY for the bootstrap admin created by the script (Item 5)
    const newProfile = await db.createUser({
      id: authUserId,
      role,
      full_name: full_name.trim().toUpperCase(),
      email: normalizedEmail,
      mobile: mobile?.trim() || "",
      department: normDept || undefined,
      must_change_password: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const clientIp = getClientIp(request);

    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: role === "student" ? "USER_ACCOUNT_CREATED" : "STAFF_INVITED_BY_EMAIL",
      entity: "profiles",
      entity_id: newProfile.id,
      meta: {
        role: newProfile.role,
        email: newProfile.email,
        department: newProfile.department,
        invited: role === "admin" || role === "reviewer",
      },
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newProfile.id,
        full_name: newProfile.full_name,
        email: newProfile.email,
        role: newProfile.role,
        department: newProfile.department,
      },
    });
  } catch (err: unknown) {
    console.error("Create/Invite user error:", err);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
