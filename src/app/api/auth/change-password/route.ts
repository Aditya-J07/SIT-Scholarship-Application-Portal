import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, setSessionCookie } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { z } from 'zod';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(10, 'New password must be at least 10 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request parameters' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword, confirmPassword } = parsed.data;

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation do not match' }, { status: 400 });
    }

    const user = await db.findUserById(session.userId);
    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    // Verify current password
    const verifyResult = verifyPassword(currentPassword, user.password_hash);
    if (!verifyResult.verified) {
      await db.logAudit({
        actor_id: session.userId,
        actor_email: session.email,
        action: 'PASSWORD_CHANGE_FAILED_WRONG_CURRENT',
        entity: 'user',
        entity_id: session.userId,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      });
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Prevent reusing identical password
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Enforce password policy
    const policyResult = validatePasswordStrength(newPassword, {
      email: user.email,
      fullName: user.full_name,
    });
    if (!policyResult.valid) {
      return NextResponse.json({ error: policyResult.error }, { status: 400 });
    }

    // Hash new password using scrypt
    const newPasswordHash = hashPassword(newPassword);
    const newTokenVersion = (user.token_version ?? 1) + 1;

    const updatedUser = await db.updateUser(user.id, {
      password_hash: newPasswordHash,
      must_change_password: false,
      token_version: newTokenVersion,
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }

    // Issue updated session with new token_version
    await setSessionCookie(updatedUser);

    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'PASSWORD_CHANGED',
      entity: 'user',
      entity_id: session.userId,
      meta: {
        token_version: newTokenVersion,
      },
      ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
      mustChangePassword: false,
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
