import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || (session.role !== 'admin' && session.role !== 'reviewer')) {
    return NextResponse.json({ error: { message: 'Unauthorized staff access required' } }, { status: 403 });
  }

  const { id } = await params;
  const application = await db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { body: remarkBody, kind = 'internal_note' } = body;

    if (!remarkBody || remarkBody.trim().length === 0) {
      return NextResponse.json({ error: { message: 'Remark cannot be empty' } }, { status: 400 });
    }

    const remark = await db.addRemark({
      id: crypto.randomUUID(),
      application_id: id,
      author_id: session.userId,
      author_name: session.fullName,
      author_role: session.role,
      kind,
      body: remarkBody.trim(),
      created_at: new Date().toISOString(),
    });

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'REMARK_ADDED',
      entity: 'remarks',
      entity_id: remark.id,
      meta: { application_id: id, kind },
      ip: clientIp,
    });

    return NextResponse.json({ success: true, remark });
  } catch (error: unknown) {
    console.error('Add remark error:', error);
    return NextResponse.json({ error: { message: 'Failed to record remark' } }, { status: 500 });
  }
}
