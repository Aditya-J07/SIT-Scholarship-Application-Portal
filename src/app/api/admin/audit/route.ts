import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';

export async function GET(request?: Request) {
  const { session, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const logs = await db.listAuditLogs();
  return NextResponse.json({ logs });
}

