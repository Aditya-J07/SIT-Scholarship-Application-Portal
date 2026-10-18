import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthorizedSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { fullApplicationSchema } from '@/lib/schemas/application';
import { evaluateEligibility } from '@/lib/eligibility';
import { calculateMeritScore, calculatePercentage } from '@/lib/merit';
import { generateApplicationPdf } from '@/lib/pdf/generatePdf';
import { sendNotification } from '@/lib/notifications';
import { storage } from '@/lib/storage';
import { ApplicationFormData, ApplicationFileRecord } from '@/lib/types';
import { getClientIp } from '@/lib/rate-limit';
import { decryptBankAccount, encryptBankAccount } from '@/lib/crypto/field-encryption';
import { normalizeDepartment } from '@/lib/constants/departments';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await getAuthorizedSession();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const application = await db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  // Ownership check: ONLY the owning student can submit an application (H2)
  if (session.role !== 'student' || application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  // Idempotency: Prevent double submit race condition
  if (application.status !== 'draft' && application.status !== 'needs_correction') {
    return NextResponse.json(
      { error: { message: `This application has already been submitted (Status: ${application.status}).` } },
      { status: 400 }
    );
  }

  // Check verified email confirmation status from Supabase Auth (Fail closed per M10)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isConfirmed = Boolean(user?.email_confirmed_at);

  if (!isConfirmed) {
    return NextResponse.json(
      {
        error: {
          message:
            "Your email address must be verified before submitting your application. Please check your inbox for the verification link.",
        },
      },
      { status: 403 }
    );
  }

  // Check Cycle Window using server time
  const cycle = await db.findCycleById(application.cycle_id);
  if (!cycle) {
    return NextResponse.json({ error: { message: 'Application cycle not found' } }, { status: 400 });
  }

  const now = new Date();
  if (cycle.status !== 'open') {
    return NextResponse.json(
      { error: { message: 'Applications for this cycle are currently closed.' } },
      { status: 400 }
    );
  }

  if (!cycle.opens_at || !cycle.closes_at) {
    return NextResponse.json(
      { error: { message: 'Official cycle dates have not been confirmed by the Accounts Section. Applications cannot be submitted.' } },
      { status: 400 }
    );
  }

  if (now < new Date(cycle.opens_at)) {
    return NextResponse.json(
      { error: { message: `The application window has not opened yet (Opens: ${new Date(cycle.opens_at).toLocaleDateString()}).` } },
      { status: 400 }
    );
  }

  if (now > new Date(cycle.closes_at)) {
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
    // 1. Validate full form data with strict Zod schema (decrypt bank details if already stored encrypted)
    const rawData = { ...application.data };
    if (rawData.bank_acc_no_encrypted && !rawData.bank_acc_no) {
      rawData.bank_acc_no = decryptBankAccount(rawData.bank_acc_no_encrypted);
      rawData.confirm_bank_acc_no = rawData.bank_acc_no;
    }

    const validationResult = fullApplicationSchema.safeParse(rawData);
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
    // Per-scholarship required documents support
    const files = await db.listFilesForApplication(application.id);
    const uploadedKinds = new Set(files.map((f: ApplicationFileRecord) => f.kind));

    const defaultRequiredFiles = [
      'photo',
      'sig_student',
      'sig_parent',
      'cet_order',
      'marks_card',
      'income_cert',
      'aadhaar',
      'fee_receipt',
      'principal_cert',
    ];

    const requiredFiles = (
      scholarship.rules?.required_documents &&
      Array.isArray(scholarship.rules.required_documents) &&
      scholarship.rules.required_documents.length > 0
    )
      ? scholarship.rules.required_documents
      : defaultRequiredFiles;

    const missingFiles = requiredFiles.filter((k: string) => !uploadedKinds.has(k as ApplicationFileRecord['kind']));

    if (missingFiles.length > 0) {
      return NextResponse.json(
        {
          error: {
            message: `Please upload all required files before submitting. Missing: ${missingFiles.join(', ')}`,
            missingFiles,
            missing_documents: missingFiles,
          },
          missingFiles,
          missing_documents: missingFiles,
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

    // 4. Generate Official Server-Side Final PDF (full decrypted bank number included in signed form per H1)
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

    // M10: Versioned PDF saving. Increment version N so previous submissions are never overwritten
    let nextVersionNum = 1;
    if (application.pdf_path) {
      const match = application.pdf_path.match(/final-v(\d+)\.pdf/);
      if (match) {
        nextVersionNum = parseInt(match[1], 10) + 1;
      } else {
        nextVersionNum = 2;
      }
    }
    const version = `v${nextVersionNum}`;
    const pdfFileName = `${application.id}/final-${version}.pdf`;

    await storage.saveFile(pdfFileName, pdfBuffer, 'application/pdf');

    // 5. Update Application Record in DB with encrypted bank account (H1)
    const encBank = rawData.bank_acc_no_encrypted || encryptBankAccount(validatedData.bank_acc_no);
    const bankLast4 = validatedData.bank_acc_no.slice(-4);
    const normalizedDept = normalizeDepartment(validatedData.course) || validatedData.course;
    const dataToSave = {
      ...validatedData,
      department: normalizedDept,
      bank_acc_no_encrypted: encBank,
      bank_acc_last4: bankLast4,
    };
    delete (dataToSave as Record<string, unknown>).bank_acc_no;
    delete (dataToSave as Record<string, unknown>).confirm_bank_acc_no;

    const finalApp = await db.submitApplication(application.id, {
      pdf_path: pdfFileName,
      pdf_sha256: sha256,
      merit_score,
      department: normalizedDept,
      data: dataToSave,
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

    const clientIp = getClientIp(request);

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
