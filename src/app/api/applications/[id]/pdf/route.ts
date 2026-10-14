import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { generateApplicationPdf } from '@/lib/pdf/generatePdf';
import { storage } from '@/lib/storage';

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

  // Row Level Security check
  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const forceDraft = searchParams.get('draft') === 'true';

  const scholarship = await db.findScholarshipByCode(application.data.scholarship_code || 'MNC');
  if (!scholarship) {
    return NextResponse.json({ error: { message: 'Scholarship not found' } }, { status: 404 });
  }

  // If application is submitted and final PDF exists in storage and not forced draft:
  if (!forceDraft && application.pdf_path && application.status !== 'draft') {
    const pdfBuffer = await storage.getFileBuffer(application.pdf_path);
    if (pdfBuffer) {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${application.ref_no}.pdf"`,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
  }

  // Generate on-the-fly (Draft preview or fresh copy)
  try {
    const isDraft = forceDraft || application.status === 'draft';
    const { pdfBuffer } = await generateApplicationPdf(application, scholarship, { isDraft });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${application.ref_no}_${isDraft ? 'DRAFT' : 'OFFICIAL'}.pdf"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    console.error('PDF generation error:', err);
    return NextResponse.json(
      { error: { message: 'Failed to generate PDF document' } },
      { status: 500 }
    );
  }
}
