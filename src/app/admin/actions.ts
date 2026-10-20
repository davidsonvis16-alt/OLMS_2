"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { safeVideoUrl } from "@/lib/video";

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const lines = (f: FormData, k: string) => str(f, k, 20000).split("\n").map((x) => x.trim()).filter(Boolean);
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

function parsePages(v: string) {
  return [...new Set(v.split(/[,\s]+/).map((x) => parseInt(x, 10)).filter((n) => n > 0))];
}

export async function createCourse(f: FormData) {
  await requireAdmin();
  const title = str(f, "title", 160);
  if (!title) redirect("/admin/courses?error=Title%20required");
  const db = supabaseAdmin();
  const { count } = await db.from("courses").select("id", { count: "exact", head: true });
  const { data, error } = await db.from("courses").insert({ title, slug: slugify(title) + "-" + Date.now().toString(36).slice(-4), sort: (count ?? 0) + 1 }).select("id").single();
  if (error) redirect(`/admin/courses?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/courses/${data!.id}`);
}

export async function saveCourse(f: FormData) {
  await requireAdmin();
  const id = str(f, "id");
  const price = str(f, "certificate_price_usd");
  const cats = f.getAll("categories").map(String);
  const category = str(f, "category") || "food-safety";
  const { error } = await supabaseAdmin().from("courses").update({
    title: str(f, "title", 160),
    slug: slugify(str(f, "slug", 80) || str(f, "title", 160)),
    category,
    categories: [...new Set([category, ...cats])],
    summary: str(f, "summary", 600) || null,
    topics: lines(f, "topics"),
    assignment: str(f, "assignment", 4000) || null,
    certificate_price_usd: price === "" ? null : Math.max(0, Number(price) || 0),
    published: f.get("published") === "on",
    sort: Number(str(f, "sort")) || 0,
  }).eq("id", id);
  revalidatePath("/courses"); revalidatePath("/");
  redirect(`/admin/courses/${id}?${error ? `error=${encodeURIComponent(error.message)}` : "saved=1"}#setup`);
}

export async function deleteCourse(f: FormData) {
  await requireAdmin();
  const id = str(f, "id");
  const db = supabaseAdmin();
  const { count } = await db.from("certificates").select("id", { count: "exact", head: true }).eq("course_id", id);
  if (count) redirect(`/admin/courses/${id}?error=${encodeURIComponent("This course has certificates issued; unpublish it instead.")}`);
  await db.from("courses").delete().eq("id", id);
  revalidatePath("/courses");
  redirect("/admin/courses");
}

