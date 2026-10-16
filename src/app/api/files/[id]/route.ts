import { NextResponse } from 'next/server';
import { getAuthorizedSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await getAuthorizedSession();
  if (errorResponse) {
    return errorResponse;
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

  // Row Level Security check: Students can only view their own files; staff can view all per role
  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Access denied to this file' } }, { status: 403 });
  }

  const fileBuffer = await storage.getFileBuffer(fileRecord.storage_path);
  if (!fileBuffer) {
    return NextResponse.json({ error: { message: 'File not found in storage' } }, { status: 404 });
  }

  const clientIp = getClientIp(request);

  // Log staff views of sensitive personal data (Aadhaar, income certificate, bank data)
  if (session.role === 'admin' || session.role === 'reviewer') {
    const isSensitive = ['aadhaar', 'income_cert'].includes(fileRecord.kind);
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: isSensitive ? 'STAFF_SENSITIVE_DOCUMENT_VIEWED' : 'STAFF_DOCUMENT_VIEWED',
      entity: 'application_files',
      entity_id: fileRecord.id,
      meta: {
        application_id: application.id,
        ref_no: application.ref_no,
        kind: fileRecord.kind,
        is_sensitive: isSensitive,
      },
      ip: clientIp,
    });
  }

  // Sanitized ASCII filename for Content-Disposition
  const sanitizedFilename = fileRecord.original_name
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\r\n\\]/g, '_');

  const isImageOrPdf =
    fileRecord.mime === 'application/pdf' ||
    fileRecord.mime.startsWith('image/');
  const dispositionType = isImageOrPdf ? 'inline' : 'attachment';

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': fileRecord.mime,
      'Content-Length': fileBuffer.length.toString(),
      'Content-Disposition': `${dispositionType}; filename="${sanitizedFilename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    },
  });
}
