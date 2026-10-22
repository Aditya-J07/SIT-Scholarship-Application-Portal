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
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { PRIVACY_VERSION } from "@/lib/constants";
import { getAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  // 1. CSRF Origin Verification
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const clientIp = getClientIp(request);

  // 2. Campus-friendly Rate Limiting: 30 per hour per IP (supports multiple students on campus/hostel Wi-Fi)
  const ipLimit = await checkRateLimit(`register:ip:${clientIp}`, 3600, 30);
  if (ipLimit.dbUnavailable) {
    return rateLimitUnavailableResponse();
  }
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  try {
    const body = await request.json();
    const { full_name, email, mobile, password, consent_accepted, turnstileToken } = body;

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

    // 3. Turnstile CAPTCHA Verification
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: { message: turnstileResult.message || "CAPTCHA verification failed" } },
        { status: 400 }
      );
    }

    // 4. Rate limiting: 3 per hour per email address
    const emailLimit = await checkRateLimit(`register:email:${normalizedEmail}`, 3600, 3);
    if (emailLimit.dbUnavailable) {
      return rateLimitUnavailableResponse();
    }
    if (!emailLimit.allowed) {
      return rateLimitResponse(emailLimit.retryAfter);
    }

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
    let userId: string | null = null;

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
      console.warn("[Register] signUp provider error:", signUpError.code || "SIGNUP_ERROR");
      return NextResponse.json(
        { error: { message: "Unable to complete registration. Please check your details and try again." } },
        { status: 400 }
      );
    } else if (authData.user?.id) {
      userId = authData.user.id;
    }

    if (userId) {
      // Record consent acceptance in profiles table per DPDP compliance (M7)
      try {
        const admin = getAdminClient();
        await admin
          .from("profiles")
          .update({
            consent_accepted_at: new Date().toISOString(),
            consent_version: PRIVACY_VERSION,
          })
          .eq("id", userId);
      } catch (consentErr) {
        console.warn("[Register] Failed to record consent timestamp:", consentErr instanceof Error ? consentErr.name : "ConsentError");
      }

      await db.logAudit({
        actor_id: userId,
        actor_email: normalizedEmail,
        action: "USER_REGISTERED",
        entity: "profiles",
        entity_id: userId,
        meta: { role: "student", consent_version: PRIVACY_VERSION },
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
    console.error("[Register] Registration error:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: { message: "An unexpected error occurred during registration. Please try again." } },
      { status: 500 }
    );
  }
}
