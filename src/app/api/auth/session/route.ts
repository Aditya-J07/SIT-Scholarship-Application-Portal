import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { maskBankAccount } from '@/lib/crypto/encryption';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const profile = await db.findUserById(session.userId);
  if (!profile) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      mobile: profile.mobile,
      mustChangePassword: Boolean(profile.must_change_password),
      bank_account_holder: profile.bank_account_holder,
      bank_acc_no: profile.bank_acc_no ? maskBankAccount(profile.bank_acc_no) : undefined,
      bank_name: profile.bank_name,
      bank_branch: profile.bank_branch,
      bank_ifsc: profile.bank_ifsc,
    },
  });
}
