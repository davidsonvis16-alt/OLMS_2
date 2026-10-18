"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { coveredByCompany, issueCertificate } from "@/lib/certs";
import { initialize, newReference, quote, type Method } from "@/lib/paystack";
import { SITE } from "@/lib/site";
import { limit } from "@/lib/rate-limit";

export async function claimCertificate(formData: FormData) {
  const slug = String(formData.get("slug"));
  const method = (String(formData.get("method")) === "mpesa" ? "mpesa" : "card") as Method;
  const back = (msg: string) => redirect(`/learn/${slug}/certificate?error=${encodeURIComponent(msg)}`);
  const { user, profile } = await requireUser(`/learn/${slug}/certificate`);
  if (!(await limit("payment", user.id))) back("Too many attempts. Please wait a while and try again.");
  const db = supabaseAdmin();

  const full_name = String(formData.get("full_name") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const id_number = String(formData.get("id_number") ?? "").trim().slice(0, 40);
  if (full_name.length < 3 || id_number.length < 4) back("Enter your full name and ID or passport number.");
  if (formData.get("confirm") !== "on") back("Please confirm your details are correct.");
  await db.from("profiles").update({ full_name, id_number }).eq("id", user.id);

  const { data: course } = await db.from("courses").select("id,title,certificate_price_usd").eq("slug", slug).single();
  if (!course) redirect("/dashboard");
  const { data: pass } = await db.from("exam_attempts").select("id").eq("user_id", user.id).eq("course_id", course.id).eq("passed", true).limit(1).maybeSingle();
  if (!pass) back("Pass the final assessment first.");

  const existing = await db.from("certificates").select("serial").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
  if (existing.data) redirect(`/certificates?new=${existing.data.serial}`);

  const free = (await coveredByCompany(user.id)) || Number(course.certificate_price_usd) === 0 && course.certificate_price_usd !== null;
  if (free) {
    const serial = await issueCertificate(user.id, course.id, null);
    redirect(`/certificates?new=${serial}`);
  }
  if (course.certificate_price_usd == null) back("The certificate fee for this course hasn't been set yet. Please contact us on WhatsApp.");

  let q: ReturnType<typeof quote>;
  try { q = quote(Number(course.certificate_price_usd), method); } catch (e) { return back(e instanceof Error ? e.message : "Payment unavailable"); }
  const reference = newReference("CERT");
  await db.from("payments").insert({
    reference, user_id: user.id, course_id: course.id, purpose: "certificate",
    amount: q.amount, currency: q.currency, amount_usd: course.certificate_price_usd,
  });
  let url: string;
  try {
    const init = await initialize({
      email: profile.email || user.email!, amount: q.amount, currency: q.currency, reference, method,
      callbackUrl: `${SITE.url.replace(/\/$/, "")}/api/pay/callback`,
      metadata: { purpose: "certificate", course: course.title, user_id: user.id },
    });
    url = init.authorization_url;
  } catch (e) {
    await db.from("payments").update({ status: "failed" }).eq("reference", reference);
    return back(e instanceof Error ? e.message : "Could not start payment");
  }
  redirect(url);
}
