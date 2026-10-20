"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase";
import { getSession, requireUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { identityTaken, TAKEN_MESSAGE } from "@/lib/identity";
import { readPhone } from "@/lib/phone";

export async function enrol(formData: FormData) {
  const slug = String(formData.get("slug"));
  const { user } = await getSession(); // also treats suspended accounts as signed out
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/courses/${slug}`)}`);
  const admin = supabaseAdmin();
  const { data: course } = await admin.from("courses").select("id").eq("slug", slug).eq("published", true).single();
  if (!course) redirect("/courses");
  await admin.from("enrollments").upsert({ user_id: user.id, course_id: course.id }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
  redirect(`/learn/${slug}`);
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/");
}

/** Validates and saves "Your details". Returns a plain message when something needs fixing. */
async function applyProfile(userId: string, formData: FormData): Promise<string | null> {
  const clean = (k: string, max = 120) => String(formData.get(k) ?? "").trim().replace(/\s+/g, " ").slice(0, max) || null;
  const full_name = clean("full_name");
  const id_number = clean("id_number", 40);
  if (full_name && full_name.length < 3) return "Enter your full name as it appears on your ID.";
  if (id_number && id_number.length < 4) return "That ID or passport number looks too short.";
  let phone: string | null = null;
  try { phone = readPhone(formData).phone || null; } catch (e) { return e instanceof Error ? e.message : "Check the phone number."; }
  const db = supabaseAdmin();
  const taken = await identityTaken(db, userId, id_number, phone);
  if (taken) return TAKEN_MESSAGE[taken];
  const { error } = await db.from("profiles").update({ full_name, id_number, phone, country: clean("country", 60) }).eq("id", userId);
  if (error) return error.code === "23505" ? "That ID or phone number is already on another account. Each person can have one account." : "Couldn't save. Please try again.";
  revalidatePath("/account");
  return null;
}

/** Form-post version (redirects back with a message). */
export async function updateProfile(formData: FormData) {
  const { user } = await requireUser("/account");
  const next = String(formData.get("next") ?? "");
  const error = await applyProfile(user.id, formData);
  if (error) redirect(`/account?error=${encodeURIComponent(error)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  redirect(next ? safeNext(next, "/account?saved=1") : "/account?saved=1");
}

export type SaveState = { ok?: boolean; error?: string; at?: number };

/** The "Your details" page: saves and answers in place, so the page can say "Saved" straight away. */
export async function saveDetails(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const { user } = await requireUser("/account");
  const error = await applyProfile(user.id, formData);
  return error ? { error, at: Date.now() } : { ok: true, at: Date.now() };
}

export async function saveAssignment(formData: FormData) {
  const { user } = await requireUser();
  const courseId = String(formData.get("course_id"));
  const slug = String(formData.get("slug")).replace(/[^a-z0-9-]/g, "").slice(0, 100);
  const body = String(formData.get("body") ?? "").trim().slice(0, 20000);
  // Only for a course this learner is actually enrolled in.
  const { data: enr } = await supabaseAdmin().from("enrollments").select("course_id").eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
  if (!enr) redirect("/dashboard");
  if (body) await supabaseAdmin().from("assignment_submissions").upsert({ user_id: user.id, course_id: courseId, body, updated_at: new Date().toISOString() });
  redirect(`/learn/${slug}?assignment=saved`);
}
