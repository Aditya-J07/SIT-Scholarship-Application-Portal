import "server-only";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

let adminClientInstance: SupabaseClient | null = null;

function cleanSupabaseUrl(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url.trim()).origin;
  } catch {
    return url.trim();
  }
}

const resilientFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      if (
        attempt < 2 &&
        (error?.message?.includes("fetch failed") ||
          error?.message?.includes("ECONNRESET") ||
          error?.code === "ECONNRESET")
      ) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  return fetch(input, init);
};

export function createAdminClient(customUrl?: string, customSecretKey?: string): SupabaseClient {
  const supabaseUrl = cleanSupabaseUrl(customUrl || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseSecretKey = (customSecretKey || process.env.SUPABASE_SECRET_KEY)?.trim();

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in server environment. Admin Supabase client cannot be initialized."
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: resilientFetch,
    },
  });
}

export function getAdminClient(): SupabaseClient {
  if (!adminClientInstance) {
    adminClientInstance = createAdminClient();
  }
  return adminClientInstance;
}

export function resetAdminClient(): void {
  adminClientInstance = null;
}

export const adminSupabase = {
  get client() {
    return getAdminClient();
  },
};
