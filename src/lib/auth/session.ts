import crypto from 'crypto';
import { cookies } from 'next/headers';
import { UserProfile, UserRole } from '../types';
import { findUserById } from '../db';

const SESSION_COOKIE_NAME = 'sit_session';

/**
 * Returns the validated institutional JWT secret.
 * Throws a fatal error if missing or shorter than 32 characters to prevent forgery.
 */
function getSecretKey(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'FATAL SECURITY MISCONFIGURATION: JWT_SECRET must be set in environment variables and contain at least 32 characters.'
    );
  }
  return secret.trim();
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  tokenVersion?: number;
  mustChangePassword?: boolean;
  exp: number;
}

/**
 * Signs a JWT token with timing-safe HMAC SHA-256.
 * Expirations:
 * - Admin/Reviewer: 1 hour (3600s)
 * - Student: 8 hours (28800s)
 */
export function signToken(payload: Omit<SessionPayload, 'exp'>, customExpiresInHours?: number): string {
  const secret = getSecretKey();
  const defaultHours = payload.role === 'admin' || payload.role === 'reviewer' ? 1 : 8;
  const hours = customExpiresInHours ?? defaultHours;
  const exp = Math.floor(Date.now() / 1000) + hours * 3600;

  const fullPayload: SessionPayload = { ...payload, exp };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies JWT signature using timingSafeEqual to prevent side-channel timing attacks.
 */
export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;
    const secret = getSecretKey();

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedSigBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedSigBuf.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      return null;
    }

    const json = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as SessionPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Validates the current session cookie AND re-verifies user state against the database.
 * Confirms user still exists, matches token_version (session revocation), and refreshes active role.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload || !payload.userId) return null;

    // Check against database to ensure session validity and updated permissions
    const user = await findUserById(payload.userId);
    if (!user) return null;

    // Check token_version revocation
    if (payload.tokenVersion !== undefined && user.token_version !== undefined) {
      if (user.token_version !== payload.tokenVersion) {
        return null; // Session has been invalidated by password change or admin revoke
      }
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role, // Always use live role from database
      fullName: user.full_name,
      tokenVersion: user.token_version ?? 1,
      mustChangePassword: user.must_change_password ?? false,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: UserProfile) {
  const cookieStore = await cookies();
  const maxAgeHours = user.role === 'admin' || user.role === 'reviewer' ? 1 : 8;

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    tokenVersion: user.token_version ?? 1,
    mustChangePassword: user.must_change_password ?? false,
  }, maxAgeHours);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeHours * 3600,
  });

  return token;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
