import { supabaseAdmin } from "./supabase";
import { SITE, pagesOf } from "./site";

export type ModuleRow = { id: string; position: number; title: string; page_from: number; page_to: number; extra_pages: number[]; video_url: string | null };
export type CourseRow = {
  id: string; slug: string; title: string; category: string; summary: string | null; topics: string[]; assignment: string | null;
  slide_count: number; slides_version: number; certificate_price_usd: number | null; published: boolean;
};
export type Progress = { module_id: string; viewed_upto: number; quiz_best: number | null; completed_at: string | null };

export async function courseState(userId: string, slug: string) {
  const db = supabaseAdmin();
  const { data: course } = await db.from("courses").select("*").eq("slug", slug).maybeSingle<CourseRow>();
  if (!course) return null;
  const [mods, enr, prog, attempts, cert, sub] = await Promise.all([
    db.from("modules").select("id,position,title,page_from,page_to,extra_pages,video_url").eq("course_id", course.id).order("position"),
    db.from("enrollments").select("created_at").eq("user_id", userId).eq("course_id", course.id).maybeSingle(),
    db.from("module_progress").select("module_id,viewed_upto,quiz_best,completed_at").eq("user_id", userId).eq("course_id", course.id),
    db.from("exam_attempts").select("score,passed,created_at").eq("user_id", userId).eq("course_id", course.id).order("score", { ascending: false }),
    db.from("certificates").select("serial,issued_at,score,revoked").eq("user_id", userId).eq("course_id", course.id).maybeSingle(),
    db.from("assignment_submissions").select("body,updated_at").eq("user_id", userId).eq("course_id", course.id).maybeSingle(),
  ]);
  const modules = (mods.data ?? []) as ModuleRow[];
  const progress = new Map<string, Progress>((prog.data ?? []).map((p) => [p.module_id, p as Progress]));
  const done = modules.filter((m) => progress.get(m.id)?.completed_at).length;
  const best = attempts.data?.[0] ?? null;
  return {
    course, modules, progress,
    enrolled: !!enr.data,
    done, total: modules.length,
    allDone: modules.length > 0 && done === modules.length,
    attempts: attempts.data?.length ?? 0,
    bestScore: best?.score ?? null,
    passed: (attempts.data ?? []).some((a) => a.passed),
    certificate: cert.data,
    assignment: sub.data,
    percent: modules.length ? Math.round(((done + ((attempts.data ?? []).some((a) => a.passed) ? 1 : 0)) / (modules.length + 1)) * 100) : 0,
  };
}

export type CourseState = NonNullable<Awaited<ReturnType<typeof courseState>>>;

export function moduleUnlocked(state: CourseState, position: number) {
  // Modules open in order: a module unlocks once the previous one is completed.
  const idx = state.modules.findIndex((m) => m.position === position);
  if (idx <= 0) return true;
  return !!state.progress.get(state.modules[idx - 1].id)?.completed_at;
}

export function moduleSlides(m: ModuleRow) { return pagesOf(m); }
export const PASS = SITE.passMark;
