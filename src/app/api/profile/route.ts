import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { maskBankAccount } from '@/lib/crypto/encryption';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const profile = await db.findUserById(session.userId);
  if (!profile) {
    return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      ...profile,
      bank_acc_no: profile.bank_acc_no ? maskBankAccount(profile.bank_acc_no) : undefined,
    },
  });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { full_name, mobile, bank_account_holder, bank_acc_no, bank_name, bank_branch, bank_ifsc } = body;

    const updated = await db.updateUser(session.userId, {
      ...(full_name && { full_name: full_name.trim().toUpperCase() }),
      ...(mobile && { mobile: mobile.trim() }),
      bank_account_holder: bank_account_holder?.trim().toUpperCase(),
      bank_acc_no: bank_acc_no?.trim(),
      bank_name: bank_name?.trim(),
      bank_branch: bank_branch?.trim(),
      bank_ifsc: bank_ifsc?.trim().toUpperCase(),
    });

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'PROFILE_UPDATED',
      entity: 'profiles',
      entity_id: session.userId,
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      profile: updated ? {
        ...updated,
        bank_acc_no: updated.bank_acc_no ? maskBankAccount(updated.bank_acc_no) : undefined,
      } : null,
    });
  } catch (error: unknown) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: { message: 'Failed to update profile' } }, { status: 500 });
  }
}
