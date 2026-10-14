import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { db } from "@/lib/db";

export async function POST(request: Request) {
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
    });

    // To prevent email enumeration: if error occurs (e.g. email exists), return the generic response
    if (signUpError) {
      console.warn("[Register] signUp message:", signUpError.message);
      return NextResponse.json({
        success: true,
        message:
          "If this email can be registered, a verification message has been sent. Please check your inbox.",
      });
    }

    if (authData.user?.id) {
      // Store student's name and mobile in the profiles table (not in user_metadata).
      // Public signup creates students only.
      const admin = getAdminClient();
      await admin.from("profiles").upsert({
        id: authData.user.id,
        role: "student",
        full_name: full_name.trim().toUpperCase(),
        mobile: mobile.trim(),
        email: normalizedEmail,
        must_change_password: false,
      });

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

    return NextResponse.json({
      success: true,
      message:
        "If this email can be registered, a verification message has been sent. Please check your inbox.",
      user: {
        id: authData.user?.id,
        email: normalizedEmail,
        role: "student",
      },
    });
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: { message: "An unexpected error occurred during registration. Please try again." } },
      { status: 500 }
    );
  }
}
