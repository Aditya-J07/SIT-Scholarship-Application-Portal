import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { db } from "@/lib/db";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { z } from "zod";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(10, "New password must be at least 10 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request parameters" },
        { status: 400 }
      );
    }

    const { newPassword, confirmPassword } = parsed.data;

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match" },
        { status: 400 }
      );
    }

    // Enforce password policy
    const policyResult = validatePasswordStrength(newPassword, {
      email: session.email,
      fullName: session.fullName,
    });
    if (!policyResult.valid) {
      return NextResponse.json({ error: policyResult.error }, { status: 400 });
    }

    // Update password in Supabase Auth
    const supabase = await createClient();
    const { error: updateAuthError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateAuthError) {
      // Fallback to admin auth API if needed
      const admin = getAdminClient();
      const { error: adminUpdateError } = await admin.auth.admin.updateUserById(
        session.userId,
        { password: newPassword }
      );
      if (adminUpdateError) {
        return NextResponse.json(
          { error: adminUpdateError.message || "Failed to update password" },
          { status: 400 }
        );
      }
    }

    // Clear must_change_password flag in profiles table
    await db.updateUser(session.userId, {
      must_change_password: false,
    });

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: "PASSWORD_CHANGED",
      entity: "profiles",
      entity_id: session.userId,
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error: unknown) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred while updating password" },
      { status: 500 }
    );
  }
}
