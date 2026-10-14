import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";

/**
 * Extracts authentic client IP address.
 * Prioritizes Vercel's verified edge header 'x-vercel-forwarded-for' per Vercel security docs,
 * followed by 'x-real-ip' and the first untampered IP in 'x-forwarded-for'.
 */
export function getClientIp(request: Request): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "127.0.0.1";
}

// In-memory bounded cache for local development / testing / fallback
interface RateLimitBucket {
  points: number;
  expireAt: number;
}
const memoryRateLimits = new Map<string, RateLimitBucket>();

function checkInMemoryRateLimit(
  key: string,
  windowSeconds: number,
  maxPoints: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = memoryRateLimits.get(key);

  if (!bucket || bucket.expireAt <= now) {
    memoryRateLimits.set(key, {
      points: 1,
      expireAt: now + windowSeconds * 1000,
    });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.points += 1;
  if (bucket.points > maxPoints) {
    const retryAfter = Math.max(1, Math.ceil((bucket.expireAt - now) / 1000));
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

/**
 * Executes an atomic rate-limit check via PostgreSQL function rate_limit_hit(key, window, max).
 * Falls back safely to bounded in-memory counter if database RPC is unavailable.
 */
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxPoints: number
): Promise<{ allowed: boolean; retryAfter: number }> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: maxPoints,
    });

    if (error || !data || data.length === 0) {
      return checkInMemoryRateLimit(key, windowSeconds, maxPoints);
    }

    return {
      allowed: Boolean(data[0].allowed),
      retryAfter: Number(data[0].retry_after) || 0,
    };
  } catch {
    return checkInMemoryRateLimit(key, windowSeconds, maxPoints);
  }
}

/**
 * Constructs a standard HTTP 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Too many requests. Please wait ${retryAfter} second(s) before trying again.`,
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}

// Periodic cleanup of expired in-memory buckets (keeps memory bounded)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryRateLimits.entries()) {
      if (bucket.expireAt <= now) {
        memoryRateLimits.delete(key);
      }
    }
  }, 60000).unref();
}
