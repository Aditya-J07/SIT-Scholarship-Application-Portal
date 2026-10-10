import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { UserProfile } from '@/lib/types';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 403 });
  }

  const users = db.listUsers().map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    mobile: u.mobile,
    role: u.role,
    created_at: u.created_at,
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Only Admin can create staff accounts' } }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { full_name, email, mobile, password, role } = body;

    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ error: { message: 'All fields are required' } }, { status: 400 });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: { message: 'User with this email already exists' } }, { status: 409 });
    }

    const newUser: UserProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role,
      full_name: full_name.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      mobile: mobile?.trim() || '',
      password_hash: hashPassword(password),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.createUser(newUser);

    db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'STAFF_USER_CREATED',
      entity: 'profiles',
      entity_id: newUser.id,
      meta: { role: newUser.role, email: newUser.email },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: unknown) {
    console.error('Create staff user error:', error);
    return NextResponse.json({ error: { message: 'Failed to create user' } }, { status: 500 });
  }
}
