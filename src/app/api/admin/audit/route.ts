import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';

export async function GET(_request?: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const logs = await db.listAuditLogs();
  return NextResponse.json({ logs });
}

