import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { UserProfile, UserRole } from '@/lib/types';
import crypto from 'crypto';

const ALLOWED_ROLES = new Set<UserRole>(['student', 'reviewer', 'admin']);

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 403 });
  }

  const usersList = await db.listUsers();
  const users = usersList.map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    mobile: u.mobile,
    role: u.role,
    must_change_password: Boolean(u.must_change_password),
    email_verified: Boolean(u.email_verified),
    created_at: u.created_at,
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Only Admin can create user accounts' } }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { full_name, email, mobile, password, role } = body;

    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ error: { message: 'All fields are required' } }, { status: 400 });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: { message: 'Role must be student, reviewer, or admin' } }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Enforce password policy
    const policyResult = validatePasswordStrength(password, {
      email: normalizedEmail,
      fullName: full_name,
    });
    if (!policyResult.valid) {
      return NextResponse.json({ error: { message: policyResult.error } }, { status: 400 });
    }

    const existing = await db.findUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: { message: 'User with this email already exists' } }, { status: 409 });
    }

    const newUser: UserProfile = {
      id: crypto.randomUUID(),
      role,
      full_name: full_name.trim().toUpperCase(),
      email: normalizedEmail,
      mobile: mobile?.trim() || '',
      password_hash: hashPassword(password),
      must_change_password: true, // Required to change temporary password
      email_verified: true,
      token_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.createUser(newUser);

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'USER_ACCOUNT_CREATED',
      entity: 'profiles',
      entity_id: newUser.id,
      meta: { role: newUser.role, email: newUser.email, must_change_password: true },
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        must_change_password: newUser.must_change_password,
      },
    });
  } catch (error: unknown) {
    console.error('Create staff user error:', error);
    return NextResponse.json({ error: { message: 'Failed to create user' } }, { status: 500 });
  }
}
