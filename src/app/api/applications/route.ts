import { NextResponse } from 'next/server';
import { getAuthorizedSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ApplicationRecord } from '@/lib/types';
import { calculateMeritScore } from '@/lib/merit';
import { evaluateEligibility } from '@/lib/eligibility';
import { encryptBankAccount } from '@/lib/crypto/encryption';
import { getClientIp } from '@/lib/rate-limit';
import crypto from 'crypto';

function generateUnambiguousRefNo(scholarshipCode: string, year: number): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `SIT-${scholarshipCode.toUpperCase()}-${year}-${code}`;
}

export async function GET() {
  const { session, errorResponse } = await getAuthorizedSession();
  if (errorResponse) {
    return errorResponse;
  }

  if (session.role === 'student') {
    const apps = await db.listApplicationsForStudent(session.userId);
    const scholarships = await db.listScholarships();
    const enriched = apps.map((app) => {
      const sch = scholarships.find((s) => s.code === app.data.scholarship_code);
      return {
        ...app,
        scholarship_name: sch?.name || app.data.scholarship_code,
      };
    });
    return NextResponse.json({ applications: enriched });
  }

  // Admins & Reviewers see all
  const apps = await db.listApplications();
  return NextResponse.json({ applications: apps });
}

export async function POST(request: Request) {
  const { session, errorResponse } = await getAuthorizedSession();
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await request.json();
    const { scholarship_code } = body;

    if (!scholarship_code) {
      return NextResponse.json({ error: { message: 'Scholarship code is required' } }, { status: 400 });
    }

    const scholarship = await db.findScholarshipByCode(scholarship_code);
    if (!scholarship) {
      return NextResponse.json({ error: { message: 'Scholarship not found' } }, { status: 404 });
    }

    if (!scholarship.active) {
      return NextResponse.json(
        { error: { message: 'This scholarship is currently inactive. Applications are not being accepted.' } },
        { status: 400 }
      );
    }

    const cycle = await db.findActiveCycleForScholarship(scholarship.id);
    if (!cycle) {
      return NextResponse.json(
        { error: { message: 'The application window for this scholarship cycle is currently closed.' } },
        { status: 400 }
      );
    }

    // Check if student already has an application in this cycle
    const existing = await db.findApplicationForStudentInCycle(session.userId, cycle.id);
    if (existing) {
      // If draft or needs_correction, resume it
      if (existing.status === 'draft' || existing.status === 'needs_correction') {
        return NextResponse.json({ success: true, application: existing, resumed: true });
      }
      return NextResponse.json(
        { error: { message: `You have already submitted an application (${existing.ref_no}) for this scholarship cycle.` } },
        { status: 409 }
      );
    }

    // Prefill data from student profile with encrypted bank details (H1)
    const profile = await db.findUserById(session.userId);
    const currentYear = new Date().getFullYear();
    const ref_no = generateUnambiguousRefNo(scholarship.code, currentYear);

    const bankEnc = profile?.bank_acc_no
      ? encryptBankAccount(profile.bank_acc_no)
      : profile?.bank_acc_no_encrypted || null;
    const bankLast4 =
      profile?.bank_acc_last4 ||
      (profile?.bank_acc_no ? profile.bank_acc_no.slice(-4) : '');

    const initialData = {
      scholarship_code: scholarship.code,
      full_name: profile?.full_name || '',
      mobile: profile?.mobile || '',
      email: profile?.email || '',
      nationality: 'Indian',
      course_duration_years: 4,
      bank_acc_holder_name: profile?.bank_account_holder || profile?.full_name || '',
      bank_acc_no_encrypted: bankEnc,
      bank_acc_last4: bankLast4,
      bank_name: profile?.bank_name || '',
      bank_branch: profile?.bank_branch || '',
      bank_ifsc: profile?.bank_ifsc || '',
    };

    const merit_score = calculateMeritScore(initialData);
    const eligibility_flags = evaluateEligibility(initialData, scholarship.rules, scholarship.code);

    const newApp: ApplicationRecord = {
      id: crypto.randomUUID(),
      ref_no,
      student_id: session.userId,
      cycle_id: cycle.id,
      status: 'draft',
      current_step: 1,
      hard_copy_received: false,
      data: initialData,
      computed: {
        percentage: 0,
        merit_score,
        eligibility_flags,
      },
      merit_score,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.createApplication(newApp);

    const clientIp = getClientIp(request);

    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'DRAFT_APPLICATION_CREATED',
      entity: 'applications',
      entity_id: newApp.id,
      meta: { ref_no: newApp.ref_no, scholarship: scholarship.code },
      ip: clientIp,
    });

    return NextResponse.json({ success: true, application: newApp, resumed: false });
  } catch (error: unknown) {
    console.error('Create application error:', error);
    return NextResponse.json({ error: { message: 'Failed to create application draft' } }, { status: 500 });
  }
}
