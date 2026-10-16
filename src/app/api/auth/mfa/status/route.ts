import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: "Authentication required" } }, { status: 401 });
  }

  if (session.role !== "admin" && session.role !== "reviewer") {
    return NextResponse.json(
      { error: { message: "MFA administration is restricted to staff accounts." } },
      { status: 403 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: aalData, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr) {
      return NextResponse.json({ error: { message: aalErr.message } }, { status: 400 });
    }

    const { data: factorData, error: factorErr } = await supabase.auth.mfa.listFactors();
    if (factorErr) {
      return NextResponse.json({ error: { message: factorErr.message } }, { status: 400 });
    }

    const totpFactors = (factorData.totp || []).map((f) => ({
      id: f.id,
      friendlyName: f.friendly_name || "Authenticator",
      factorType: f.factor_type,
      status: f.status,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));

    return NextResponse.json({
      currentLevel: aalData.currentLevel,
      nextLevel: aalData.nextLevel,
      enrolled: totpFactors.some((f) => f.status === "verified"),
      factors: totpFactors,
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
        fullName: session.fullName,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve MFA status";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
