import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
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

  // 2. Atomic Rate Limiting: 5 per hour per IP (fail closed with 503 if DB limiter fails)
  const rateLimit = await checkRateLimit(`register:ip:${clientIp}`, 3600, 5);
  if (rateLimit.dbUnavailable) {
    return rateLimitUnavailableResponse();
  }
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  try {
    const body = await request.json();
    const { full_name, email, mobile, password, consent_accepted } = body;

    if (!full_name || !email || !mobile || !password) {
      return NextResponse.json(
        { error: { message: "All fields (Name, Email, Mobile, Password) are required" } },
        { status: 400 }
      );
    }

    if (!consent_accepted) {
      return NextResponse.json(
        { error: { message: "You must review and accept the DPDP Privacy Consent before registering" } },
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
      return NextResponse.json(
        { error: { message: policyResult.error } },
        { status: 400 }
      );
    }

    // Validate mobile (10 digits starting with 6-9)
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      return NextResponse.json(
        { error: { message: "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9" } },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: full_name.trim().toUpperCase(),
          mobile: mobile.trim(),
        },
      },
    });

    if (signUpError) {
      console.warn("[Register] signUp message:", signUpError.message);
    } else if (authData.user?.id) {
      const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
      await db.logAudit({
        actor_id: authData.user.id,
        actor_email: normalizedEmail,
        action: "USER_REGISTERED",
        entity: "profiles",
        entity_id: authData.user.id,
        meta: { role: "student" },
        ip: clientIp,
      });
    }

    // Always return generic response to prevent email enumeration
    return NextResponse.json({
      success: true,
      message:
        "If this email can be registered, a verification message has been sent. Please check your inbox.",
    });
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: { message: "An unexpected error occurred during registration. Please try again." } },
      { status: 500 }
    );
  }
}
