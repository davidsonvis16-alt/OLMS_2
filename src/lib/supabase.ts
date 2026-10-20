import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "@/lib/server/request";
import { supabaseConfigured } from "./config";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function need(v: string | undefined, name: string) {
  if (!v) throw new Error(`${name} is not set. Add your Supabase project keys (see .env.example).`);
  return v;
}

/** Supabase client acting as the signed-in user (respects RLS). */
export async function supabaseServer(): Promise<SupabaseClient> {
  const store = await cookies(); // read first: marks the page as per-user (never cached or prerendered)
  if (!supabaseConfigured()) need(undefined, "NEXT_PUBLIC_SUPABASE_URL");
  return createServerClient(need(URL, "NEXT_PUBLIC_SUPABASE_URL"), need(ANON, "NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a Server Component */ }
      },
    },
  }) as unknown as SupabaseClient;
}

/** Service-role client. Server only: bypasses RLS, so every caller must check identity and ownership first. */
export function supabaseAdmin(): SupabaseClient {
  return createClient(need(URL, "NEXT_PUBLIC_SUPABASE_URL"), need(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export { slideUrl } from "./slides";
