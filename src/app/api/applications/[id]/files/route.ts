import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ApplicationFileRecord } from '@/lib/types';
import { storage } from '@/lib/storage';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { verifyStateChangingOrigin } from '@/lib/auth/origin-guard';
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
  // 1. CSRF Origin Verification
  const originErr = verifyStateChangingOrigin(request);
  if (originErr) return originErr;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  // 2. Role authorization: Reviewers may NOT upload
  if (session.role === 'reviewer') {
    return NextResponse.json(
      { error: { message: 'Reviewers are not permitted to upload or alter application files.' } },
      { status: 403 }
    );
  }

  // 3. Rate limiting: 30 uploads per hour per user
  const rateLimit = await checkRateLimit(`upload:user:${session.userId}`, 3600, 30);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const { id: applicationId } = await params;
  const application = await db.findApplicationById(applicationId);
  if (!application) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  // Ownership check: only owning student or admin can upload
  if (session.role === 'student' && application.student_id !== session.userId) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  // Application state check: students cannot modify unless draft or needs_correction
  if (session.role === 'student' && application.status !== 'draft' && application.status !== 'needs_correction') {
    return NextResponse.json(
      { error: { message: 'Application is locked and cannot be edited after submission.' } },
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

    // Path traversal attempt check
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return NextResponse.json(
        { error: { message: 'Invalid file name. Path traversal characters are strictly forbidden.' } },
        { status: 400 }
      );
    }

    const sizeBytes = file.size;

    // Vercel serverless request body safety check (4.5 MB limit)
    if (sizeBytes > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        { error: { message: 'File exceeds maximum platform transmission limit of 4.5 MB.' } },
        { status: 400 }
      );
    }

    // Strict institutional size limits: photo & signatures 1 MB, certificates 3 MB
    const maxPhotoSigSize = 1 * 1024 * 1024; // 1 MB
    const maxDocSize = 3 * 1024 * 1024; // 3 MB

    if ((kind === 'photo' || kind === 'sig_student' || kind === 'sig_parent') && sizeBytes > maxPhotoSigSize) {
      return NextResponse.json(
        { error: { message: `${kind} file size must not exceed 1 MB.` } },
        { status: 400 }
      );
    }

    if (sizeBytes > maxDocSize) {
      return NextResponse.json(
        { error: { message: 'Certificate document size must not exceed 3 MB.' } },
        { status: 400 }
      );
    }

    // Limit of at most 10 files per application
    const existingFiles = await db.findFilesByApplicationId(application.id);
    const isReplacing = existingFiles.some((f: ApplicationFileRecord) => f.kind === kind);
    if (!isReplacing && existingFiles.length >= 10) {
      return NextResponse.json(
        { error: { message: 'Maximum limit of 10 uploaded documents per application reached.' } },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic byte sniffing to identify genuine MIME type and reject disguised executables/HTML
    const isExe = buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a; // MZ header
    const snippet = buffer.slice(0, 100).toString('utf-8').toLowerCase();
    const isHtml = snippet.includes('<html') || snippet.includes('<!doctype');

    if (isExe || isHtml) {
      return NextResponse.json(
        { error: { message: 'Malicious or disguised file format detected. Upload rejected.' } },
        { status: 400 }
      );
    }

    const isPdf = buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
    const isJpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47; // .PNG
    const isWebp = buffer.length > 12 && buffer.toString('ascii', 8, 12) === 'WEBP';

    if (!isPdf && !isJpg && !isPng && !isWebp) {
      return NextResponse.json(
        { error: { message: 'File rejected. Only authentic PDF, JPEG, PNG, or WEBP formats are accepted.' } },
        { status: 400 }
      );
    }

    // Photo and signatures MUST be PNG, JPEG, or WebP (reject PDF)
    if ((kind === 'photo' || kind === 'sig_student' || kind === 'sig_parent') && isPdf) {
      return NextResponse.json(
        { error: { message: 'Photographs and signatures must be image formats (PNG/JPEG/WEBP), not PDF documents.' } },
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

    // If replacing an existing file of the same kind, delete the previous storage object
    const previousFile = existingFiles.find((f: ApplicationFileRecord) => f.kind === kind);
    if (previousFile) {
      await storage.deleteFile(previousFile.storage_path);
      await db.deleteFileRecord(previousFile.id);
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const safeFileId = crypto.randomUUID();
    // Secure server-generated storage path (never uses user input)
    const storagePath = `${application.id}/${kind}-${safeFileId}.${ext}`;

    await storage.saveFile(storagePath, buffer, detectedMime);

    // Sanitize original filename for display
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

    const clientIp = getClientIp(request);
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
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: { message: 'An unexpected error occurred during file upload.' } },
      { status: 500 }
    );
  }
}
