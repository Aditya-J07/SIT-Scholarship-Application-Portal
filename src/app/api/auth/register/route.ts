import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import { UserProfile } from '@/lib/types';
import { sendNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, email, mobile, password, consent_accepted } = body;

    if (!full_name || !email || !mobile || !password) {
      return NextResponse.json(
        { error: { message: 'All fields (Name, Email, Mobile, Password) are required' } },
        { status: 400 }
      );
    }

    if (!consent_accepted) {
      return NextResponse.json(
        { error: { message: 'You must review and accept the DPDP Privacy Consent before registering' } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.findUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json(
        { error: { message: 'An account with this email already exists. Please log in.' } },
        { status: 409 }
      );
    }

    // Validate mobile
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      return NextResponse.json(
        { error: { message: 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9' } },
        { status: 400 }
      );
    }

    const password_hash = hashPassword(password);
    const newProfile: UserProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: 'student',
      full_name: full_name.trim().toUpperCase(),
      mobile: mobile.trim(),
      email: normalizedEmail,
      password_hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.createUser(newProfile);

    // Audit log
    db.logAudit({
      actor_id: newProfile.id,
      actor_email: newProfile.email,
      action: 'USER_REGISTERED',
      entity: 'profiles',
      entity_id: newProfile.id,
      meta: { role: 'student' },
    });

    // Send welcome notification
    await sendNotification({
      toEmail: newProfile.email,
      toMobile: newProfile.mobile,
      studentName: newProfile.full_name,
      type: 'WELCOME_STUDENT',
    });

    await setSessionCookie(newProfile);

    return NextResponse.json({
      success: true,
      user: {
        id: newProfile.id,
        email: newProfile.email,
        fullName: newProfile.full_name,
        role: newProfile.role,
        mobile: newProfile.mobile,
      },
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: { message: 'An unexpected server error occurred during registration' } },
      { status: 500 }
    );
  }
}
