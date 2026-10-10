import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ApplicationFileRecord } from '@/lib/types';
import { storage } from '@/lib/storage';
import crypto from 'crypto';

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id: applicationId } = await params;
  const application = db.findApplicationById(applicationId);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  // Row Level Security: only the student owner or admin can upload
  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  // Cannot modify if already submitted unless in 'needs_correction'
  if (session.role === 'student' && application.status !== 'draft' && application.status !== 'needs_correction') {
    return NextResponse.json(
      { error: { message: 'Application is locked and cannot be edited after submission' } },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const kind = formData.get('kind') as ApplicationFileRecord['kind'] | null;

    if (!file || !kind) {
      return NextResponse.json({ error: { message: 'File and file kind are required' } }, { status: 400 });
    }

    const mime = file.type;
    const sizeBytes = file.size;

    // Check size limits
    const maxPhotoSize = 1 * 1024 * 1024; // 1 MB
    const maxSigSize = 350 * 1024; // 350 KB
    const maxDocSize = 2 * 1024 * 1024; // 2 MB

    if (kind === 'photo' && sizeBytes > maxPhotoSize) {
      return NextResponse.json(
        { error: { message: 'Passport photograph must be under 1 MB' } },
        { status: 400 }
      );
    }
    if ((kind === 'sig_student' || kind === 'sig_parent') && sizeBytes > maxSigSize) {
      return NextResponse.json(
        { error: { message: 'Signature file size must be under 300 KB' } },
        { status: 400 }
      );
    }
    if (sizeBytes > maxDocSize) {
      return NextResponse.json(
        { error: { message: 'Document size must not exceed 2 MB' } },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIMES.includes(mime)) {
      return NextResponse.json(
        { error: { message: 'Invalid file format. Only PDF, JPG, and PNG are accepted.' } },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes check to ensure no executables / fake extensions
    const isPdf = buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
    const isJpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47; // .PNG
    const isWebp = buffer.length > 12 && buffer.toString('ascii', 8, 12) === 'WEBP';

    if (!isPdf && !isJpg && !isPng && !isWebp) {
      return NextResponse.json(
        { error: { message: 'File failed security verification. Corrupt or invalid file content.' } },
        { status: 400 }
      );
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = isPdf ? 'pdf' : (isPng ? 'png' : 'jpg');
    const filename = `${application.id}_${kind}.${ext}`;

    await storage.saveFile(filename, buffer, mime);

    const fileRecord: ApplicationFileRecord = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      application_id: application.id,
      kind,
      storage_path: filename,
      mime,
      size_bytes: sizeBytes,
      sha256,
      original_name: file.name,
      uploaded_at: new Date().toISOString(),
    };

    db.saveFileRecord(fileRecord);

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        kind: fileRecord.kind,
        original_name: fileRecord.original_name,
        size_bytes: fileRecord.size_bytes,
        uploaded_at: fileRecord.uploaded_at,
        url: `/api/files/${fileRecord.id}`,
      },
    });
  } catch (error: unknown) {
    console.error('File upload failed:', error);
    return NextResponse.json({ error: { message: 'Failed to process file upload' } }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id: applicationId } = await params;
  const application = db.findApplicationById(applicationId);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const files = db.listFilesForApplication(applicationId).map((f) => ({
    id: f.id,
    kind: f.kind,
    original_name: f.original_name,
    size_bytes: f.size_bytes,
    mime: f.mime,
    uploaded_at: f.uploaded_at,
    url: `/api/files/${f.id}`,
  }));

  return NextResponse.json({ files });
}
