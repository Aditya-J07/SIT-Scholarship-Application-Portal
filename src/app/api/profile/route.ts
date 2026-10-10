import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const profile = db.findUserById(session.userId);
  if (!profile) {
    return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { full_name, mobile, bank_account_holder, bank_acc_no, bank_name, bank_branch, bank_ifsc } = body;

    const updated = db.updateUser(session.userId, {
      ...(full_name && { full_name: full_name.trim().toUpperCase() }),
      ...(mobile && { mobile: mobile.trim() }),
      bank_account_holder: bank_account_holder?.trim().toUpperCase(),
      bank_acc_no: bank_acc_no?.trim(),
      bank_name: bank_name?.trim(),
      bank_branch: bank_branch?.trim(),
      bank_ifsc: bank_ifsc?.trim().toUpperCase(),
    });

    db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'PROFILE_UPDATED',
      entity: 'profiles',
      entity_id: session.userId,
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: unknown) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: { message: 'Failed to update profile' } }, { status: 500 });
  }
}
