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

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  dbUnavailable?: boolean;
}

/**
 * Executes an atomic rate-limit check via PostgreSQL function rate_limit_hit(key, window, max).
 * In production, this strictly calls PostgreSQL. If DB RPC is unavailable, it fails closed (dbUnavailable: true)
 * so critical endpoints (login, register) can return 503 instead of bypassing security.
 * The in-memory fallback is restricted to unit test suites with ALLOW_IN_MEMORY_RATE_LIMIT=1.
 */
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxPoints: number
): Promise<RateLimitResult> {
  const allowMemory =
    process.env.ALLOW_IN_MEMORY_RATE_LIMIT === "1" &&
    process.env.NODE_ENV !== "production";

  try {
    const admin = getAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: maxPoints,
    });

    if (error || !data || data.length === 0) {
      if (allowMemory) {
        return { ...checkInMemoryRateLimit(key, windowSeconds, maxPoints), dbUnavailable: false };
      }
      return { allowed: false, retryAfter: 60, dbUnavailable: true };
    }

    return {
      allowed: Boolean(data[0].allowed),
      retryAfter: Number(data[0].retry_after) || 0,
      dbUnavailable: false,
    };
  } catch {
    if (allowMemory) {
      return { ...checkInMemoryRateLimit(key, windowSeconds, maxPoints), dbUnavailable: false };
    }
    return { allowed: false, retryAfter: 60, dbUnavailable: true };
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

/**
 * Constructs a standard HTTP 503 Service Unavailable response when security rate limiter fails.
 */
export function rateLimitUnavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Security rate limiting service is temporarily unavailable. Please try again shortly.",
      },
    },
    {
      status: 503,
      headers: {
        "Retry-After": "30",
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
