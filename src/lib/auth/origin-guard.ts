import { NextResponse } from "next/server";

/**
 * Validates request Origin header for state-changing HTTP methods (POST, PUT, PATCH, DELETE).
 * Defends against Cross-Site Request Forgery (CSRF).
 */
export function verifyStateChangingOrigin(request: Request): NextResponse | null {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return null;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return NextResponse.json(
      { error: { code: "INVALID_ORIGIN", message: "Request Origin header is required for state-changing operations." } },
      { status: 403 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const allowedOrigins: string[] = [];

  try {
    const parsedSite = new URL(siteUrl).origin;
    allowedOrigins.push(parsedSite);
  } catch {
    // fallback
  }

  // Development convenience
  allowedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");

  if (!allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN_ORIGIN", message: "Cross-origin request rejected." } },
      { status: 403 }
    );
  }

  return null;
}
