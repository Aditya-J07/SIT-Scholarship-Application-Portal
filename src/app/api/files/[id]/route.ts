import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id: fileId } = await params;
  const fileRecord = await db.findFileById(fileId);
  if (!fileRecord) {
    return NextResponse.json({ error: { message: 'File not found' } }, { status: 404 });
  }

  const application = await db.findApplicationById(fileRecord.application_id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Associated application not found' } }, { status: 404 });
  }

  // Row Level Security check
  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Access denied to this file' } }, { status: 403 });
  }

  const fileBuffer = await storage.getFileBuffer(fileRecord.storage_path);

  if (!fileBuffer) {
    return NextResponse.json({ error: { message: 'File not found in storage' } }, { status: 404 });
  }

  // Audit staff file views per security spec
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (session.role === 'admin' || session.role === 'reviewer') {
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'STAFF_VIEW_FILE',
      entity: 'application_files',
      entity_id: fileRecord.id,
      meta: {
        application_id: application.id,
        kind: fileRecord.kind,
        file_sha256: fileRecord.sha256,
      },
      ip: clientIp,
    });
  }

  const sanitizedFilename = fileRecord.original_name.replace(/["\r\n\\]/g, '_');

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': fileRecord.mime,
      'Content-Length': fileBuffer.length.toString(),
      'Content-Disposition': `inline; filename="${sanitizedFilename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    },
  });
}
