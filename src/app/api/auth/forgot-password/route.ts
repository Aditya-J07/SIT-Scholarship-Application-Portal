import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyStateChangingOrigin } from "@/lib/auth/origin-guard";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  // 1. Origin verification
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const clientIp = getClientIp(request);

  // 2. Rate limiting: 10 per hour per IP
  const ipLimit = await checkRateLimit(`forgot_pwd:ip:${clientIp}`, 3600, 10);
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  try {
    const body = await request.json();
    const { email, turnstileToken } = body;

    // Turnstile verification
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: { message: turnstileResult.message || "CAPTCHA verification failed" } },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: { message: "A valid email address is required." } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limiting: 3 per hour per email
    const emailLimit = await checkRateLimit(`forgot_pwd:email:${normalizedEmail}`, 3600, 3);
    if (!emailLimit.allowed) {
      return rateLimitResponse(emailLimit.retryAfter);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectTo = `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/reset-password`;

    const supabase = await createClient();
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (resetErr) {
      console.warn("[ForgotPassword] Supabase message:", resetErr.message);
    }

    await db.logAudit({
      actor_email: normalizedEmail,
      action: "PASSWORD_RESET_REQUESTED",
      entity: "auth",
      entity_id: "unknown",
      meta: { requested_for: normalizedEmail },
      ip: clientIp,
    });

    // Always return generic response to prevent email enumeration
    return NextResponse.json({
      success: true,
      message:
        "If your email is registered with the portal, an official password recovery link has been dispatched.",
    });
  } catch (error: unknown) {
    console.error("[ForgotPassword] Error:", error);
    return NextResponse.json({
      success: true,
      message:
        "If your email is registered with the portal, an official password recovery link has been dispatched.",
    });
  }
}
