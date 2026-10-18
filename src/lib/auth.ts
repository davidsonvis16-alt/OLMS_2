import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "./supabase";

export type Profile = {
  id: string; email: string | null; full_name: string | null; id_number: string | null; phone: string | null;
  country: string | null; role: "learner" | "admin"; company_id: string | null; company_role: "owner" | "member" | null;
};

export async function getSession() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, profile: null as Profile | null };
  const { data } = await supabaseAdmin().from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { user, profile: (data as Profile) ?? null };
}

export async function requireUser(next = "/dashboard") {
  const s = await getSession();
  if (!s.user || !s.profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s as { user: NonNullable<typeof s.user>; profile: Profile };
}

export async function requireAdmin() {
  const s = await requireUser("/admin");
  if (s.profile.role !== "admin") redirect("/dashboard");
  return s;
}
