import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { calculateMeritScore, calculatePercentage } from '@/lib/merit';
import { evaluateEligibility } from '@/lib/eligibility';
import { step1Schema, step2Schema, step3Schema, step4Schema, step5Schema } from '@/lib/schemas/application';
import { maskBankAccount } from '@/lib/crypto/encryption';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const application = await db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  // Row Level Security: student can only access their own
  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const scholarship = await db.findScholarshipByCode(application.data.scholarship_code || 'MNC');
  const filesList = await db.listFilesForApplication(application.id);
  const files = filesList.map((f) => ({
    id: f.id,
    kind: f.kind,
    original_name: f.original_name,
    size_bytes: f.size_bytes,
    mime: f.mime,
    uploaded_at: f.uploaded_at,
    url: `/api/files/${f.id}`,
  }));
  const remarks = await db.listRemarksForApplication(application.id);

  // If reviewer viewing, mask bank account number (only admin viewing single application has unmasked view, and it is audited)
  const appData = { ...application.data };
  if (session.role === 'reviewer' && appData.bank_acc_no) {
    appData.bank_acc_no = maskBankAccount(appData.bank_acc_no);
    if (appData.confirm_bank_acc_no) {
      appData.confirm_bank_acc_no = maskBankAccount(appData.confirm_bank_acc_no);
    }
  }

  // If admin views full bank details, log audit per M4
  if (session.role === 'admin') {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'ADMIN_VIEW_APPLICATION_FULL_DETAILS',
      entity: 'applications',
      entity_id: application.id,
      meta: { student_id: application.student_id, ref_no: application.ref_no },
      ip: clientIp,
    });
  }

  return NextResponse.json({
    application: {
      ...application,
      data: appData,
    },
    scholarship,
    files,
    remarks,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const application = await db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  if (session.role === 'student' && application.status !== 'draft' && application.status !== 'needs_correction') {
    return NextResponse.json(
      { error: { message: 'Application is locked and cannot be edited after submission' } },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { step, stepData, last_updated_at } = body;

    // Concurrency conflict check: prevent silent overwrite if updated in another tab
    if (last_updated_at && application.updated_at) {
      const clientTime = new Date(last_updated_at).getTime();
      const serverTime = new Date(application.updated_at).getTime();
      if (serverTime > clientTime + 1000) {
        return NextResponse.json(
          { error: { message: 'This draft was updated in another session. Please reload to avoid overwriting newer data.' } },
          { status: 409 }
        );
      }
    }

    // Step must be integer 1 to 5
    if (typeof step !== 'number' || step < 1 || step > 5 || !Number.isInteger(step)) {
      return NextResponse.json(
        { error: { message: 'Step must be an integer between 1 and 5' } },
        { status: 400 }
      );
    }

    // Validate with strict schema and extract parsed clean data (never trust client directly)
    let validatedCleanData: Record<string, unknown> = {};

    if (step === 1) {
      const res = step1Schema.safeParse(stepData);
      if (!res.success) {
        return NextResponse.json(
          { error: { message: res.error.issues[0]?.message || 'Invalid step 1 data', fields: res.error.flatten().fieldErrors } },
          { status: 400 }
        );
      }
      validatedCleanData = res.data;
    } else if (step === 2) {
      const res = step2Schema.safeParse(stepData);
      if (!res.success) {
        return NextResponse.json(
          { error: { message: res.error.issues[0]?.message || 'Invalid step 2 data', fields: res.error.flatten().fieldErrors } },
          { status: 400 }
        );
      }
      validatedCleanData = res.data;
    } else if (step === 3) {
      const res = step3Schema.safeParse(stepData);
      if (!res.success) {
        return NextResponse.json(
          { error: { message: res.error.issues[0]?.message || 'Invalid step 3 data', fields: res.error.flatten().fieldErrors } },
          { status: 400 }
        );
      }
      validatedCleanData = res.data;
    } else if (step === 4) {
      const res = step4Schema.safeParse(stepData);
      if (!res.success) {
        return NextResponse.json(
          { error: { message: res.error.issues[0]?.message || 'Invalid step 4 data', fields: res.error.flatten().fieldErrors } },
          { status: 400 }
        );
      }
      validatedCleanData = res.data;
    } else if (step === 5) {
      const res = step5Schema.safeParse(stepData);
      if (!res.success) {
        return NextResponse.json(
          { error: { message: res.error.issues[0]?.message || 'Invalid step 5 data', fields: res.error.flatten().fieldErrors } },
          { status: 400 }
        );
      }
      validatedCleanData = res.data;
    }

    // Strip any forbidden or client-manipulable keys
    delete (validatedCleanData as Record<string, unknown>).scholarship_code;
    delete (validatedCleanData as Record<string, unknown>).status;
    delete (validatedCleanData as Record<string, unknown>).ref_no;
    delete (validatedCleanData as Record<string, unknown>).merit_score;
    delete (validatedCleanData as Record<string, unknown>).percentage;
    delete (validatedCleanData as Record<string, unknown>).hard_copy_received;

    const mergedData = {
      ...application.data,
      ...validatedCleanData,
      scholarship_code: application.data.scholarship_code, // Preserved strictly from initial draft
    };

    // Auto-calculate percentage strictly on the server
    if (mergedData.marks_obtained && mergedData.marks_gross_total) {
      mergedData.percentage = calculatePercentage(
        mergedData.marks_obtained,
        mergedData.marks_gross_total
      );
    }

    const scholarship = await db.findScholarshipByCode(mergedData.scholarship_code || 'MNC');
    const merit_score = calculateMeritScore(mergedData);
    const eligibility_flags = evaluateEligibility(
      mergedData,
      scholarship?.rules || {},
      scholarship?.code || 'MNC'
    );

    const updated = await db.updateApplication(id, {
      data: mergedData,
      current_step: step,
      merit_score,
      computed: {
        percentage: mergedData.percentage || 0,
        merit_score,
        eligibility_flags,
      },
    });

    return NextResponse.json({
      success: true,
      application: updated,
    });
  } catch (error: unknown) {
    console.error('Update application draft error:', error);
    return NextResponse.json({ error: { message: 'Failed to save draft' } }, { status: 500 });
  }
}
