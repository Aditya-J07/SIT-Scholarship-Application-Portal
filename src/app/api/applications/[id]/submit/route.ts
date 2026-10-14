import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { fullApplicationSchema } from '@/lib/schemas/application';
import { evaluateEligibility } from '@/lib/eligibility';
import { calculateMeritScore, calculatePercentage } from '@/lib/merit';
import { generateApplicationPdf } from '@/lib/pdf/generatePdf';
import { sendNotification } from '@/lib/notifications';
import { storage } from '@/lib/storage';
import { ApplicationFormData, ApplicationFileRecord } from '@/lib/types';

export async function POST(
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

  // Idempotency: Prevent double submit race condition
  if (application.status !== 'draft' && application.status !== 'needs_correction') {
    return NextResponse.json(
      { error: { message: `This application has already been submitted (Status: ${application.status}).` } },
      { status: 400 }
    );
  }

  // Check Cycle Window using server time
  const cycle = await db.findCycleById(application.cycle_id);
  if (!cycle) {
    return NextResponse.json({ error: { message: 'Application cycle not found' } }, { status: 400 });
  }

  const now = new Date();
  if (new Date(cycle.closes_at) < now) {
    return NextResponse.json(
      { error: { message: `The application deadline (${new Date(cycle.closes_at).toLocaleDateString()}) has passed. Submissions are closed.` } },
      { status: 400 }
    );
  }

  const scholarship = await db.findScholarshipByCode(application.data.scholarship_code || 'MNC');
  if (!scholarship) {
    return NextResponse.json({ error: { message: 'Scholarship not found' } }, { status: 400 });
  }

  try {
    // 1. Validate full form data with strict Zod schema
    const validationResult = fullApplicationSchema.safeParse(application.data);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        {
          error: {
            message: `Validation Error in ${firstError.path.join('.')}: ${firstError.message}`,
            fields: validationResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data as ApplicationFormData;

    // Auto-calculate percentage strictly on the server
    if (validatedData.marks_obtained && validatedData.marks_gross_total) {
      validatedData.percentage = calculatePercentage(
        validatedData.marks_obtained,
        validatedData.marks_gross_total
      );
    }

    // 2. Check File Uploads (Photo, Signatures, Enclosures)
    const files = await db.listFilesForApplication(application.id);
    const uploadedKinds = new Set(files.map((f: ApplicationFileRecord) => f.kind));

    const requiredFiles = [
      'photo',
      'sig_student',
      'sig_parent',
      'cet_order',
      'marks_card',
      'income_cert',
      'aadhaar',
      'fee_receipt',
      'principal_cert',
    ] as const;

    const missingFiles = requiredFiles.filter((k) => !uploadedKinds.has(k));

    if (missingFiles.length > 0) {
      return NextResponse.json(
        {
          error: {
            message: `Please upload all required files before submitting. Missing: ${missingFiles.join(', ')}`,
            missingFiles,
          },
        },
        { status: 400 }
      );
    }

    // 3. Evaluate Eligibility Hard Rules
    const eligibility_flags = evaluateEligibility(validatedData, scholarship.rules, scholarship.code);

    if (!eligibility_flags.passed_all_hard_rules && !scholarship.rules.allow_submit_with_warning) {
      return NextResponse.json(
        {
          error: {
            message: `Eligibility Check Failed: ${eligibility_flags.errors.join(' | ')}`,
            eligibility_flags,
          },
        },
        { status: 400 }
      );
    }

    const merit_score = calculateMeritScore(validatedData);

    // 4. Generate Official Server-Side Final PDF
    const updatedApplicationObj = {
      ...application,
      data: validatedData,
      status: 'submitted' as const,
      merit_score,
      computed: {
        percentage: validatedData.percentage || 0,
        merit_score,
        eligibility_flags,
      },
    };

    const { pdfBuffer, sha256 } = await generateApplicationPdf(
      updatedApplicationObj,
      scholarship,
      { isDraft: false }
    );

    // M9: Versioned PDF saving. If cloud storage upload fails, abort and leave as draft!
    const version = application.pdf_path ? 'v2' : 'v1';
    const pdfFileName = `${application.id}/final-${version}.pdf`;

    await storage.saveFile(pdfFileName, pdfBuffer, 'application/pdf');

    // 5. Update Application Record in DB only AFTER successful storage save with idempotent submit
    const finalApp = await db.submitApplication(application.id, {
      pdf_path: pdfFileName,
      pdf_sha256: sha256,
      merit_score,
      data: validatedData,
      computed: {
        percentage: validatedData.percentage || 0,
        merit_score,
        eligibility_flags,
      },
    });

    if (!finalApp) {
      return NextResponse.json(
        { error: { message: 'Application has already been submitted or is no longer in draft state.' } },
        { status: 400 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    // 6. Audit Log
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'APPLICATION_SUBMITTED',
      entity: 'applications',
      entity_id: application.id,
      meta: {
        ref_no: application.ref_no,
        scholarship: scholarship.code,
        merit_score,
        sha256,
        version,
      },
      ip: clientIp,
    });

    // 7. Dispatch Notification
    await sendNotification({
      toEmail: session.email,
      toMobile: validatedData.mobile,
      studentName: validatedData.full_name,
      type: 'APPLICATION_SUBMITTED',
      refNo: application.ref_no,
      scholarshipName: scholarship.name,
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: finalApp,
      ref_no: application.ref_no,
    });
  } catch (error: unknown) {
    console.error('Submission failed:', error);
    return NextResponse.json(
      { error: { message: 'Submission failed due to an unexpected error. Application remains as draft.' } },
      { status: 500 }
    );
  }
}
