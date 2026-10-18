import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase";
import { grade, loadQuestions } from "@/lib/grading";
import { SITE, pagesOf } from "@/lib/site";
import { limit } from "@/lib/rate-limit";

const id = z.string().uuid();
const answers = z.record(id, z.array(z.number().int().min(0).max(25)).max(25)).refine((a) => Object.keys(a).length <= 300, "Too many answers");
const Body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("progress"), moduleId: id, page: z.number().int().min(0).max(10000) }),
  z.object({ type: z.literal("quiz"), moduleId: id, answers }),
  z.object({ type: z.literal("exam"), courseId: id, answers }),
]);

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Progress, knowledge checks and the final exam. Identity comes from the session only; everything is graded here. */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);
  if (Number(req.headers.get("content-length") ?? 0) > 64_000) return json({ error: "Request too large" }, 413);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Bad request" }, 400);
  const body = parsed.data;
  if (!(await limit(body.type, user.id))) return json({ error: "Too many attempts. Please wait a while and try again." }, 429);
  const db = supabaseAdmin();

  if (body.type === "progress" || body.type === "quiz") {
    const { data: mod } = await db.from("modules").select("id,course_id,position,page_from,page_to,extra_pages").eq("id", body.moduleId).maybeSingle();
    if (!mod) return json({ error: "Module not found" }, 404);
    const [{ data: enr }, { data: course }, { data: earlier }, { data: cur }] = await Promise.all([
      db.from("enrollments").select("course_id").eq("user_id", user.id).eq("course_id", mod.course_id).maybeSingle(),
      db.from("courses").select("slide_count").eq("id", mod.course_id).maybeSingle(),
      db.from("modules").select("id,position").eq("course_id", mod.course_id).lt("position", mod.position).order("position", { ascending: false }).limit(1),
      db.from("module_progress").select("*").eq("user_id", user.id).eq("module_id", mod.id).maybeSingle(),
    ]);
    if (!enr || !course) return json({ error: "Not enrolled" }, 403);
    // Modules open in order: the one before must be complete.
    const prev = earlier?.[0];
    if (prev) {
      const { data: p } = await db.from("module_progress").select("completed_at").eq("user_id", user.id).eq("module_id", prev.id).maybeSingle();
      if (!p?.completed_at) return json({ error: "Complete the previous module first" }, 403);
    }
    const slides = course.slide_count > 0 ? pagesOf(mod).length : 0;

    if (body.type === "progress") {
      const page = Math.min(slides, body.page);
      if (!cur || page > cur.viewed_upto) {
        await db.from("module_progress").upsert({ user_id: user.id, module_id: mod.id, course_id: mod.course_id, viewed_upto: Math.max(page, cur?.viewed_upto ?? 0), quiz_best: cur?.quiz_best ?? null, completed_at: cur?.completed_at ?? null });
      }
      return json({ ok: true });
    }

    // Knowledge check. The module completes once every slide has been viewed and the check attempted.
    const qs = await loadQuestions({ moduleId: mod.id });
    const g = grade(qs, body.answers);
    const seenAll = (cur?.viewed_upto ?? 0) >= slides;
    const completed_at = cur?.completed_at ?? (seenAll ? new Date().toISOString() : null);
    await db.from("module_progress").upsert({
      user_id: user.id, module_id: mod.id, course_id: mod.course_id,
      viewed_upto: cur?.viewed_upto ?? 0, quiz_best: Math.max(g.score, cur?.quiz_best ?? 0), completed_at,
    });
    // Right or wrong per question only: the correct options are never sent, because the final exam reuses these questions.
    const results = Object.fromEntries(Object.entries(g.results).map(([k, r]) => [k, { correct: r.correct }]));
    return json({ score: g.score, correct: g.correct, total: g.total, results, completed: !!completed_at, slidesLeft: Math.max(0, slides - (cur?.viewed_upto ?? 0)) });
  }

  // Final exam: enrolled, every module complete, published (or already enrolled before it was unpublished).
  const [{ data: course }, { data: enr }] = await Promise.all([
    db.from("courses").select("id").eq("id", body.courseId).maybeSingle(),
    db.from("enrollments").select("course_id").eq("user_id", user.id).eq("course_id", body.courseId).maybeSingle(),
  ]);
  if (!course) return json({ error: "Course not found" }, 404);
  if (!enr) return json({ error: "Not enrolled" }, 403);
  const [{ count: modCount }, { count: doneCount }] = await Promise.all([
    db.from("modules").select("id", { count: "exact", head: true }).eq("course_id", course.id),
    db.from("module_progress").select("module_id", { count: "exact", head: true }).eq("course_id", course.id).eq("user_id", user.id).not("completed_at", "is", null),
  ]);
  if (!modCount || (doneCount ?? 0) < modCount) return json({ error: "Complete all modules first" }, 403);
  const qs = await loadQuestions({ courseId: course.id, finalOnly: true });
  if (qs.length === 0) return json({ error: "This assessment has no questions yet" }, 409);
  const g = grade(qs, body.answers);
  const passed = g.score >= SITE.passMark;
  await db.from("exam_attempts").insert({ user_id: user.id, course_id: course.id, score: g.score, passed });
  // Score only; never which answers were right.
  return json({ score: g.score, correct: g.correct, total: g.total, passed });
}
