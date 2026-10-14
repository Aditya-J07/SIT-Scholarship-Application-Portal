import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

let _supabaseClient: SupabaseClient | null = null;

function getStorageClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient;
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) {
    throw new Error(
      'Storage misconfiguration: Supabase storage credentials (NEXT_PUBLIC_SUPABASE_URL and key) are required. Local filesystem storage is disabled.'
    );
  }
  _supabaseClient = createClient(supabaseUrl, supabaseKey);
  return _supabaseClient;
}

const BUCKET_NAME = 'application-files';

export const storage = {
  isCloud: () => isSupabaseConfigured,

  /**
   * Saves a file buffer strictly to private Supabase Cloud Storage.
   * Throws an error on failure. Never claims success falsely and does NOT fall back to local disk.
   */
  async saveFile(filename: string, buffer: Buffer, mime: string): Promise<string> {
    const client = getStorageClient();
    const { error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: mime,
        upsert: true,
      });

    if (error) {
      console.error(`[Storage] Failed to upload file ${filename} to Supabase:`, error.message);
      throw new Error(`Cloud storage upload failed: ${error.message}`);
    }

    return filename;
  },

  /**
   * Retrieves a file buffer strictly from private Supabase Cloud Storage.
   * Returns null if unconfigured or file does not exist.
   */
  async getFileBuffer(filename: string): Promise<Buffer | null> {
    if (!isSupabaseConfigured) {
      return null;
    }
    try {
      const client = getStorageClient();
      const { data, error } = await client.storage
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
    if (!isSupabaseConfigured) {
      return null;
    }
    try {
      const client = getStorageClient();
      const { data, error } = await client.storage
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
    if (!isSupabaseConfigured) {
      return false;
    }
    try {
      const client = getStorageClient();
      const { error } = await client.storage
        .from(BUCKET_NAME)
        .remove([filename]);

      return !error;
    } catch {
      return false;
    }
  },
};
