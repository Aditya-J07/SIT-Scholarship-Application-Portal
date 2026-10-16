import { NextResponse } from 'next/server';
import { getAdminClient } from '@/utils/supabase/admin';

/**
 * Vercel Cron handler for cleaning up expired rate limit entries.
 * Protected by CRON_SECRET authorization header.
 */
async function handleCleanup(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const { data, error } = await admin.rpc('cleanup_expired_rate_limits');

    if (error) {
      console.error('[CRON] Failed to cleanup expired rate limits:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted_rows: data ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[CRON] Exception in cleanup_expired_rate_limits:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCleanup(request);
}

export async function POST(request: Request) {
  return handleCleanup(request);
}
