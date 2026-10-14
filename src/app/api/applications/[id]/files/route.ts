import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ApplicationFileRecord } from '@/lib/types';
import { storage } from '@/lib/storage';
import crypto from 'crypto';

const ALLOWED_KINDS = new Set([
  'photo',
  'sig_student',
  'sig_parent',
  'cet_order',
  'marks_card',
  'income_cert',
  'aadhaar',
  'fee_receipt',
  'principal_cert',
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id: applicationId } = await params;
  const application = await db.findApplicationById(applicationId);
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

    if (!file || !kind || !ALLOWED_KINDS.has(kind)) {
      return NextResponse.json(
        { error: { message: 'Invalid upload request. File and valid file kind are required.' } },
        { status: 400 }
      );
    }

    const sizeBytes = file.size;

    // Strict size limits
    const maxPhotoSize = 1 * 1024 * 1024; // 1 MB
    const maxSigSize = 500 * 1024; // 500 KB
    const maxDocSize = 3 * 1024 * 1024; // 3 MB

    if (kind === 'photo' && sizeBytes > maxPhotoSize) {
      return NextResponse.json(
        { error: { message: 'Passport photograph must be under 1 MB' } },
        { status: 400 }
      );
    }
    if ((kind === 'sig_student' || kind === 'sig_parent') && sizeBytes > maxSigSize) {
      return NextResponse.json(
        { error: { message: 'Signature file size must be under 500 KB' } },
        { status: 400 }
      );
    }
    if (sizeBytes > maxDocSize) {
      return NextResponse.json(
        { error: { message: 'Document size must not exceed 3 MB' } },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic byte sniffing to identify genuine MIME type
    const isPdf = buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
    const isJpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47; // .PNG
    const isWebp = buffer.length > 12 && buffer.toString('ascii', 8, 12) === 'WEBP';

    if (!isPdf && !isJpg && !isPng && !isWebp) {
      return NextResponse.json(
        { error: { message: 'File rejected. Only valid PDF, JPEG, PNG, and WEBP formats are accepted.' } },
        { status: 400 }
      );
    }

    // Photo and signatures MUST be images, never PDF
    if ((kind === 'photo' || kind === 'sig_student' || kind === 'sig_parent') && isPdf) {
      return NextResponse.json(
        { error: { message: 'Photographs and signatures must be images (JPG/PNG/WEBP), not PDF documents.' } },
        { status: 400 }
      );
    }

    let detectedMime = 'application/octet-stream';
    let ext = 'bin';
    if (isPdf) {
      detectedMime = 'application/pdf';
      ext = 'pdf';
    } else if (isPng) {
      detectedMime = 'image/png';
      ext = 'png';
    } else if (isWebp) {
      detectedMime = 'image/webp';
      ext = 'webp';
    } else if (isJpg) {
      detectedMime = 'image/jpeg';
      ext = 'jpg';
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const safeFileId = crypto.randomUUID();
    const storagePath = `${application.id}/${kind}-${safeFileId}.${ext}`;

    await storage.saveFile(storagePath, buffer, detectedMime);

    // Sanitize original filename (remove path traversal attempts and control chars)
    const sanitizedName = file.name
      .replace(/[^\w.-]/g, '_')
      .replace(/\.\.+/g, '.')
      .slice(0, 100);

    const fileRecord: ApplicationFileRecord = {
      id: safeFileId,
      application_id: application.id,
      kind,
      storage_path: storagePath,
      mime: detectedMime,
      size_bytes: sizeBytes,
      sha256,
      original_name: sanitizedName || `${kind}.${ext}`,
      uploaded_at: new Date().toISOString(),
    };

    await db.saveFileRecord(fileRecord);

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    await db.logAudit({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'FILE_UPLOADED',
      entity: 'application_files',
      entity_id: fileRecord.id,
      meta: {
        application_id: application.id,
        kind,
        sha256,
        size_bytes: sizeBytes,
      },
      ip: clientIp,
    });

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
  const application = await db.findApplicationById(applicationId);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const fileRecords = await db.listFilesForApplication(applicationId);
  const files = fileRecords.map((f) => ({
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
