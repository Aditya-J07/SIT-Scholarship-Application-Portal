import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient(customCookieStore?: Awaited<ReturnType<typeof cookies>>) {
  let cookieStore: any;
  if (customCookieStore) {
    cookieStore = customCookieStore;
  } else {
    try {
      cookieStore = await cookies();
    } catch {
      // Outside Next.js request scope (e.g. integration test environment)
      cookieStore = (globalThis as any).__testCookieStore ?? {
        getAll: () => [],
        set: () => {},
        get: () => undefined,
      };
    }
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if proxy/middleware is refreshing sessions.
        }
      },
    },
  });
}
