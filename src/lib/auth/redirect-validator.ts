/**
 * Validates the redirect destination path to prevent Open Redirect vulnerabilities (H4).
 * Enforces strict criteria:
 * - Must be a non-empty string starting with a single leading slash '/'
 * - Must NOT start with '//' or '/\'
 * - Must NOT contain '://', '@', or backslashes
 * - Pathname portion must not contain '//'
 * Falls back safely to fallback (default: '/dashboard') if any criterion is violated.
 */
export function validateRedirectPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || !next) {
    return fallback;
  }

  const trimmed = next.trim();

  // Must begin with a single slash, not double slash or backslash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Must not contain protocol identifiers, userinfo delimiters, or backslashes
  if (
    trimmed.includes("://") ||
    trimmed.includes("@") ||
    trimmed.includes("/\\") ||
    trimmed.includes("\\")
  ) {
    return fallback;
  }

  // The pathname portion before '?' or '#' must not contain double slashes
  const pathname = trimmed.split("?")[0].split("#")[0];
  if (pathname.includes("//")) {
    return fallback;
  }

  return trimmed;
}
