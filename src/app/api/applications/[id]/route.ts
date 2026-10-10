import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { calculateMeritScore, calculatePercentage } from '@/lib/merit';
import { evaluateEligibility } from '@/lib/eligibility';
import { step1Schema, step2Schema, step3Schema, step4Schema, step5Schema } from '@/lib/schemas/application';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const application = db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  // Row Level Security: student can only access their own
  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const scholarship = db.findScholarshipByCode(application.data.scholarship_code || 'MNC');
  const files = db.listFilesForApplication(application.id).map((f) => ({
    id: f.id,
    kind: f.kind,
    original_name: f.original_name,
    size_bytes: f.size_bytes,
    mime: f.mime,
    uploaded_at: f.uploaded_at,
    url: `/api/files/${f.id}`,
  }));
  const remarks = db.listRemarksForApplication(application.id);

  return NextResponse.json({
    application,
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
  const application = db.findApplicationById(id);
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
    const { step, stepData } = body;

    // Optional validation per step (if step is specified)
    if (step === 1 && stepData) {
      const res = step1Schema.safeParse(stepData);
      if (!res.success) {
        return NextResponse.json(
          { error: { message: res.error.issues[0].message, fields: res.error.flatten().fieldErrors } },
          { status: 400 }
        );
      }
    } else if (step === 2 && stepData) {
      const res = step2Schema.safeParse(stepData);
      if (!res.success) {
        return NextResponse.json(
          { error: { message: res.error.issues[0].message, fields: res.error.flatten().fieldErrors } },
          { status: 400 }
        );
      }
    } else if (step === 3 && stepData) {
      const res = step3Schema.safeParse(stepData);
      if (!res.success) {
        return NextResponse.json(
          { error: { message: res.error.issues[0].message, fields: res.error.flatten().fieldErrors } },
          { status: 400 }
        );
      }
    } else if (step === 4 && stepData) {
      const res = step4Schema.safeParse(stepData);
      if (!res.success) {
        return NextResponse.json(
          { error: { message: res.error.issues[0].message, fields: res.error.flatten().fieldErrors } },
          { status: 400 }
        );
      }
    } else if (step === 5 && stepData) {
      const res = step5Schema.safeParse(stepData);
      if (!res.success) {
        return NextResponse.json(
          { error: { message: res.error.issues[0].message, fields: res.error.flatten().fieldErrors } },
          { status: 400 }
        );
      }
    }

    const mergedData = {
      ...application.data,
      ...(stepData || {}),
    };

    // Auto-calculate percentage
    if (mergedData.marks_obtained && mergedData.marks_gross_total) {
      mergedData.percentage = calculatePercentage(
        mergedData.marks_obtained,
        mergedData.marks_gross_total
      );
    }

    const scholarship = db.findScholarshipByCode(mergedData.scholarship_code || 'MNC');
    const merit_score = calculateMeritScore(mergedData);
    const eligibility_flags = evaluateEligibility(
      mergedData,
      scholarship?.rules || {},
      scholarship?.code || 'MNC'
    );

    const updated = db.updateApplication(id, {
      data: mergedData,
      current_step: typeof step === 'number' ? step : application.current_step,
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
