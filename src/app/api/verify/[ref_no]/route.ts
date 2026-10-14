import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ref_no: string }> }
) {
  // 1. Rate limiting: 30 requests per minute per IP
  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimit(`verify:ip:${clientIp}`, 60, 30);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

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

  // Minimal public status check - zero personal details (DPDP Act compliance)
  return NextResponse.json({
    found: true,
    ref_no: application.ref_no,
    scholarship_name: scholarship?.name || application.data.scholarship_code,
    academic_year: cycle?.academic_year || 'Academic Year Unspecified',
    status: application.status,
    submitted_at: application.submitted_at,
    has_valid_pdf: Boolean(application.pdf_sha256),
    hard_copy_received: application.hard_copy_received,
    verification_status: 'AUTHENTIC_COLLEGE_RECORD',
  });
}
