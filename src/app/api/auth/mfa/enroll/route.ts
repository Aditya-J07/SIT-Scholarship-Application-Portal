import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";
import { verifyStateChangingOrigin } from "@/lib/auth/origin-guard";

export async function POST(request: Request) {
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: "Authentication required" } }, { status: 401 });
  }

  if (session.role !== "admin" && session.role !== "reviewer") {
    return NextResponse.json(
      { error: { message: "MFA enrollment is restricted to staff accounts." } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const friendlyName = (body.friendlyName as string) || "Staff Authenticator";

    const supabase = await createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
    });

    if (error || !data) {
      return NextResponse.json(
        { error: { message: error?.message || "Failed to initialize MFA enrollment" } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      factorId: data.id,
      friendlyName,
      totp: {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Enrollment error";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
