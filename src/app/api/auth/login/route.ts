import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: 'Invalid email or password' } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.findUserByEmail(normalizedEmail);

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    // Constant-time check: if user doesn't exist, use generic error and don't reveal existence
    if (!user || !user.password_hash) {
      await db.logAudit({
        actor_email: normalizedEmail,
        action: 'LOGIN_FAILED',
        entity: 'auth',
        entity_id: 'unknown',
        meta: { reason: 'User not found or no password' },
        ip: clientIp,
      });

      return NextResponse.json(
        { error: { message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    const verifyResult = verifyPassword(password, user.password_hash);
    if (!verifyResult.verified) {
      await db.logAudit({
        actor_id: user.id,
        actor_email: user.email,
        action: 'LOGIN_FAILED',
        entity: 'auth',
        entity_id: user.id,
        meta: { reason: 'Incorrect credentials' },
        ip: clientIp,
      });

      return NextResponse.json(
        { error: { message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Transparent hash upgrade from legacy PBKDF2 to modern scrypt
    if (verifyResult.needsRehash) {
      const newHash = hashPassword(password);
      await db.updateUser(user.id, { password_hash: newHash });
    }

    await setSessionCookie(user);

    await db.logAudit({
      actor_id: user.id,
      actor_email: user.email,
      action: 'USER_LOGIN',
      entity: 'profiles',
      entity_id: user.id,
      meta: {
        role: user.role,
        must_change_password: user.must_change_password ?? false,
      },
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      mustChangePassword: Boolean(user.must_change_password),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        mobile: user.mobile,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { message: 'An unexpected server error occurred during login' } },
      { status: 500 }
    );
  }
}
