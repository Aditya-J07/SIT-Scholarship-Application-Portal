import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ref_no: string }> }
) {
  const { ref_no } = await params;
  if (!ref_no) {
    return NextResponse.json({ error: { message: 'Reference number is required' } }, { status: 400 });
  }

  const application = await db.findApplicationByRefNo(ref_no);
  if (!application) {
    return NextResponse.json(
      { found: false, message: 'No application record found matching this reference number' },
      { status: 404 }
    );
  }

  const scholarship = await db.findScholarshipByCode(application.data.scholarship_code || 'MNC');
  const cycle = await db.findCycleById(application.cycle_id);

  // Minimal public status check - no personal details (DPDP Act compliance)
  return NextResponse.json({
    found: true,
    ref_no: application.ref_no,
    scholarship_name: scholarship?.name || application.data.scholarship_code,
    academic_year: cycle?.academic_year || '2026-2027',
    status: application.status,
    submitted_at: application.submitted_at,
    has_valid_pdf: Boolean(application.pdf_sha256),
    hard_copy_received: application.hard_copy_received,
    verification_status: 'AUTHENTIC_COLLEGE_RECORD',
  });
}
