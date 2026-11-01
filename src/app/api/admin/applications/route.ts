import { NextResponse } from 'next/server';
import { requireAdminOrReviewer, canReviewerAccessDepartment } from '@/lib/auth/admin-guard';
import { normalizeDepartment } from '@/lib/constants/departments';
import { db } from '@/lib/db';
import { maskBankAccount } from '@/lib/crypto/field-encryption';

export async function GET(request: Request) {
  const { session, errorResponse } = await requireAdminOrReviewer();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() || '';
  const scholarship = searchParams.get('scholarship') || '';
  const status = searchParams.get('status') || '';
  const yearOfStudy = searchParams.get('year') ? Number(searchParams.get('year')) : null;
  const minIncome = searchParams.get('minIncome') ? Number(searchParams.get('minIncome')) : null;
  const maxIncome = searchParams.get('maxIncome') ? Number(searchParams.get('maxIncome')) : null;
  const fromDate = searchParams.get('fromDate') || '';
  const toDate = searchParams.get('toDate') || '';
  const hasDuplicate = searchParams.get('hasDuplicate');
  const hardCopy = searchParams.get('hardCopy');
  const sortBy = searchParams.get('sortBy') || 'merit'; // 'merit', 'income', 'date', 'ref_no'
  const sortOrder = searchParams.get('order') || 'desc';
  const departmentFilter = searchParams.get('department') || '';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = Math.max(1, Number(searchParams.get('pageSize') || 25));

  let apps = await db.listApplications();

  if (departmentFilter) {
    const normFilter = normalizeDepartment(departmentFilter);
    apps = apps.filter((a) => {
      const appDept = a.department || normalizeDepartment(a.data?.course) || a.data?.department;
      return appDept === normFilter;
    });
  }

  // Reviewer Department Scoping (Phase 3c Item 4: deny by default)
  if (session.role === 'reviewer') {
    const reviewer = await db.findUserById(session.userId);
    if (!reviewer?.department || !reviewer.department.trim()) {
      return NextResponse.json(
        { error: { message: 'Forbidden: No department assigned to reviewer account' } },
        { status: 403 }
      );
    }
    apps = apps.filter((a) => canReviewerAccessDepartment(reviewer.department, a.data.course || a.data.department || a.department));
  }

  // Compute server-side duplicate flags per cycle (Item 2)
  // Duplicates checked within the same cycle across different students:
  // - Same Bank Account (via bank_acc_hash without decrypting)
  // - Same Mobile Number
  // - Same USN
  const appsWithDuplicates = apps.map((app) => {
    const reasons: string[] = [];
    const appCycle = app.cycle_id;
    const appStudent = app.student_id;
    const appBankHash = app.bank_acc_hash;
    const appMobile = app.data.mobile?.replace(/\D/g, '');
    const appUsn = app.data.usn?.trim().toUpperCase();

    for (const other of apps) {
      if (other.id === app.id || other.student_id === appStudent || other.cycle_id !== appCycle) {
        continue;
      }

      // Check bank hash match
      if (appBankHash && other.bank_acc_hash && appBankHash === other.bank_acc_hash) {
        if (!reasons.includes('Duplicate Bank Account')) reasons.push('Duplicate Bank Account');
      }

      // Check mobile match
      const otherMobile = other.data.mobile?.replace(/\D/g, '');
      if (appMobile && otherMobile && appMobile === otherMobile) {
        if (!reasons.includes('Duplicate Mobile Number')) reasons.push('Duplicate Mobile Number');
      }

      // Check USN match
      const otherUsn = other.data.usn?.trim().toUpperCase();
      if (appUsn && otherUsn && appUsn === otherUsn) {
        if (!reasons.includes('Duplicate USN')) reasons.push('Duplicate USN');
      }
    }

    return {
      ...app,
      duplicate_flags: {
        has_duplicate: reasons.length > 0,
        reasons,
      },
    };
  });

  let filtered = appsWithDuplicates;

  // Search filter (Name, USN, Mobile, Reference Number)
  if (search) {
    filtered = filtered.filter((a) => {
      const name = a.data.full_name?.toLowerCase() || '';
      const usn = a.data.usn?.toLowerCase() || '';
      const mobile = a.data.mobile || '';
      const ref = a.ref_no.toLowerCase();
      return name.includes(search) || usn.includes(search) || mobile.includes(search) || ref.includes(search);
    });
  }

  // Scholarship filter
  if (scholarship) {
    filtered = filtered.filter(
      (a) => a.data.scholarship_code?.toUpperCase() === scholarship.toUpperCase()
    );
  }

  // Status filter
  if (status) {
    filtered = filtered.filter((a) => a.status === status);
  }

  // Year of study filter
  if (yearOfStudy) {
    filtered = filtered.filter((a) => a.data.year_of_study === yearOfStudy);
  }

  // Income range filter
  if (minIncome !== null) {
    filtered = filtered.filter((a) => (a.data.family_annual_income || 0) >= minIncome);
  }
  if (maxIncome !== null) {
    filtered = filtered.filter((a) => (a.data.family_annual_income || 0) <= maxIncome);
  }

  // Date range filter
  if (fromDate) {
    const fromTime = new Date(fromDate).getTime();
    filtered = filtered.filter((a) => new Date(a.submitted_at || a.created_at).getTime() >= fromTime);
  }
  if (toDate) {
    const toTime = new Date(toDate).getTime();
    filtered = filtered.filter((a) => new Date(a.submitted_at || a.created_at).getTime() <= toTime);
  }

  // Duplicate flag filter
  if (hasDuplicate === 'true') {
    filtered = filtered.filter((a) => a.duplicate_flags.has_duplicate);
  } else if (hasDuplicate === 'false') {
    filtered = filtered.filter((a) => !a.duplicate_flags.has_duplicate);
  }

  // Hard copy received filter (Item 4)
  if (hardCopy === 'true') {
    filtered = filtered.filter((a) => Boolean(a.hard_copy_received));
  } else if (hardCopy === 'false') {
    filtered = filtered.filter((a) => !a.hard_copy_received);
  }

  // Sorting: Default sort is merit score descending within a cycle
  filtered.sort((a, b) => {
    if (sortBy === 'merit') {
      const cycleDiff = (a.cycle_id || '').localeCompare(b.cycle_id || '');
      if (cycleDiff !== 0) return cycleDiff;
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
    if (sortBy === 'ref_no') {
      return sortOrder === 'asc'
        ? a.ref_no.localeCompare(b.ref_no)
        : b.ref_no.localeCompare(a.ref_no);
    }
    return 0;
  });

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Mask bank account numbers in returned applications
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
  const summary = {
    totalApplications: appsWithDuplicates.length,
    submittedCount: appsWithDuplicates.filter((a) => a.status === 'submitted').length,
    underReviewCount: appsWithDuplicates.filter((a) => a.status === 'under_review').length,
    shortlistedCount: appsWithDuplicates.filter((a) => a.status === 'shortlisted').length,
    acceptedCount: appsWithDuplicates.filter((a) => a.status === 'accepted').length,
    rejectedCount: appsWithDuplicates.filter((a) => a.status === 'rejected').length,
    needsCorrectionCount: appsWithDuplicates.filter((a) => a.status === 'needs_correction').length,
    duplicateCount: appsWithDuplicates.filter((a) => a.duplicate_flags.has_duplicate).length,
    hardCopyCount: appsWithDuplicates.filter((a) => a.hard_copy_received).length,
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
