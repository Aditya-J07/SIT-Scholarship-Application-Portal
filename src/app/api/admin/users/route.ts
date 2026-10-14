import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getAdminClient } from "@/utils/supabase/admin";
import { db } from "@/lib/db";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { UserRole } from "@/lib/types";

const ALLOWED_ROLES = new Set<UserRole>(["student", "reviewer", "admin"]);

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 403 });
  }

  const usersList = await db.listUsers();
  const users = usersList.map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    mobile: u.mobile,
    role: u.role,
    must_change_password: Boolean(u.must_change_password),
    created_at: u.created_at,
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json(
      { error: { message: "Only Admin can create staff accounts" } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { full_name, email, mobile, password, role } = body;

    if (!full_name || !email || !password || !role) {
      return NextResponse.json(
        { error: { message: "All fields are required" } },
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

    // Enforce institutional password policy
    const policyResult = validatePasswordStrength(password, {
      email: normalizedEmail,
      fullName: full_name,
    });
    if (!policyResult.valid) {
      return NextResponse.json({ error: { message: policyResult.error } }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.findUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json(
        { error: { message: "A user with this email already exists" } },
        { status: 409 }
      );
    }

    // Use Supabase Admin Auth API to create confirmed user
    const adminSupabase = getAdminClient();
    const { data: authData, error: createAuthError } =
      await adminSupabase.auth.admin.createUser({
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

    // Create profile in PostgreSQL profiles table
    const newProfile = await db.createUser({
      id: authData.user.id,
      role,
      full_name: full_name.trim().toUpperCase(),
      email: normalizedEmail,
      mobile: mobile?.trim() || "",
      must_change_password: true, // Forces password change upon first staff login
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: "USER_ACCOUNT_CREATED",
      entity: "profiles",
      entity_id: newProfile.id,
      meta: { role: newProfile.role, email: newProfile.email, must_change_password: true },
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newProfile.id,
        full_name: newProfile.full_name,
        email: newProfile.email,
        role: newProfile.role,
        must_change_password: newProfile.must_change_password,
      },
    });
  } catch (error: unknown) {
    console.error("Admin create user error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create user account" } },
      { status: 500 }
    );
  }
}
