import { NextResponse } from 'next/server';
import { requireAdminOrReviewer } from '@/lib/auth/admin-guard';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { errorResponse } = await requireAdminOrReviewer();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || undefined;

  const requests = await db.listDataRequests(statusFilter);
  return NextResponse.json({ requests });
}
