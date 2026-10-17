import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";
import { getAdminClient } from "@/utils/supabase/admin";
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
    "/apply",
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

  // Part 5 Item 3: Avoid unnecessary database lookups.
  // Profile lookup is strictly restricted to /admin routes where staff role authorization
  // and 30-minute idle-timeout enforcement are required.
  const isStaffAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin-login");

  if (user && isStaffAdminPage) {
    try {
      const admin = getAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("role, must_change_password, last_seen_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.must_change_password) {
        return NextResponse.redirect(new URL("/change-password", request.url));
      }

      // Role check: redirect non-staff away from /admin pages
      if (profile?.role !== "admin" && profile?.role !== "reviewer") {
        return NextResponse.redirect(new URL("/admin-login", request.url));
      }

      // Check 30-minute idle timeout on staff page requests
      if (profile?.last_seen_at) {
        const idleMinutes = (Date.now() - new Date(profile.last_seen_at).getTime()) / (1000 * 60);
        if (idleMinutes > 30) {
          const timeoutUrl = new URL("/admin-login", request.url);
          timeoutUrl.searchParams.set("error", "Staff session expired due to 30 minutes of inactivity.");
          return NextResponse.redirect(timeoutUrl);
        }
      }
    } catch {
      // Continue safely if profile check encounters a temporary connection issue
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
