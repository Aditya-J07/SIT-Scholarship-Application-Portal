import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-guard';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import JSZip from 'jszip';
import { storage } from '@/lib/storage';
import { maskBankAccount } from '@/lib/crypto/encryption';

/**
 * Universal CSV cell sanitizer for formula injection defense (OWASP / H4).
 * If a cell begins with '=', '+', '-', '@', '\t', or '\r', prefixes with single quote (')
 * and safely escapes double quotes.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Check for formula injection triggers
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: Request) {
  const { session, errorResponse } = await requireAdminSession({ allowReviewer: false });
  if (errorResponse) return errorResponse;

  // Rate limit: 10 exports per hour per admin
  const rateLimit = await checkRateLimit(`export:admin:${session.userId}`, 3600, 10);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';
  const scholarship = searchParams.get('scholarship') || '';
  const status = searchParams.get('status') || '';

  let apps = await db.listApplications();
  if (scholarship) {
    apps = apps.filter((a) => a.data.scholarship_code?.toUpperCase() === scholarship.toUpperCase());
  }
  if (status) {
    apps = apps.filter((a) => a.status === status);
  }

  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

  // Audit every export operation
  await db.logAudit({
    actor_id: session.userId,
    actor_email: session.email,
    action: `DATA_EXPORT_${format.toUpperCase()}`,
    entity: 'applications',
    entity_id: 'bulk_export',
    meta: {
      format,
      scholarship: scholarship || 'all',
      status: status || 'all',
      count: apps.length,
    },
    ip: clientIp,
  });

  if (format === 'csv') {
    const headers = [
      'Ref No',
      'Scholarship',
      'Status',
      'Student Name',
      'USN',
      'Mobile',
      'Email',
      'Course',
      'Year of Study',
      'Semester',
      'Marks Obtained',
      'Gross Total Marks',
      'Percentage',
      'CGPA',
      'Merit Score',
      'Family Annual Income',
      'Annual Fee',
      'Scholarship Req Per Month',
      'Masked Bank Account No',
      'Bank Name',
      'IFSC',
      'Submitted At',
      'Decision Remark',
    ].map(cell);

    const rows = apps.map((a) => [
      cell(a.ref_no),
      cell(a.data.scholarship_code || ''),
      cell(a.status),
      cell(a.data.full_name || ''),
      cell(a.data.usn || ''),
      cell(a.data.mobile || ''),
      cell(a.data.email || ''),
      cell(a.data.course || ''),
      cell(a.data.year_of_study || ''),
      cell(a.data.semester || ''),
      cell(a.data.marks_obtained || ''),
      cell(a.data.marks_gross_total || ''),
      cell(a.computed?.percentage || ''),
      cell(a.data.cgpa || ''),
      cell(a.merit_score || ''),
      cell(a.data.family_annual_income || ''),
      cell(a.data.annual_fee || ''),
      cell(a.data.scholarship_amount_required_per_month || ''),
      cell(a.data.bank_acc_no ? maskBankAccount(a.data.bank_acc_no) : ''),
      cell(a.data.bank_name || ''),
      cell(a.data.bank_ifsc || ''),
      cell(a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-IN') : ''),
      cell(a.decision_remark || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="SIT_Scholarships_Export_${new Date().toISOString().split('T')[0]}.csv"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  if (format === 'zip') {
    // Generate ZIP of PDF files
    const zip = new JSZip();
    for (const app of apps) {
      if (app.pdf_path) {
        const content = await storage.getFileBuffer(app.pdf_path);
        if (content) {
          zip.file(`${app.ref_no}.pdf`, content);
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="SIT_Scholarship_PDFs_${new Date().toISOString().split('T')[0]}.zip"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  return NextResponse.json({ error: { message: 'Unsupported format. Use csv or zip.' } }, { status: 400 });
}
