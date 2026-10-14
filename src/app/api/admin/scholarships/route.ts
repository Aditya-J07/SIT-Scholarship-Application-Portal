import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 403 });
  }

  const scholarships = await db.listScholarships();
  const cycles = await db.listCycles();

  return NextResponse.json({ scholarships, cycles });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Only Admin can update scholarship configuration' } }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, active, fee_label, rules, name, description } = body;

    if (!id) {
      return NextResponse.json({ error: { message: 'Scholarship ID is required' } }, { status: 400 });
    }

    const updated = await db.updateScholarship(id, {
      ...(active !== undefined && { active }),
      ...(fee_label && { fee_label }),
      ...(rules && { rules }),
      ...(name && { name }),
      ...(description && { description }),
    });

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'SCHOLARSHIP_CONFIG_UPDATED',
      entity: 'scholarships',
      entity_id: id,
      meta: { active, rules },
      ip: clientIp,
    });

    return NextResponse.json({ success: true, scholarship: updated });
  } catch (error: unknown) {
    console.error('Update scholarship error:', error);
    return NextResponse.json({ error: { message: 'Failed to update scholarship' } }, { status: 500 });
  }
}
