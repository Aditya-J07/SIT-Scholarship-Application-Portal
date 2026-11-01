import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";
import { verifyStateChangingOrigin } from "@/lib/auth/origin-guard";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // H3: Universal CSRF Origin check for all state-changing API requests (excluding cron which uses CRON_SECRET)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/cron")) {
    const originErr = verifyStateChangingOrigin(request);
    if (originErr) return originErr;
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Light check only: refresh session; redirect logged-out users away from protected routes
  const protectedPaths = [
    "/dashboard",
    "/profile",
    "/applications",
    "/admin",
  ];

  const isProtected = protectedPaths.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !user) {
    const loginPath = pathname.startsWith("/admin") ? "/admin-login" : "/login";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
