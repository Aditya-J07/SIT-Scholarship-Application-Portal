import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const application = await db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  if (session.role === 'student' && application.student_id !== session.userId) {
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

  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

  await db.logAudit({
    actor_id: session.userId,
    actor_email: session.email,
    action: 'APPLICATION_WITHDRAWN',
    entity: 'applications',
    entity_id: id,
    meta: { ref_no: application.ref_no },
    ip: clientIp,
  });

  return NextResponse.json({ success: true, application: updated });
}
