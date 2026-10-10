import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if valid Supabase credentials have been provided
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

const BUCKET_NAME = 'application-files';
const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.data', 'storage');

if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

export const storage = {
  isCloud: () => isSupabaseConfigured,

  /**
   * Saves a file buffer either to Supabase Cloud Storage or local disk
   */
  async saveFile(filename: string, buffer: Buffer, mime: string): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filename, buffer, {
            contentType: mime,
            upsert: true,
          });

        if (error) {
          console.error('[Storage] Supabase upload failed, falling back to disk:', error.message);
          const filePath = path.join(LOCAL_STORAGE_DIR, filename);
          fs.writeFileSync(filePath, buffer);
          return filename;
        }

        return filename;
      } catch (err) {
        console.error('[Storage] Cloud storage exception, fallback to disk:', err);
        const filePath = path.join(LOCAL_STORAGE_DIR, filename);
        fs.writeFileSync(filePath, buffer);
        return filename;
      }
    }

    // Default local disk storage
    const filePath = path.join(LOCAL_STORAGE_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    return filename;
  },

  /**
   * Retrieves a file buffer from Supabase Cloud Storage or local disk
   */
  async getFileBuffer(filename: string): Promise<Buffer | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .download(filename);

        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch (err) {
        console.warn('[Storage] Cloud download exception, trying disk fallback:', err);
      }
    }

    // Fallback to local disk
    const filePath = path.join(LOCAL_STORAGE_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath);
  },

  /**
   * Generates a secure temporary signed URL for browser viewing/downloading
   */
  async getSignedUrl(filename: string, expiresInSeconds: number = 3600): Promise<string | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(filename, expiresInSeconds);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (err) {
        console.error('[Storage] Failed to generate signed URL:', err);
      }
    }
    return null;
  },
};
