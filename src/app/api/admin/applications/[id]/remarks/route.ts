import { NextResponse } from 'next/server';
import { requireAdminOrReviewer, canReviewerAccessDepartment } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';
import { getClientIp } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await requireAdminOrReviewer();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const application = await db.findApplicationById(id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  // Reviewer department scoping
  if (session.role === 'reviewer') {
    const reviewer = await db.findUserById(session.userId);
    const appDept = application.department || application.data?.department || application.data?.course;
    if (!canReviewerAccessDepartment(reviewer?.department, appDept)) {
      return NextResponse.json(
        { error: { message: 'Forbidden: application outside reviewer department' } },
        { status: 403 }
      );
    }
  }

  try {
    const body = await request.json();
    const { body: remarkBody, kind = 'internal_note', visible_to_student = false } = body;

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
      visible_to_student: Boolean(visible_to_student),
      created_at: new Date().toISOString(),
    });

    const clientIp = getClientIp(request);

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
