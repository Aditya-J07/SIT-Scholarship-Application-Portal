import crypto from 'crypto';
import { cookies } from 'next/headers';
import { UserProfile, UserRole } from '../types';

const SECRET_KEY = process.env.JWT_SECRET || 'sit-scholarship-portal-super-secret-key-2026-secure-random';
const SESSION_COOKIE_NAME = 'sit_session';

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  exp: number;
}

export function signToken(payload: Omit<SessionPayload, 'exp'>, expiresInHours = 24): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const fullPayload: SessionPayload = { ...payload, exp };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(encodedPayload)
      .digest('base64url');
    if (signature !== expectedSig) return null;

    const json = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: UserProfile) {
  const cookieStore = await cookies();
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
  });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 3600,
  });
  return token;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
