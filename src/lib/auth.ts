import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "./safe-next";
import { supabaseServer, supabaseAdmin } from "./supabase";

export type Profile = {
  id: string; email: string | null; full_name: string | null; id_number: string | null; phone: string | null;
  country: string | null; role: "learner" | "admin"; suspended_at?: string | null; company_id: string | null; company_role: "owner" | "member" | null;
};

export async function getSession() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, profile: null as Profile | null };
  const { data } = await supabaseAdmin().from("profiles").select("*").eq("id", user.id).maybeSingle();
  // A suspended account is treated as signed out everywhere (pages, actions and APIs).
  if ((data as Profile | null)?.suspended_at) return { user: null, profile: null as Profile | null, suspended: true };
  return { user, profile: (data as Profile) ?? null };
}

export async function requireUser(next = "/dashboard") {
  const s = await getSession();
  if ("suspended" in s) redirect("/login?error=suspended");
  if (!s.user || !s.profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s as { user: NonNullable<typeof s.user>; profile: Profile };
}

/** The page the request came from (same site only), so a signed-out save returns there after signing in. */
async function cameFrom(fallback: string) {
  const ref = (await headers()).get("referer");
  if (!ref) return fallback;
  try { const u = new URL(ref); return u.pathname.startsWith(fallback) ? safeNext(u.pathname + u.search, fallback) : fallback; } catch { return fallback; }
}

export async function requireAdmin() {
  const s = await requireUser(await cameFrom("/admin"));
  if (s.profile.role !== "admin") redirect("/dashboard");
  return s;
}
