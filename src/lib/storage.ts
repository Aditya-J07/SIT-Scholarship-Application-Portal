import crypto from "crypto";
import { getAdminClient } from "@/utils/supabase/admin";

const BUCKET_NAME = "application-files";

export const ALLOWED_FILE_KINDS = [
  "photo",
  "sig_student",
  "sig_parent",
  "cet_order",
  "marks_card",
  "income_cert",
  "aadhaar",
  "fee_receipt",
  "principal_cert",
] as const;

export type AllowedFileKind = typeof ALLOWED_FILE_KINDS[number];

export function isValidFileKind(kind: string): kind is AllowedFileKind {
  return (ALLOWED_FILE_KINDS as readonly string[]).includes(kind);
}

/**
 * Detects file type from magic bytes (header inspection).
 */
export function detectMimeFromBytes(buffer: Buffer): { mime: string; ext: string } | null {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { mime: "application/pdf", ext: "pdf" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

/**
 * Generates safe storage path: `${applicationId}/${kind}-${uuid}.${ext}`
 */
export function generateStoragePath(applicationId: string, kind: string, ext: string): string {
  const safeId = crypto.randomUUID();
  return `${applicationId}/${kind}-${safeId}.${ext}`;
}

export const storage = {
  isCloud: () => true,

  /**
   * Saves a file buffer strictly to private Supabase Cloud Storage bucket 'application-files'.
   * Never falls back to local disk. Throws error on failure.
   */
  async saveFile(filename: string, buffer: Buffer, mime: string): Promise<string> {
    const supabase = getAdminClient();
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: mime,
        upsert: true,
      });

    if (error) {
      console.error(`[Storage] Failed to upload file ${filename}:`, error.message);
      throw new Error(`Cloud storage upload failed: ${error.message}`);
    }

    return filename;
  },

  /**
   * Retrieves a file buffer strictly from private Supabase Cloud Storage.
   */
  async getFileBuffer(filename: string): Promise<Buffer | null> {
    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(filename);

      if (error || !data) {
        return null;
      }

      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  },

  /**
   * Generates a short-lived temporary signed URL for verified browser downloading/viewing.
   * Bucket remains strictly private.
   */
  async getSignedUrl(filename: string, expiresInSeconds: number = 300): Promise<string | null> {
    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filename, expiresInSeconds);

      if (error || !data?.signedUrl) {
        return null;
      }

      return data.signedUrl;
    } catch {
      return null;
    }
  },

  /**
   * Deletes a file from Supabase Cloud Storage.
   */
  async deleteFile(filename: string): Promise<boolean> {
    try {
      const supabase = getAdminClient();
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filename]);

      return !error;
    } catch {
      return false;
    }
  },
};
