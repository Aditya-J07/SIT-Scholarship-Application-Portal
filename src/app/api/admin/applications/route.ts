import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { maskBankAccount } from '@/lib/crypto/encryption';

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== 'admin' && session.role !== 'reviewer')) {
    return NextResponse.json({ error: { message: 'Unauthorized staff access required' } }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() || '';
  const scholarship = searchParams.get('scholarship') || '';
  const status = searchParams.get('status') || '';
  const yearOfStudy = searchParams.get('year') ? Number(searchParams.get('year')) : null;
  const sortBy = searchParams.get('sortBy') || 'merit'; // 'merit', 'income', 'date'
  const sortOrder = searchParams.get('order') || 'desc';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = Math.max(1, Number(searchParams.get('pageSize') || 25));

  let apps = await db.listApplications();

  // Search filter
  if (search) {
    apps = apps.filter((a) => {
      const name = a.data.full_name?.toLowerCase() || '';
      const usn = a.data.usn?.toLowerCase() || '';
      const mobile = a.data.mobile || '';
      const ref = a.ref_no.toLowerCase();
      return name.includes(search) || usn.includes(search) || mobile.includes(search) || ref.includes(search);
    });
  }

  // Scholarship filter
  if (scholarship) {
    apps = apps.filter((a) => a.data.scholarship_code?.toUpperCase() === scholarship.toUpperCase());
  }

  // Status filter
  if (status) {
    apps = apps.filter((a) => a.status === status);
  }

  // Year of study filter
  if (yearOfStudy) {
    apps = apps.filter((a) => a.data.year_of_study === yearOfStudy);
  }

  // Sorting
  apps.sort((a, b) => {
    if (sortBy === 'merit') {
      const diff = (b.merit_score || 0) - (a.merit_score || 0);
      return sortOrder === 'asc' ? -diff : diff;
    }
    if (sortBy === 'income') {
      const diff = (b.data.family_annual_income || 0) - (a.data.family_annual_income || 0);
      return sortOrder === 'asc' ? -diff : diff;
    }
    if (sortBy === 'date') {
      const timeA = new Date(a.submitted_at || a.created_at).getTime();
      const timeB = new Date(b.submitted_at || b.created_at).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    }
    return 0;
  });

  const total = apps.length;
  const paginated = apps.slice((page - 1) * pageSize, page * pageSize);

  // Mask bank account numbers in application table per DPDP compliance
  const maskedApps = paginated.map((app) => ({
    ...app,
    data: {
      ...app.data,
      bank_acc_no: app.data.bank_acc_no ? maskBankAccount(app.data.bank_acc_no) : undefined,
      confirm_bank_acc_no: app.data.confirm_bank_acc_no
        ? maskBankAccount(app.data.confirm_bank_acc_no)
        : undefined,
    },
  }));

  // Summary counts for dashboard overview
  const allApps = await db.listApplications();
  const summary = {
    totalApplications: allApps.length,
    submittedCount: allApps.filter((a) => a.status === 'submitted').length,
    underReviewCount: allApps.filter((a) => a.status === 'under_review').length,
    shortlistedCount: allApps.filter((a) => a.status === 'shortlisted').length,
    acceptedCount: allApps.filter((a) => a.status === 'accepted').length,
    rejectedCount: allApps.filter((a) => a.status === 'rejected').length,
    needsCorrectionCount: allApps.filter((a) => a.status === 'needs_correction').length,
  };

  return NextResponse.json({
    applications: maskedApps,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    summary,
  });
}
