import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateRedirectPath } from "@/lib/auth/redirect-validator";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const validatedNext = validateRedirectPath(rawNext);

  // In production, build redirect strictly from NEXT_PUBLIC_SITE_URL; fail closed with clear error if missing
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (process.env.NODE_ENV === "production" && !siteUrl) {
    console.error("[AuthCallback] Configuration error: NEXT_PUBLIC_SITE_URL is missing in production environment.");
    return NextResponse.json(
      { error: { message: "Server configuration error: NEXT_PUBLIC_SITE_URL is required in production." } },
      { status: 500 }
    );
  }

  const safeBase = (siteUrl || (process.env.NODE_ENV !== "production" ? origin : "")).replace(/\/$/, "");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${safeBase}${validatedNext}`);
    }
  }

  // Return the user to login with error
  return NextResponse.redirect(`${safeBase}/login?error=auth_exchange_failed`);
}
