import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 403 });
  }

  const logs = await db.listAuditLogs();
  return NextResponse.json({ logs });
}
