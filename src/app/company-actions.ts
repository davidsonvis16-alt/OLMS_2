"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { initialize, newReference, quote, type Method } from "@/lib/paystack";
import { SITE, companyActive } from "@/lib/site";
import { limit } from "@/lib/rate-limit";

const back = (msg: string, path = "/company") => redirect(`${path}?error=${encodeURIComponent(msg)}`);

export async function seatPrice() {
  const { data } = await supabaseAdmin().from("settings").select("value").eq("key", "seat_price_usd").maybeSingle();
  const v = data?.value;
  return typeof v === "number" ? v : v ? Number(v) || null : null;
}

export async function createCompany(formData: FormData) {
  const { user, profile } = await requireUser("/company");
  if (profile.company_id) back("You already belong to a company.");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (name.length < 2) back("Enter your company name.");
  const db = supabaseAdmin();
  const { data: co, error } = await db.from("companies").insert({
    name, contact_name: profile.full_name, email: profile.email, phone: String(formData.get("phone") ?? "").trim().slice(0, 30) || profile.phone, owner_id: user.id,
  }).select("id").single();
  if (error || !co) back("Could not create the company account.");
  await db.from("profiles").update({ company_id: co!.id, company_role: "owner" }).eq("id", user.id);
  revalidatePath("/company");
  redirect("/company?created=1");
}

export async function buySeats(formData: FormData) {
  const { user, profile } = await requireUser("/company");
  if (profile.company_role !== "owner" || !profile.company_id) back("Only the company owner can buy seats.");
  if (!(await limit("payment", user.id))) back("Too many attempts. Please wait a while and try again.");
  const seats = Math.floor(Number(formData.get("seats")));
  if (!seats || seats < 1 || seats > 5000) back("Enter how many staff seats you need.");
  const method = (String(formData.get("method")) === "mpesa" ? "mpesa" : "card") as Method;
  const price = await seatPrice();
  if (price == null) back("Seat pricing hasn't been set yet. Please contact us on WhatsApp.");
  const db = supabaseAdmin();
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", profile.company_id!);
  if (seats < (count ?? 0)) back(`You have ${count} people on the account; buy at least that many seats.`);
  const usdTotal = Math.round(seats * price! * 100) / 100;
  let q: ReturnType<typeof quote>;
  try { q = quote(usdTotal, method); } catch (e) { return back(e instanceof Error ? e.message : "Payment unavailable"); }
  const reference = newReference("SEATS");
  await db.from("payments").insert({ reference, user_id: user.id, company_id: profile.company_id, purpose: "company_seats", seats, amount: q.amount, currency: q.currency, amount_usd: usdTotal });
  let url: string;
  try {
    url = (await initialize({ email: profile.email!, amount: q.amount, currency: q.currency, reference, method, callbackUrl: `${SITE.url.replace(/\/$/, "")}/api/pay/callback`, metadata: { purpose: "company_seats", seats } })).authorization_url;
  } catch (e) {
    await db.from("payments").update({ status: "failed" }).eq("reference", reference);
    return back(e instanceof Error ? e.message : "Could not start payment");
  }
  redirect(url);
}

export async function removeMember(formData: FormData) {
  const { profile } = await requireUser("/company");
  if (profile.company_role !== "owner") back("Only the owner can remove staff.");
  const id = String(formData.get("user_id"));
  await supabaseAdmin().from("profiles").update({ company_id: null, company_role: null }).eq("id", id).eq("company_id", profile.company_id!).eq("company_role", "member");
  revalidatePath("/company");
}

export async function joinCompany(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6,32}$/.test(code)) back("That invite link isn't valid.", "/join/invalid");
  const { user, profile } = await requireUser(`/join/${code}`);
  // Invite codes are secrets; limit guesses per person.
  if (!(await limit("join", user.id))) back("Too many attempts. Please wait an hour and try again.", `/join/${code}`);
  const db = supabaseAdmin();
  const { data: co } = await db.from("companies").select("id,name,seats,paid_until").eq("join_code", code).maybeSingle();
  if (!co) back("That invite link isn't valid.", `/join/${code}`);
  if (profile.company_id === co!.id) redirect("/dashboard");
  if (profile.company_id) back("You already belong to another company. Ask them to remove you first.", `/join/${code}`);
  if (!companyActive(co)) back(`${co!.name}'s account isn't active yet. Ask your manager to renew it.`, `/join/${code}`);
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", co!.id);
  if ((count ?? 0) >= co!.seats) back(`All of ${co!.name}'s seats are taken. Ask your manager to add more.`, `/join/${code}`);
  await db.from("profiles").update({ company_id: co!.id, company_role: "member" }).eq("id", user.id).is("company_id", null);
  // Two people can join at the same moment; if that overfilled the seats, this join is undone (fail safe).
  const { count: after } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", co!.id);
  if ((after ?? 0) > co!.seats) {
    await db.from("profiles").update({ company_id: null, company_role: null }).eq("id", user.id).eq("company_role", "member");
    back(`All of ${co!.name}'s seats are taken. Ask your manager to add more.`, `/join/${code}`);
  }
  redirect("/dashboard?joined=1");
}