/** Called after the browser has uploaded the slide images for a new version. */
export async function setSlides(courseId: string, version: number, count: number) {
  await requireAdmin();
  if (typeof courseId !== "string" || !Number.isInteger(version) || version < 1 || !Number.isInteger(count) || count < 0 || count > 2000) throw new Error("Bad slide data");
  await supabaseAdmin().from("courses").update({ slide_count: count, slides_version: version }).eq("id", courseId);
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

export async function saveModule(f: FormData) {
  await requireAdmin();
  const courseId = str(f, "course_id");
  const id = str(f, "id");
  const row = {
    title: str(f, "title", 160) || "Untitled module",
    page_from: Math.max(1, Number(str(f, "page_from")) || 1),
    page_to: Math.max(1, Number(str(f, "page_to")) || 1),
    extra_pages: parsePages(str(f, "extra_pages")),
    video_url: safeVideoUrl(str(f, "video_url", 500)),
  };
  if (str(f, "video_url") && !row.video_url) redirect(`/admin/courses/${courseId}?error=${encodeURIComponent("Video must be an https embed link from YouTube, Vimeo or Bunny Stream.")}#modules`);
  if (row.page_to < row.page_from) row.page_to = row.page_from;
  const db = supabaseAdmin();
  if (id) await db.from("modules").update(row).eq("id", id).eq("course_id", courseId);
  else {
    const { data: last } = await db.from("modules").select("position").eq("course_id", courseId).order("position", { ascending: false }).limit(1).maybeSingle();
    await db.from("modules").insert({ ...row, course_id: courseId, position: (last?.position ?? 0) + 1 });
  }
  redirect(`/admin/courses/${courseId}?saved=1#modules`);
}

export async function deleteModule(f: FormData) {
  await requireAdmin();
  const courseId = str(f, "course_id");
  await supabaseAdmin().from("modules").delete().eq("id", str(f, "id")).eq("course_id", courseId);
  redirect(`/admin/courses/${courseId}#modules`);
}

export async function saveQuestion(f: FormData) {
  await requireAdmin();
  const courseId = str(f, "course_id");
  const id = str(f, "id");
  const options = lines(f, "options");
  // answers are typed as 1-based option numbers, e.g. "2" or "1,3"
  const answer = [...new Set(str(f, "answer").split(/[,\s]+/).map((x) => parseInt(x, 10) - 1).filter((n) => n >= 0 && n < options.length))];
  const back = (q: string) => redirect(`/admin/courses/${courseId}?${q}#q-${id || "new"}`);
  if (!str(f, "prompt") || options.length < 2 || answer.length === 0) back(`error=${encodeURIComponent("A question needs a prompt, at least two options and a correct answer number.")}`);
  const row = {
    prompt: str(f, "prompt", 1000), options, answer,
    module_id: str(f, "module_id") || null,
    in_final: f.get("in_final") === "on",
    review_note: f.get("clear_review") === "on" ? null : str(f, "review_note", 500) || null,
    source: "admin",
  };
  const db = supabaseAdmin();
  if (id) await db.from("questions").update(row).eq("id", id).eq("course_id", courseId);
  else {
    const { data: last } = await db.from("questions").select("position").eq("course_id", courseId).order("position", { ascending: false }).limit(1).maybeSingle();
    await db.from("questions").insert({ ...row, course_id: courseId, position: (last?.position ?? 0) + 1 });
  }
  back("saved=1");
}

export async function deleteQuestion(f: FormData) {
  await requireAdmin();
  const courseId = str(f, "course_id");
  await supabaseAdmin().from("questions").delete().eq("id", str(f, "id")).eq("course_id", courseId);
  redirect(`/admin/courses/${courseId}#questions`);
}

export async function saveSettings(f: FormData) {
  await requireAdmin();
  const v = str(f, "seat_price_usd");
  await supabaseAdmin().from("settings").upsert({ key: "seat_price_usd", value: v === "" ? null : Math.max(0, Number(v) || 0) });
  revalidatePath("/business");
  redirect("/admin?saved=1");
}

export async function setRevoked(f: FormData) {
  await requireAdmin();
  await supabaseAdmin().from("certificates").update({ revoked: f.get("revoked") === "1" }).eq("id", str(f, "id"));
  revalidatePath("/admin/certificates");
}

export async function setRole(f: FormData) {
  const { user } = await requireAdmin();
  const id = str(f, "id");
  if (id === user.id) return;
  await supabaseAdmin().from("profiles").update({ role: str(f, "role") === "admin" ? "admin" : "learner" }).eq("id", id);
  revalidatePath("/admin/learners");
}

export async function adjustCompany(f: FormData) {
  await requireAdmin();
  const until = str(f, "paid_until");
  await supabaseAdmin().from("companies").update({ seats: Math.max(0, Number(str(f, "seats")) || 0), paid_until: until || null }).eq("id", str(f, "id"));
  revalidatePath("/admin/companies");
}

/**
 * The learner an admin is about to suspend or delete. Admins can't act on themselves or on another admin (remove the
 * admin role first), so one admin can't lock the others out.
 */
async function target(f: FormData) {
  const { user } = await requireAdmin();
  const id = str(f, "id", 64);
  const back = (msg: string) => redirect(`/admin/learners?error=${encodeURIComponent(msg)}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) back("Unknown account.");
  if (id === user.id) back("You can't suspend or delete your own account.");
  const { data: p } = await supabaseAdmin().from("profiles").select("id,email,role").eq("id", id).maybeSingle();
  if (!p) back("That account no longer exists.");
  if (p!.role === "admin") back("That account is an admin. Remove its admin role first.");
  return p!;
}

/** Suspend: the person can't sign in, and any open session stops working at once. Reversible. */
export async function suspendUser(f: FormData) {
  const p = await target(f);
  const db = supabaseAdmin();
  const { error } = await db.auth.admin.updateUserById(p.id, { ban_duration: "876000h" });
  if (error) redirect(`/admin/learners?error=${encodeURIComponent(`Couldn't suspend: ${error.message}`)}`);
  await db.from("profiles").update({ suspended_at: new Date().toISOString() }).eq("id", p.id);
  revalidatePath("/admin/learners");
  redirect(`/admin/learners?done=${encodeURIComponent(`${p.email} is suspended.`)}`);
}

export async function restoreUser(f: FormData) {
  const p = await target(f);
  const db = supabaseAdmin();
  const { error } = await db.auth.admin.updateUserById(p.id, { ban_duration: "none" });
  if (error) redirect(`/admin/learners?error=${encodeURIComponent(`Couldn't restore: ${error.message}`)}`);
  await db.from("profiles").update({ suspended_at: null }).eq("id", p.id);
  revalidatePath("/admin/learners");
  redirect(`/admin/learners?done=${encodeURIComponent(`${p.email} can sign in again.`)}`);
}

/**
 * Permanent deletion. Removes the sign-in, profile, progress, answers and assignments. Issued certificates stay on
 * record so employers can still verify them; payment records stay for the accounts. The admin must type DELETE.
 */
export async function deleteUser(f: FormData) {
  const p = await target(f);
  if (str(f, "confirm", 20) !== "DELETE") redirect(`/admin/learners?error=${encodeURIComponent("Type DELETE in capitals to confirm.")}`);
  const { error } = await supabaseAdmin().auth.admin.deleteUser(p.id);
  if (error) redirect(`/admin/learners?error=${encodeURIComponent(`Couldn't delete: ${error.message}`)}`);
  revalidatePath("/admin/learners");
  redirect(`/admin/learners?done=${encodeURIComponent(`${p.email} was deleted.`)}`);
}
