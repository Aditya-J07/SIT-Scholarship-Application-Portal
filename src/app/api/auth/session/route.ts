import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { maskBankAccount } from "@/lib/crypto/field-encryption";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const profile = await db.findUserById(session.userId);
  if (!profile) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const last4 = profile.bank_acc_last4 || (profile.bank_acc_no ? profile.bank_acc_no.slice(-4) : null);
  const maskedBank = last4 ? maskBankAccount(last4) : null;

  return NextResponse.json({
    authenticated: true,
    user: {
      id: profile.id,
      name: profile.full_name,
      fullName: profile.full_name, // client compatibility alias
      role: profile.role,
      bank_acc_last4: last4,
      masked_bank_account: maskedBank,
      must_change_password: Boolean(profile.must_change_password),
      mustChangePassword: Boolean(profile.must_change_password), // client compatibility alias
    },
  });
}
