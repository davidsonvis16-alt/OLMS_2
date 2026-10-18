import { supabaseAdmin } from "./supabase";

export type PublicQuestion = { id: string; prompt: string; options: string[]; multi: boolean; pick: number };
type Row = { id: string; prompt: string; options: string[]; answer: number[]; position: number };

export function toPublic(q: Row): PublicQuestion {
  return { id: q.id, prompt: q.prompt, options: q.options, multi: q.answer.length > 1, pick: q.answer.length };
}

export async function loadQuestions(filter: { moduleId?: string; courseId?: string; finalOnly?: boolean }) {
  let query = supabaseAdmin().from("questions").select("id,prompt,options,answer,position,module_id").order("position");
  if (filter.moduleId) query = query.eq("module_id", filter.moduleId);
  if (filter.courseId) query = query.eq("course_id", filter.courseId);
  if (filter.finalOnly) query = query.eq("in_final", true);
  const { data } = await query;
  return (data ?? []) as (Row & { module_id: string | null })[];
}

/** answers: questionId -> selected option indexes. Returns % score and per-question result. */
export function grade(questions: Row[], answers: Record<string, number[]>) {
  let correct = 0;
  const results: Record<string, { correct: boolean; answer: number[] }> = {};
  for (const q of questions) {
    const given = [...(answers[q.id] ?? [])].sort().join(",");
    const ok = given === [...q.answer].sort().join(",");
    if (ok) correct++;
    results[q.id] = { correct: ok, answer: q.answer };
  }
  const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  return { score, correct, total: questions.length, results };
}
