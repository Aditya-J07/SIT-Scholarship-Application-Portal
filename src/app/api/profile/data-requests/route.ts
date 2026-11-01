import { NextResponse } from 'next/server';
import { getAuthorizedSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getClientIp } from '@/lib/rate-limit';

export async function GET() {
  const { session, errorResponse } = await getAuthorizedSession();
  if (errorResponse) return errorResponse;

  if (session.role !== 'student') {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const requests = await db.findDataRequestsForStudent(session.userId);
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const { session, errorResponse } = await getAuthorizedSession();
  if (errorResponse) return errorResponse;

  if (session.role !== 'student') {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  let body: { request_type?: string; details?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON request' } }, { status: 400 });
  }

  const { request_type, details } = body;

  if (!request_type || !['correction', 'deletion'].includes(request_type)) {
    return NextResponse.json(
      { error: { message: "Invalid request_type. Must be 'correction' or 'deletion'." } },
      { status: 400 }
    );
  }

  if (!details || details.trim().length === 0) {
    return NextResponse.json(
      { error: { message: 'Please provide detailed instructions for your data request.' } },
      { status: 400 }
    );
  }

  const dataRequest = await db.createDataRequest({
    student_id: session.userId,
    student_email: session.email,
    request_type: request_type as 'correction' | 'deletion',
    details: details.trim(),
    status: 'pending',
  });

  const clientIp = getClientIp(request);
  await db.logAudit({
    actor_id: session.userId,
    actor_email: session.email,
    action: `STUDENT_DATA_REQUEST_${request_type.toUpperCase()}`,
    entity: 'data_requests',
    entity_id: dataRequest.id,
    meta: { request_type },
    ip: clientIp,
  });

  return NextResponse.json({ success: true, request: dataRequest });
}
