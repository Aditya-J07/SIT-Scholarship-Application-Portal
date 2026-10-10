import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import JSZip from 'jszip';
import { storage } from '@/lib/storage';

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Unauthorized administrator access required' } }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';
  const scholarship = searchParams.get('scholarship') || '';
  const status = searchParams.get('status') || '';

  let apps = db.listApplications();
  if (scholarship) {
    apps = apps.filter((a) => a.data.scholarship_code?.toUpperCase() === scholarship.toUpperCase());
  }
  if (status) {
    apps = apps.filter((a) => a.status === status);
  }

  if (format === 'csv') {
    // Generate CSV
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
      'Bank Account No',
      'Bank Name',
      'IFSC',
      'Submitted At',
      'Decision Remark',
    ];

    const rows = apps.map((a) => [
      a.ref_no,
      a.data.scholarship_code || '',
      a.status,
      `"${(a.data.full_name || '').replace(/"/g, '""')}"`,
      a.data.usn || '',
      a.data.mobile || '',
      a.data.email || '',
      `"${(a.data.course || '').replace(/"/g, '""')}"`,
      a.data.year_of_study || '',
      a.data.semester || '',
      a.data.marks_obtained || '',
      a.data.marks_gross_total || '',
      a.computed?.percentage || '',
      a.data.cgpa || '',
      a.merit_score || '',
      a.data.family_annual_income || '',
      a.data.annual_fee || '',
      a.data.scholarship_amount_required_per_month || '',
      `"${a.data.bank_acc_no || ''}"`,
      `"${(a.data.bank_name || '').replace(/"/g, '""')}"`,
      a.data.bank_ifsc || '',
      a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-IN') : '',
      `"${(a.decision_remark || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="SIT_Scholarships_Export_${new Date().toISOString().split('T')[0]}.csv"`,
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
      },
    });
  }

  return NextResponse.json({ error: { message: 'Unsupported format. Use csv or zip.' } }, { status: 400 });
}
