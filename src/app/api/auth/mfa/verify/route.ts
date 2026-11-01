import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";
import { verifyStateChangingOrigin } from "@/lib/auth/origin-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: "Authentication required" } }, { status: 401 });
  }

  if (session.role !== "admin" && session.role !== "reviewer") {
    return NextResponse.json(
      { error: { message: "MFA verification is restricted to staff accounts." } },
      { status: 403 }
    );
  }

  // Rate limit MFA code attempts: 5 per 5 minutes per user
  const rateLimit = await checkRateLimit(`mfa_verify:user:${session.userId}`, 300, 5);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  try {
    const body = await request.json();
    const { factorId, code } = body;

    if (!factorId || !code || typeof code !== "string" || code.trim().length !== 6) {
      return NextResponse.json(
        { error: { message: "Valid factor ID and 6-digit numeric verification code are required." } },
        { status: 400 }
      );
    }

    const cleanCode = code.trim();
    const supabase = await createClient();

    // 1. Create Challenge
    const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeErr || !challengeData) {
      return NextResponse.json(
        { error: { message: challengeErr?.message || "Failed to create authentication challenge." } },
        { status: 400 }
      );
    }

    // 2. Verify Code against Challenge
    const { data: verifyData, error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: cleanCode,
    });

    if (verifyErr || !verifyData) {
      return NextResponse.json(
        { error: { message: "Invalid or expired verification code. Please check your authenticator and try again." } },
        { status: 400 }
      );
    }

    // 3. Update staff activity timestamp
    await db.updateStaffLastSeen(session.userId);

    // 4. Record audit event
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: "STAFF_MFA_VERIFIED",
      entity: "auth",
      entity_id: factorId,
      meta: {
        role: session.role,
        aal: "aal2",
      },
    });

    return NextResponse.json({
      success: true,
      aal: "aal2",
      message: "Multi-factor authentication verified successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "MFA verification failed";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
