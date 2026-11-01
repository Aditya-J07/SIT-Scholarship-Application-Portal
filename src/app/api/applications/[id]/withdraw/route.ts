import { NextResponse } from 'next/server';
import { getAuthorizedSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getClientIp } from '@/lib/rate-limit';
import { sendNotification } from '@/lib/notifications';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await getAuthorizedSession();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const application = await db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  // Ownership check: ONLY the owning student can withdraw their application (H2)
  if (session.role !== 'student' || application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  if (['accepted', 'rejected', 'withdrawn'].includes(application.status)) {
    return NextResponse.json(
      { error: { message: `Cannot withdraw application in status '${application.status}'` } },
      { status: 400 }
    );
  }

  const updated = await db.updateApplication(id, {
    status: 'withdrawn',
  });

  const clientIp = getClientIp(request);

  await db.logAudit({
    actor_id: session.userId,
    actor_email: session.email,
    action: 'APPLICATION_WITHDRAWN',
    entity: 'applications',
    entity_id: id,
    meta: { ref_no: application.ref_no },
    ip: clientIp,
  });

  const student = await db.findUserById(application.student_id);
  const scholarship = await db.findScholarshipByCode(application.data.scholarship_code || 'MNC');
  if (student) {
    await sendNotification({
      toEmail: student.email,
      toMobile: application.data.mobile || student.mobile,
      studentName: application.data.full_name || student.full_name,
      type: 'APPLICATION_WITHDRAWN',
      refNo: application.ref_no,
      scholarshipName: scholarship?.name,
    });
  }

  return NextResponse.json({ success: true, application: updated });
}
