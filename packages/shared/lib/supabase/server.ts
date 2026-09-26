import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readSupabaseEnv } from "@/lib/db/migration-rules";

let cached: SupabaseClient | null = null;
let cachedAdmin: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role.
 * Do not import this module from Client Components.
 * Auth session is disabled so the key is not treated as a user JWT.
 * @see https://supabase.com/docs/reference/javascript/initializing
 */
export function getServiceClient(options?: { admin?: boolean }): SupabaseClient {
  if (options?.admin) {
    if (cachedAdmin) return cachedAdmin;
    const env = readSupabaseEnv({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    cachedAdmin = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const t0 = performance.now();
          return fetch(input, { ...init, cache: "no-store" }).then((res) => {
            const ms = Math.round(performance.now() - t0);
            const slow = Number(process.env.ADMIN_SUPABASE_SLOW_MS ?? 600);
            if (ms >= slow) {
              const url = typeof input === "string" ? input : String(input);
              if (/supabase\.co/i.test(url)) {
                console.warn(
                  JSON.stringify({
                    v: 1,
                    kind: "admin_supabase_slow",
                    ms,
                    method: (init?.method ?? "GET").toUpperCase(),
                  }),
                );
              }
            }
            return res;
          });
        },
      },
    });
    return cachedAdmin;
  }

  if (cached) return cached;
  const env = readSupabaseEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  cached = createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Cache GETs briefly for ISR/storefront speed; keep mutations fresh.
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const method = (init?.method || "GET").toUpperCase();
        if (method !== "GET" && method !== "HEAD") {
          return fetch(input, { ...init, cache: "no-store" });
        }
        return fetch(input, { ...init, next: { revalidate: 60 } });
      },
    },
  });
  return cached;
}
