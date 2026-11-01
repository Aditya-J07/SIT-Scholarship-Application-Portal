import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyStateChangingOrigin } from "@/lib/auth/origin-guard";

/**
 * Enumeration-safe, rate-limited endpoint to resend signup confirmation emails (M9).
 */
export async function POST(request: Request) {
  // Origin verification
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const clientIp = getClientIp(request);

  // Rate limiting: 10 per hour per IP, 3 per hour per email
  const ipLimit = await checkRateLimit(`resend_conf:ip:${clientIp}`, 3600, 10);
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: { message: "A valid email address is required." } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailLimit = await checkRateLimit(`resend_conf:email:${normalizedEmail}`, 3600, 3);
    if (!emailLimit.allowed) {
      return rateLimitResponse(emailLimit.retryAfter);
    }

    const supabase = await createClient();
    await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
    });

    // Always return generic success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message:
        "If your email is registered and unconfirmed, a new verification link has been sent to your inbox.",
    });
  } catch (error: unknown) {
    console.error("[ResendConfirmation] Error:", error);
    return NextResponse.json({
      success: true,
      message:
        "If your email is registered and unconfirmed, a new verification link has been sent to your inbox.",
    });
  }
}
