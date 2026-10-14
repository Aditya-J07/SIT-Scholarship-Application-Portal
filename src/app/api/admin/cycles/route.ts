import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { AcademicCycle } from '@/lib/types';
import crypto from 'crypto';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 403 });
  }

  const cycles = await db.listCycles();
  return NextResponse.json({ cycles });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Only Admin can configure cycles' } }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { scholarship_id, academic_year, opens_at, closes_at, status } = body;

    const cycle: AcademicCycle = {
      id: crypto.randomUUID(),
      scholarship_id,
      academic_year,
      opens_at,
      closes_at,
      status: status || 'open',
      created_at: new Date().toISOString(),
    };

    await db.createCycle(cycle);

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'CYCLE_CREATED',
      entity: 'cycles',
      entity_id: cycle.id,
      meta: { academic_year, scholarship_id },
      ip: clientIp,
    });

    return NextResponse.json({ success: true, cycle });
  } catch (error: unknown) {
    console.error('Create cycle error:', error);
    return NextResponse.json({ error: { message: 'Failed to create cycle' } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Only Admin can update cycles' } }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, academic_year, opens_at, closes_at, status } = body;

    const updated = await db.updateCycle(id, {
      ...(academic_year && { academic_year }),
      ...(opens_at && { opens_at }),
      ...(closes_at && { closes_at }),
      ...(status && { status }),
    });

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'CYCLE_UPDATED',
      entity: 'cycles',
      entity_id: id,
      meta: { opens_at, closes_at, status },
      ip: clientIp,
    });

    return NextResponse.json({ success: true, cycle: updated });
  } catch (error: unknown) {
    console.error('Update cycle error:', error);
    return NextResponse.json({ error: { message: 'Failed to update cycle' } }, { status: 500 });
  }
}
