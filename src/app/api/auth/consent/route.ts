import { NextResponse } from "next/server";
import { getAuthorizedSession } from "@/lib/auth/session";
import { verifyStateChangingOrigin } from "@/lib/auth/origin-guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";
import { PRIVACY_VERSION } from "@/lib/constants";

export async function POST(request: Request) {
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const auth = await getAuthorizedSession();
  if (!auth.session) {
    return auth.errorResponse;
  }

  const clientIp = getClientIp(request);
  const admin = getAdminClient();

  try {
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        consent_accepted_at: new Date().toISOString(),
        consent_version: PRIVACY_VERSION,
      })
      .eq("id", auth.session.userId);

    if (updateError) {
      console.error("[Consent] DB Update error:", updateError);
      return NextResponse.json(
        { error: { message: "Failed to record consent. Please try again." } },
        { status: 500 }
      );
    }

    await db.logAudit({
      actor_id: auth.session.userId,
      actor_email: auth.session.email,
      action: "CONSENT_REACCEPTED",
      entity: "profiles",
      entity_id: auth.session.userId,
      meta: { consent_version: PRIVACY_VERSION },
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: "Consent recorded successfully",
      consent_version: PRIVACY_VERSION,
    });
  } catch (err: unknown) {
    console.error("[Consent] Unexpected error:", err);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
