import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import {
  checkRateLimit,
  getClientIp,
  isRateLimitExceeded,
  rateLimitResponse,
  rateLimitUnavailableResponse,
  resetRateLimit,
} from "@/lib/rate-limit";
import { verifyStateChangingOrigin } from "@/lib/auth/origin-guard";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";

export async function POST(request: Request) {
  // 1. CSRF Origin Verification
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const clientIp = getClientIp(request);

  try {
    const body = await request.json();
    const { email, password, turnstileToken } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Turnstile Verification
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: { message: turnstileResult.message || "CAPTCHA verification failed" } },
        { status: 400 }
      );
    }

    // 3. Campus-friendly Rate Limiting: 100 per 15 minutes per IP (supports shared hostel/campus networks)
    const ipLimit = await checkRateLimit(`login:ip:${clientIp}`, 900, 100);
    if (ipLimit.dbUnavailable) {
      return rateLimitUnavailableResponse();
    }
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfter);
    }

    // 4. Per-email failure limit: check if 5 failed attempts already recorded in last 15 min
    const emailExceeded = await isRateLimitExceeded(`login:email:${normalizedEmail}`, 5);
    if (!emailExceeded.allowed) {
      return rateLimitResponse(emailExceeded.retryAfter);
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user) {
      // Record failed attempt against email bucket (5 per 15 min)
      await checkRateLimit(`login:email:${normalizedEmail}`, 900, 5);

      await db.logAudit({
        actor_email: normalizedEmail,
        action: "LOGIN_FAILED",
        entity: "auth",
        entity_id: "unknown",
        meta: { reason: authError?.message || "Authentication failed" },
        ip: clientIp,
      });

      // Always return identical generic error for any failure (prevents email enumeration)
      return NextResponse.json(
        { error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    // On successful login: reset email failure bucket so legitimate user is never blocked
    await resetRateLimit(`login:email:${normalizedEmail}`);

    // Load server-controlled profile (role is NEVER read from user_metadata)
    const profile = await db.findUserById(authData.user.id);
    if (!profile) {
      return NextResponse.json(
        { error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    if (profile.role === "admin" || profile.role === "reviewer") {
      await db.updateStaffLastSeen(profile.id);
    }

    await db.logAudit({
      actor_id: profile.id,
      actor_email: profile.email,
      action: "USER_LOGIN",
      entity: "profiles",
      entity_id: profile.id,
      meta: {
        role: profile.role,
        must_change_password: profile.must_change_password ?? false,
      },
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      mustChangePassword: Boolean(profile.must_change_password),
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        mobile: profile.mobile,
      },
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: { message: "Invalid email or password" } },
      { status: 401 }
    );
  }
}
