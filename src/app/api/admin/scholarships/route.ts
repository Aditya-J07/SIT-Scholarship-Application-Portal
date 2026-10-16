import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(request?: Request) {
  const { session, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const scholarships = await db.listScholarships();
  const cycles = await db.listCycles();

  return NextResponse.json({ scholarships, cycles });
}

export async function PUT(request: Request) {
  const { session, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

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

    const clientIp = getClientIp(request);

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
