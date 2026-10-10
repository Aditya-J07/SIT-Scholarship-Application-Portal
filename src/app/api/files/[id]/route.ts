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
  const fileRecord = db.findFileById(fileId);
  if (!fileRecord) {
    return NextResponse.json({ error: { message: 'File not found' } }, { status: 404 });
  }

  const application = db.findApplicationById(fileRecord.application_id);
  if (!application) {
    return NextResponse.json({ error: { message: 'Associated application not found' } }, { status: 404 });
  }

  // Row Level Security check
  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Access denied to this file' } }, { status: 403 });
  }

  const fileBuffer = await storage.getFileBuffer(fileRecord.storage_path);

  if (!fileBuffer) {
    return NextResponse.json({ error: { message: 'File not found on storage disk' } }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': fileRecord.mime,
      'Content-Length': fileBuffer.length.toString(),
      'Content-Disposition': `inline; filename="${fileRecord.original_name}"`,
      'Cache-Control': 'private, max-age=300', // 5-minute authorized cache
    },
  });
}
