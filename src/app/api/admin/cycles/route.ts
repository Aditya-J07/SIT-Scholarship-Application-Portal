import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';
import { AcademicCycle } from '@/lib/types';
import { getClientIp } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function GET(_request?: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const cycles = await db.listCycles();
  return NextResponse.json({ cycles });
}

export async function POST(request: Request) {
  const { session, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { scholarship_id, academic_year, opens_at, closes_at, status } = body;

    const cycleStatus = status || 'closed';

    // Validation: A cycle cannot be opened without dates
    if (cycleStatus === 'open') {
      if (!opens_at || !closes_at) {
        return NextResponse.json(
          { error: { message: 'A cycle cannot be opened without both opening and closing dates configured.' } },
          { status: 400 }
        );
      }
    }

    // Validation: Closes strictly after opens
    if (opens_at && closes_at) {
      const openTime = new Date(opens_at).getTime();
      const closeTime = new Date(closes_at).getTime();
      if (isNaN(openTime) || isNaN(closeTime)) {
        return NextResponse.json(
          { error: { message: 'Invalid opening or closing date format.' } },
          { status: 400 }
        );
      }
      if (closeTime <= openTime) {
        return NextResponse.json(
          { error: { message: 'Closing date must be strictly after the opening date.' } },
          { status: 400 }
        );
      }
    }

    const cycle: AcademicCycle = {
      id: crypto.randomUUID(),
      scholarship_id,
      academic_year,
      opens_at: opens_at || null as unknown as string,
      closes_at: closes_at || null as unknown as string,
      status: cycleStatus,
      created_at: new Date().toISOString(),
    };

    await db.createCycle(cycle);

    const clientIp = getClientIp(request);
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'CYCLE_CREATED',
      entity: 'cycles',
      entity_id: cycle.id,
      meta: { academic_year, scholarship_id, status: cycleStatus, opens_at, closes_at },
      ip: clientIp,
    });

    return NextResponse.json({ success: true, cycle });
  } catch (error: unknown) {
    console.error('Create cycle error:', error);
    return NextResponse.json({ error: { message: 'Failed to create cycle' } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { session, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { id, academic_year, opens_at, closes_at, status } = body;

    if (!id) {
      return NextResponse.json({ error: { message: 'Cycle ID is required' } }, { status: 400 });
    }

    const current = await db.findCycleById(id);
    if (!current) {
      return NextResponse.json({ error: { message: 'Cycle not found' } }, { status: 404 });
    }

    const targetOpens = opens_at !== undefined ? opens_at : current.opens_at;
    const targetCloses = closes_at !== undefined ? closes_at : current.closes_at;
    const targetStatus = status !== undefined ? status : current.status;

    // Validation: A cycle cannot be opened without dates
    if (targetStatus === 'open') {
      if (!targetOpens || !targetCloses) {
        return NextResponse.json(
          { error: { message: 'A cycle cannot be opened without both opening and closing dates configured.' } },
          { status: 400 }
        );
      }
    }

    // Validation: Closes strictly after opens
    if (targetOpens && targetCloses) {
      const openTime = new Date(targetOpens).getTime();
      const closeTime = new Date(targetCloses).getTime();
      if (isNaN(openTime) || isNaN(closeTime)) {
        return NextResponse.json(
          { error: { message: 'Invalid opening or closing date format.' } },
          { status: 400 }
        );
      }
      if (closeTime <= openTime) {
        return NextResponse.json(
          { error: { message: 'Closing date must be strictly after the opening date.' } },
          { status: 400 }
        );
      }
    }

    const updated = await db.updateCycle(id, {
      ...(academic_year !== undefined && { academic_year }),
      ...(opens_at !== undefined && { opens_at }),
      ...(closes_at !== undefined && { closes_at }),
      ...(status !== undefined && { status: targetStatus }),
    });

    const clientIp = getClientIp(request);
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'CYCLE_UPDATED',
      entity: 'cycles',
      entity_id: id,
      meta: { opens_at: targetOpens, closes_at: targetCloses, status: targetStatus },
      ip: clientIp,
    });

    return NextResponse.json({ success: true, cycle: updated });
  } catch (error: unknown) {
    console.error('Update cycle error:', error);
    return NextResponse.json({ error: { message: 'Failed to update cycle' } }, { status: 500 });
  }
}
