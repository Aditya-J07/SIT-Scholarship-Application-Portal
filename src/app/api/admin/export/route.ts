import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-guard';
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/rate-limit';
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

  const clientIp = getClientIp(request);

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
      cell(a.data.bank_acc_last4 ? `XXXX${a.data.bank_acc_last4}` : (a.data.bank_acc_no ? maskBankAccount(a.data.bank_acc_no) : '')),
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
    // Limit one ZIP to 15 PDFs per request with paging (page parameter)
    // Ensures response body stays comfortably below Vercel's 4.5 MB serverless limit
    const PAGE_SIZE = 15;
    const rawPage = searchParams.get('page');
    const pageNum = rawPage ? parseInt(rawPage, 10) : 1;
    const page = isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;

    // Filter to applications that have generated PDFs
    const appsWithPdf = apps.filter((a) => Boolean(a.pdf_path));
    const totalPdfs = appsWithPdf.length;
    const totalPages = Math.max(1, Math.ceil(totalPdfs / PAGE_SIZE));

    if (totalPdfs === 0) {
      return NextResponse.json(
        { error: { message: 'No PDF applications found matching the selected filter criteria.' } },
        { status: 404 }
      );
    }

    if (page > totalPages) {
      return NextResponse.json(
        { error: { message: `Requested page ${page} exceeds total available pages (${totalPages}).` } },
        { status: 400 }
      );
    }

    const startIndex = (page - 1) * PAGE_SIZE;
    const pageApps = appsWithPdf.slice(startIndex, startIndex + PAGE_SIZE);

    const zip = new JSZip();
    let attachedCount = 0;
    for (const app of pageApps) {
      if (app.pdf_path) {
        const content = await storage.getFileBuffer(app.pdf_path);
        if (content) {
          zip.file(`${app.ref_no}.pdf`, content);
          attachedCount++;
        }
      }
    }

    if (attachedCount === 0) {
      return NextResponse.json(
        { error: { message: 'No valid PDF files could be retrieved for this page.' } },
        { status: 404 }
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = totalPages > 1
      ? `SIT_Scholarship_PDFs_Part${page}_of_${totalPages}_${dateStr}.zip`
      : `SIT_Scholarship_PDFs_${dateStr}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Total-Count': String(totalPdfs),
        'X-Total-Pages': String(totalPages),
        'X-Current-Page': String(page),
        'X-Page-Size': String(PAGE_SIZE),
      },
    });
  }

  return NextResponse.json({ error: { message: 'Unsupported format. Use csv or zip.' } }, { status: 400 });
}
