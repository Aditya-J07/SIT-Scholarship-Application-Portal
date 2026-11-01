import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';
import { getClientIp } from '@/lib/rate-limit';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const current = await db.findDataRequestById(id);
  if (!current) {
    return NextResponse.json({ error: { message: 'Data request not found' } }, { status: 404 });
  }

  let body: { status?: string; admin_notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON request' } }, { status: 400 });
  }

  const { status, admin_notes } = body;
  const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];

  if (status && !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: { message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` } },
      { status: 400 }
    );
  }

  const isResolving = status === 'resolved' || status === 'rejected';

  const updated = await db.updateDataRequest(id, {
    ...(status && { status: status as 'pending' | 'in_progress' | 'resolved' | 'rejected' }),
    ...(admin_notes !== undefined && { admin_notes }),
    ...(isResolving && {
      resolved_by: session.userId,
      resolved_at: new Date().toISOString(),
    }),
  });

  const clientIp = getClientIp(request);
  await db.logAudit({
    actor_id: session.userId,
    actor_email: session.email,
    action: `DATA_REQUEST_${(status || 'UPDATED').toUpperCase()}`,
    entity: 'data_requests',
    entity_id: id,
    meta: {
      request_type: current.request_type,
      student_id: current.student_id,
      status,
      admin_notes,
    },
    ip: clientIp,
  });

  return NextResponse.json({ success: true, request: updated });
}
