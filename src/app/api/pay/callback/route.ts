import { NextResponse } from "next/server";
import { verify } from "@/lib/paystack";
import { applyPayment } from "@/lib/certs";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("reference") || url.searchParams.get("trxref");
  const to = (p: string) => NextResponse.redirect(new URL(p, url.origin));
  if (!ref || ref.length > 100) return to("/dashboard");
  const { data: pay } = await supabaseAdmin().from("payments").select("purpose,course_id,courses(slug)").eq("reference", ref).maybeSingle();
  const slug = (pay?.courses as unknown as { slug: string } | null)?.slug;
  const v = await verify(ref);
  if (!v || v.status !== "success") {
    return to(pay?.purpose === "company_seats" ? "/company?pay=failed" : slug ? `/learn/${slug}/certificate?error=${encodeURIComponent("Payment was not completed. You have not been charged twice; try again when ready.")}` : "/dashboard");
  }
  try {
    const r = await applyPayment(ref, v);
    if (!r.ok) return to(`/dashboard?pay=${encodeURIComponent(r.error)}`);
    if (r.purpose === "company_seats") return to("/company?pay=ok");
    return to(`/certificates?new=${r.serial}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Payment received but the certificate could not be issued yet.";
    return to(slug ? `/learn/${slug}/certificate?error=${encodeURIComponent(msg)}` : "/dashboard");
  }
}
