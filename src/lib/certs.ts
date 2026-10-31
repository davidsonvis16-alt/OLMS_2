import crypto from "node:crypto";
import { fmtDay, logCompany } from "@/lib/server/company-history";
import { supabaseAdmin } from "./supabase";
import { companyActive } from "./site";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function newSerial() {
  const b = crypto.randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return `ASH-${new Date().getFullYear()}-${s}`;
}

/** Issues (or returns the existing) certificate. Caller must have checked payment / company cover. */
export async function issueCertificate(userId: string, courseId: string, paymentId: string | null) {
  const db = supabaseAdmin();
  const existing = await db.from("certificates").select("serial").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (existing.data) return existing.data.serial as string;

  const [{ data: profile }, { data: course }, { data: mods }, { data: best }] = await Promise.all([
    db.from("profiles").select("full_name,id_number,company_id").eq("id", userId).single(),
    db.from("courses").select("title").eq("id", courseId).single(),
    db.from("modules").select("title,position").eq("course_id", courseId).order("position"),
    db.from("exam_attempts").select("score").eq("user_id", userId).eq("course_id", courseId).eq("passed", true).order("score", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!profile?.full_name || !profile.id_number) throw new Error("Add your full name and ID/passport number first.");
  if (!best) throw new Error("Pass the final assessment first.");
  let companyName: string | null = null;
  if (profile.company_id) {
    const { data: c } = await db.from("companies").select("name").eq("id", profile.company_id).maybeSingle();
    companyName = c?.name ?? null;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const serial = newSerial();
    const { error } = await db.from("certificates").insert({
      serial, user_id: userId, course_id: courseId, full_name: profile.full_name, id_number: profile.id_number,
      course_title: course!.title, modules: (mods ?? []).map((m) => m.title), score: best.score, company_name: companyName, payment_id: paymentId,
    });
    if (!error) return serial;
    if (!/duplicate|unique/i.test(error.message)) throw error;
    const again = await db.from("certificates").select("serial").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
    if (again.data) return again.data.serial as string;
  }
  throw new Error("Could not issue certificate, please try again.");
}

export async function coveredByCompany(userId: string) {
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("company_id").eq("id", userId).single();
  if (!p?.company_id) return false;
  const { data: c } = await db.from("companies").select("paid_until").eq("id", p.company_id).maybeSingle();
  return companyActive(c);
}

/** Applies a successful payment exactly once (safe to call from both callback and webhook). */
export async function applyPayment(reference: string, verified: { status: string; reference: string; amount: number; currency: string; channel: string; paid_at: string }) {
  // Only a transaction Paystack itself reports as successful, for this exact reference, can change anything.
  if (verified.status !== "success" || verified.reference !== reference) return { ok: false as const, error: "Payment not confirmed" };
  const db = supabaseAdmin();
  const { data: pay } = await db.from("payments").select("*").eq("reference", reference).maybeSingle();
  if (!pay) return { ok: false as const, error: "Unknown payment" };
  if (pay.status === "failed") return { ok: false as const, error: "Payment was marked failed" };
  if (Math.round(Number(pay.amount) * 100) !== verified.amount || pay.currency !== verified.currency) {
    await db.from("payments").update({ status: "failed", details: { mismatch: verified } }).eq("id", pay.id);
    return { ok: false as const, error: "Amount mismatch" };
  }
  if (pay.status !== "success") {
    const { data: claimed } = await db.from("payments").update({ status: "success", channel: verified.channel, paid_at: verified.paid_at })
      .eq("id", pay.id).neq("status", "success").select("id").maybeSingle();
    if (claimed && pay.purpose === "company_seats" && pay.company_id) {
      const until = new Date(); until.setFullYear(until.getFullYear() + 1);
      const { data: co } = await db.from("companies").update({ seats: pay.seats, paid_until: until.toISOString().slice(0, 10) }).eq("id", pay.company_id).select("name").maybeSingle();
      await logCompany({ companyId: pay.company_id, companyName: co?.name ?? "", actor: "Online payment", kind: "seats_paid",
        detail: `Paid ${pay.currency} ${Number(pay.amount).toLocaleString("en-KE")} by ${verified.channel || "online payment"} (ref ${reference}): ${pay.seats} seats until ${fmtDay(until.toISOString().slice(0, 10))}.` });
    }
  }
  if (pay.purpose === "certificate" && pay.user_id && pay.course_id) {
    const serial = await issueCertificate(pay.user_id, pay.course_id, pay.id);
    return { ok: true as const, purpose: pay.purpose, serial, courseId: pay.course_id };
  }
  return { ok: true as const, purpose: pay.purpose };
}
