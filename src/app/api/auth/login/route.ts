import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/rate-limit";
import { verifyStateChangingOrigin } from "@/lib/auth/origin-guard";

export async function POST(request: Request) {
  // 1. CSRF Origin Verification
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const clientIp = getClientIp(request);

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Atomic Rate Limiting: 5 per 15 minutes per IP and per Email (fail closed with 503 if DB limiter fails)
    const ipLimit = await checkRateLimit(`login:ip:${clientIp}`, 900, 5);
    if (ipLimit.dbUnavailable) {
      return rateLimitUnavailableResponse();
    }
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfter);
    }

    const emailLimit = await checkRateLimit(`login:email:${normalizedEmail}`, 900, 5);
    if (emailLimit.dbUnavailable) {
      return rateLimitUnavailableResponse();
    }
    if (!emailLimit.allowed) {
      return rateLimitResponse(emailLimit.retryAfter);
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user) {
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

    // Load server-controlled profile (role is NEVER read from user_metadata)
    const profile = await db.findUserById(authData.user.id);
    if (!profile) {
      return NextResponse.json(
        { error: { message: "Invalid email or password" } },
        { status: 401 }
      );
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
