import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSession } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { verifyStateChangingOrigin } from "@/lib/auth/origin-guard";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(10, "New password must be at least 10 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .strict();

export async function POST(req: NextRequest) {
  // 1. CSRF Origin Verification
  const originErr = verifyStateChangingOrigin(req);
  if (originErr) return originErr;

  const clientIp = getClientIp(req);

  try {
    const { session, errorResponse } = await getAuthorizedSession({ allowMustChangePassword: true });
    if (errorResponse) return errorResponse;

    // Rate limiting: 5 password changes per 15 minutes per user
    const rateLimit = await checkRateLimit(`change_pwd:user:${session.userId}`, 900, 5);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request parameters" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword, confirmPassword } = parsed.data;

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match" },
        { status: 400 }
      );
    }

    // Require current password for voluntary changes (not required if mustChangePassword is true)
    if (!session.mustChangePassword) {
      if (!currentPassword || currentPassword.trim().length === 0) {
        return NextResponse.json(
          { error: "Current password is required to update your password." },
          { status: 400 }
        );
      }

      // Verify current password via isolated non-cookie client (M3)
      const testUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
      const testKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "").trim();

      const verifyClient = createSupabaseClient(testUrl, testKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error: verifyErr } = await verifyClient.auth.signInWithPassword({
        email: session.email,
        password: currentPassword,
      });

      if (verifyErr) {
        return NextResponse.json(
          { error: "Current password verification failed. Please check your password." },
          { status: 400 }
        );
      }
    }

    // Enforce password policy
    const policyResult = validatePasswordStrength(newPassword, {
      email: session.email,
      fullName: session.fullName,
    });
    if (!policyResult.valid) {
      return NextResponse.json({ error: policyResult.error }, { status: 400 });
    }

    // Update password in Supabase Auth using the user's active session
    const supabase = await createClient();
    const { error: updateAuthError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateAuthError) {
      return NextResponse.json(
        { error: updateAuthError.message || "Failed to update password" },
        { status: 400 }
      );
    }

    // Sign out all other sessions per security policy (M3)
    try {
      await supabase.auth.signOut({ scope: "others" });
    } catch (signOutErr) {
      console.warn("[ChangePassword] signOut others notice:", signOutErr);
    }

    // Clear must_change_password flag in profiles table
    await db.updateUser(session.userId, {
      must_change_password: false,
    });

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
