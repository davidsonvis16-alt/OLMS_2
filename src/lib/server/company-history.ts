/**
 * Company account history: one shared log that the company owner and Aspire admins both read, so neither side can
 * see a change the other can't. Entries are only ever added, never edited. Server only.
 */
import { supabaseAdmin } from "@/lib/supabase";

export type CompanyEvent = { id: string; company_id: string | null; company_name: string; at: string; actor: string; by_admin: boolean; kind: string; detail: string };

/** Records one change. History must never block the change itself, so a failure here is logged, not thrown. */
export async function logCompany(e: { companyId: string; companyName: string; actor: string; byAdmin?: boolean; kind: string; detail: string }) {
  const { error } = await supabaseAdmin().from("company_events").insert({
    company_id: e.companyId, company_name: e.companyName, actor: e.actor, by_admin: !!e.byAdmin, kind: e.kind, detail: e.detail,
  });
  if (error) console.error("company history not saved:", error.message);
}

/** Newest first. Returns null when the history table hasn't been created yet (see supabase/schema.sql). */
export async function companyHistory(companyId: string, max = 100): Promise<CompanyEvent[] | null> {
  const { data, error } = await supabaseAdmin().from("company_events").select("*").eq("company_id", companyId).order("at", { ascending: false }).limit(max);
  return error ? null : (data as CompanyEvent[]);
}

/** History of companies that have been deleted (their entries keep the name). */
export async function deletedCompanyHistory(max = 100): Promise<CompanyEvent[] | null> {
  const { data, error } = await supabaseAdmin().from("company_events").select("*").is("company_id", null).order("at", { ascending: false }).limit(max);
  return error ? null : (data as CompanyEvent[]);
}

export const fmtDay = (d: string | null | undefined) => d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "none";
