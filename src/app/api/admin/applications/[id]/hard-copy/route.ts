import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const application = await db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  let body: { hard_copy_received?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON request' } }, { status: 400 });
  }

  const hardCopyReceived = Boolean(body.hard_copy_received);
  const hardCopyReceivedAt = hardCopyReceived ? new Date().toISOString() : null;

  const updated = await db.updateApplication(id, {
    hard_copy_received: hardCopyReceived,
    hard_copy_received_at: hardCopyReceivedAt || undefined,
  });

  const clientIp = getClientIp(request);
  await db.logAudit({
    actor_id: session.userId,
    actor_email: session.email,
    action: 'HARD_COPY_RECEIVED_TOGGLED',
    entity: 'applications',
    entity_id: id,
    meta: {
      ref_no: application.ref_no,
      hard_copy_received: hardCopyReceived,
      hard_copy_received_at: hardCopyReceivedAt,
    },
    ip: clientIp,
  });

  return NextResponse.json({ success: true, application: updated });
}
