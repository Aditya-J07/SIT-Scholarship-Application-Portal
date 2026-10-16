import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-guard";
import { verifyStateChangingOrigin } from "@/lib/auth/origin-guard";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/utils/supabase/admin";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. CSRF Origin Verification
  const originError = verifyStateChangingOrigin(request);
  if (originError) return originError;

  // 2. Admin role and session check
  const { session, errorResponse } = await requireAdminSession({ allowReviewer: false });
  if (errorResponse) return errorResponse;

  // Rate limiting: 5 MFA resets per 15 minutes per admin (M4)
  const rateLimit = await checkRateLimit(`reset-mfa:admin:${session.userId}`, 900, 5);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const { id: targetUserId } = await params;

  // Cannot reset MFA for oneself (prevents self-downgrading / security bypass)
  if (session.userId === targetUserId) {
    return NextResponse.json(
      { error: { message: "Administrators cannot reset their own MFA factors. Request another administrator to perform this action." } },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { admin_password } = body;

    if (!admin_password) {
      return NextResponse.json(
        { error: { message: "Administrator password re-confirmation is required to reset MFA factors." } },
        { status: 400 }
      );
    }

    // 3. Re-verify acting admin's password against Supabase Auth using isolated non-cookie client (M4)
    const testUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const testKey = (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ""
    ).trim();

    const verifyClient = createSupabaseClient(testUrl, testKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: authErr } = await verifyClient.auth.signInWithPassword({
      email: session.email,
      password: admin_password,
    });

    if (authErr) {
      return NextResponse.json(
        { error: { message: "Administrator password verification failed." } },
        { status: 401 }
      );
    }

    // 4. Delete user's enrolled TOTP factors via Supabase Admin API
    const admin = getAdminClient();
    const { data: factorList, error: listErr } = await admin.auth.admin.mfa.listFactors({
      userId: targetUserId,
    });

    if (listErr) {
      console.error("[ResetMFA] listFactors error:", listErr.message);
    }

    if (factorList?.factors) {
      for (const factor of factorList.factors) {
        await admin.auth.admin.mfa.deleteFactor({
          userId: targetUserId,
          id: factor.id,
        });
      }
    }

    const clientIp = getClientIp(request);
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: "ADMIN_RESET_USER_MFA",
      entity: "profiles",
      entity_id: targetUserId,
      meta: {
        reset_by_admin: session.email,
        target_user_id: targetUserId,
      },
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: "User MFA factors have been reset. The user must re-enroll upon their next login.",
    });
  } catch (error: unknown) {
    console.error("[ResetMFA] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to reset MFA factors due to a server error." } },
      { status: 500 }
    );
  }
}
