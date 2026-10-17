import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const { session, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  let body: { application_ids?: string[]; remark?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON request' } }, { status: 400 });
  }

  const applicationIds = body.application_ids;
  if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
    return NextResponse.json(
      { error: { message: 'application_ids must be a non-empty array' } },
      { status: 400 }
    );
  }

  const clientIp = getClientIp(request);
  const remarkText = body.remark?.trim() || 'Selected for shortlisting by the Scholarship Committee.';

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const id of applicationIds) {
    const app = await db.findApplicationById(id);
    if (!app) {
      results.push({ id, success: false, error: 'Not found' });
      continue;
    }

    // Check allowed transition: submitted or under_review -> shortlisted
    if (!['submitted', 'under_review'].includes(app.status)) {
      results.push({
        id,
        success: false,
        error: `Cannot transition from status '${app.status}' to 'shortlisted'`,
      });
      continue;
    }

    const updated = await db.updateApplication(id, {
      status: 'shortlisted',
      decided_at: new Date().toISOString(),
      decided_by: session.userId,
      decision_remark: remarkText,
    });

    if (updated) {
      await db.addRemark({
        id: crypto.randomUUID(),
        application_id: id,
        author_id: session.userId,
        author_name: session.fullName,
        author_role: session.role,
        kind: 'decision',
        body: remarkText,
        created_at: new Date().toISOString(),
      });

      await db.logAudit({
        actor_id: session.userId,
        actor_email: session.email,
        action: 'APPLICATION_SHORTLISTED_BULK',
        entity: 'applications',
        entity_id: id,
        meta: {
          ref_no: app.ref_no,
          previous_status: app.status,
          new_status: 'shortlisted',
          remark: remarkText,
        },
        ip: clientIp,
      });

      // Send email notification safely
      const student = await db.findUserById(app.student_id);
      if (student) {
        const scholarship = await db.findScholarshipByCode(app.data.scholarship_code || 'MNC');
        await sendNotification({
          toEmail: student.email,
          toMobile: app.data.mobile || student.mobile,
          studentName: app.data.full_name || student.full_name,
          type: 'SHORTLISTED_FOR_AWARD',
          refNo: app.ref_no,
          scholarshipName: scholarship?.name,
          details: { remark: remarkText },
        });
      }

      results.push({ id, success: true });
    } else {
      results.push({ id, success: false, error: 'Database update failed' });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    success: true,
    total: applicationIds.length,
    shortlistedCount: successCount,
    results,
  });
}
