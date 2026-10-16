import { NextResponse } from 'next/server';
import { getAuthorizedSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { calculateMeritScore, calculatePercentage } from '@/lib/merit';
import { evaluateEligibility } from '@/lib/eligibility';
import { step1Schema, step2Schema, step3Schema, step4Schema, step5Schema } from '@/lib/schemas/application';
import { decryptBankAccount, encryptBankAccount, maskBankAccount } from '@/lib/crypto/encryption';
import { verifyStateChangingOrigin } from '@/lib/auth/origin-guard';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await getAuthorizedSession();
  if (errorResponse) {
    return errorResponse;
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

  // Bank account access control (H1):
  // - Owning student and Admin get decrypted full account number
  // - Reviewers get masked account number
  const appData = { ...application.data };

  if (session.role === 'student' || session.role === 'admin') {
    if (appData.bank_acc_no_encrypted) {
      try {
        appData.bank_acc_no = decryptBankAccount(appData.bank_acc_no_encrypted);
        appData.confirm_bank_acc_no = appData.bank_acc_no;
      } catch {
        appData.bank_acc_no = '';
      }
    }
    appData.is_masked = false;
    delete (appData as any).bank_acc_no_encrypted;

    // If admin views full bank details, log audit per M4 / H1
    if (session.role === 'admin') {
      const clientIp = getClientIp(request);
      await db.logAudit({
        actor_id: session.userId,
        actor_email: session.email,
        action: 'ADMIN_DECRYPT_BANK_ACCOUNT',
        entity: 'applications',
        entity_id: application.id,
        meta: { student_id: application.student_id, ref_no: application.ref_no },
        ip: clientIp,
      });
    }
  } else if (session.role === 'reviewer') {
    const last4 = appData.bank_acc_last4 || (appData.bank_acc_no ? appData.bank_acc_no.slice(-4) : '');
    appData.bank_acc_no = last4 ? `XXXX${last4}` : 'XXXXXXXX';
    appData.is_masked = true;
    delete (appData as any).confirm_bank_acc_no;
    delete (appData as any).bank_acc_no_encrypted;
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
  // 1. CSRF Origin Verification
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const { session, errorResponse } = await getAuthorizedSession();
  if (errorResponse) {
    return errorResponse;
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

    // Reject client manipulation of forbidden server-computed / structural fields
    const FORBIDDEN_CLIENT_KEYS = [
      'scholarship_code',
      'status',
      'ref_no',
      'merit_score',
      'percentage',
      'eligibility_flags',
      'student_id',
      'cycle_id',
    ];

    for (const key of FORBIDDEN_CLIENT_KEYS) {
      if (key in body || (stepData && typeof stepData === 'object' && key in stepData)) {
        return NextResponse.json(
          { error: { message: `Modification of '${key}' is prohibited from client payload.` } },
          { status: 400 }
        );
      }
    }

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
      const rawBank = res.data.bank_acc_no;
      const encBank = encryptBankAccount(rawBank);
      const bankLast4 = rawBank.slice(-4);
      validatedCleanData = {
        ...res.data,
        bank_acc_no_encrypted: encBank,
        bank_acc_last4: bankLast4,
      };
      delete (validatedCleanData as Record<string, unknown>).bank_acc_no;
      delete (validatedCleanData as Record<string, unknown>).confirm_bank_acc_no;
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

    if (step === 5) {
      delete (mergedData as Record<string, unknown>).bank_acc_no;
      delete (mergedData as Record<string, unknown>).confirm_bank_acc_no;
    }

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

    const updated = await db.updateApplication(
      id,
      {
        data: mergedData,
        current_step: step,
        merit_score,
        computed: {
          percentage: mergedData.percentage || 0,
          merit_score,
          eligibility_flags,
        },
      },
      last_updated_at
    );

    if (!updated) {
      return NextResponse.json(
        { error: { message: 'Draft conflict: This application was updated elsewhere. Please refresh to load the latest data.' } },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      application: updated,
    });
  } catch (error: unknown) {
    console.error('Update application draft error:', error);
    return NextResponse.json({ error: { message: 'Failed to save draft' } }, { status: 500 });
  }
}
