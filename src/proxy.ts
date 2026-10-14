import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";
import { getAdminClient } from "@/utils/supabase/admin";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

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

  // A4: Server-side enforcement of must_change_password & staff access
  if (user) {
    try {
      const admin = getAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("role, must_change_password")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.must_change_password) {
        if (pathname.startsWith("/api/")) {
          const allowedApiPaths = [
            "/api/auth/change-password",
            "/api/auth/logout",
            "/api/auth/session",
          ];
          if (!allowedApiPaths.includes(pathname)) {
            return NextResponse.json(
              {
                code: "PASSWORD_CHANGE_REQUIRED",
                error: { message: "Password change is required before accessing portal features." },
              },
              { status: 403 }
            );
          }
        } else if (
          pathname !== "/change-password" &&
          pathname !== "/login" &&
          pathname !== "/admin-login" &&
          pathname !== "/auth/callback"
        ) {
          return NextResponse.redirect(new URL("/change-password", request.url));
        }
      }

      // Role check: redirect non-staff away from /admin pages
      if (pathname.startsWith("/admin") && pathname !== "/admin-login") {
        if (profile?.role !== "admin" && profile?.role !== "reviewer") {
          return NextResponse.redirect(new URL("/admin-login", request.url));
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
