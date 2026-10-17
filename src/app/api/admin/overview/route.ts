import { NextResponse } from 'next/server';
import { requireAdminOrReviewer } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';
import { getAdminClient } from '@/utils/supabase/admin';

export async function GET() {
  const { errorResponse } = await requireAdminOrReviewer();
  if (errorResponse) return errorResponse;

  const supabase = getAdminClient();

  // 1. Fetch all applications (server-side query)
  const { data: apps, error: appsErr } = await supabase
    .from('applications')
    .select('id, ref_no, status, cycle_id, submitted_at, created_at, data, student_id');

  if (appsErr) {
    return NextResponse.json({ error: { message: appsErr.message } }, { status: 500 });
  }

  const allApps = apps || [];

  // 2. Fetch scholarships
  const scholarships = await db.listScholarships();
  const schCodeMap = new Map(scholarships.map((s) => [s.id, s.code]));

  // 3. Counts by Status
  const countsByStatus: Record<string, number> = {
    draft: 0,
    submitted: 0,
    under_review: 0,
    needs_correction: 0,
    shortlisted: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
  };
  for (const app of allApps) {
    const s = app.status || 'draft';
    countsByStatus[s] = (countsByStatus[s] || 0) + 1;
  }

  // 4. Counts by Scholarship
  const countsByScholarship: Record<string, number> = {};
  for (const s of scholarships) {
    countsByScholarship[s.code] = 0;
  }
  for (const app of allApps) {
    const code = (app.data?.scholarship_code || 'MNC').toUpperCase();
    countsByScholarship[code] = (countsByScholarship[code] || 0) + 1;
  }

  // 5. Applications per day (last 14 days)
  const perDayMap = new Map<string, number>();
  for (const app of allApps) {
    const dateStr = (app.submitted_at || app.created_at || '').slice(0, 10);
    if (dateStr) {
      perDayMap.set(dateStr, (perDayMap.get(dateStr) || 0) + 1);
    }
  }

  // Sort dates descending
  const applicationsPerDay = Array.from(perDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  // 6. Applications missing documents (submitted/under_review apps where file count < 9)
  const { data: files } = await supabase
    .from('application_files')
    .select('application_id, kind');

  const filesByApp = new Map<string, Set<string>>();
  for (const f of files || []) {
    if (!filesByApp.has(f.application_id)) {
      filesByApp.set(f.application_id, new Set());
    }
    filesByApp.get(f.application_id)!.add(f.kind);
  }

  let missingDocumentsCount = 0;
  const missingDocumentsApps: { id: string; ref_no: string; missingCount: number }[] = [];

  for (const app of allApps) {
    // Only check submitted / under review applications
    if (['submitted', 'under_review', 'needs_correction'].includes(app.status)) {
      const uploadedKinds = filesByApp.get(app.id) || new Set();
      // Required 9 standard kinds
      const requiredCount = 9;
      if (uploadedKinds.size < requiredCount) {
        missingDocumentsCount++;
        if (missingDocumentsApps.length < 10) {
          missingDocumentsApps.push({
            id: app.id,
            ref_no: app.ref_no,
            missingCount: requiredCount - uploadedKinds.size,
          });
        }
      }
    }
  }

  return NextResponse.json({
    totalApplications: allApps.length,
    countsByStatus,
    countsByScholarship,
    applicationsPerDay,
    missingDocumentsCount,
    missingDocumentsApps,
  });
}
