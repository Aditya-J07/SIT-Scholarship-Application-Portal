/**
 * Cloudflare Turnstile verification helper.
 * Validates captcha tokens submitted with sensitive forms (login, register, forgot-password).
 * If TURNSTILE_SECRET_KEY is not configured:
 *  - In non-production (development / test): logs a clear warning and skips the check.
 *  - In production: fails closed to prevent abuse.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  clientIp: string
): Promise<{ success: boolean; message?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!secretKey || !siteKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Turnstile] Warning: TURNSTILE_SECRET_KEY or NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured. Skipping CAPTCHA validation in non-production mode."
      );
      return { success: true };
    }
    console.error(
      "[Turnstile] Error: Turnstile keys (TURNSTILE_SECRET_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY) are missing in production environment. Failing closed."
    );
    return {
      success: false,
      message: "Security verification service is misconfigured. Please contact support.",
    };
  }

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return {
      success: false,
      message: "Please complete the CAPTCHA security verification to continue.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token.trim());
    if (clientIp && clientIp !== "127.0.0.1" && clientIp !== "unknown") {
      formData.append("remoteip", clientIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const outcome = await res.json();
    if (!outcome.success) {
      console.warn("[Turnstile] Verification failed:", outcome["error-codes"]);
      return {
        success: false,
        message: "CAPTCHA verification failed. Please try again.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[Turnstile] Connection error during verification:", err);
    if (process.env.NODE_ENV !== "production") {
      return { success: true };
    }
    return {
      success: false,
      message: "CAPTCHA service temporarily unreachable. Please try again in a few moments.",
    };
  }
}
