import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * An open test. While a learner has one in a course, that course's slides are closed to them (pages and the progress
 * API) until they submit it. moduleId is null for the final assessment.
 */
export type TestLock = { course_id: string; module_id: string | null; started_at: string };

/**
 * The open test in a course: the lock, null for none, or undefined if the lock table can't be read (database not
 * updated yet). Callers then let learning carry on unlocked and the failure is logged.
 */
export async function openTest(db: SupabaseClient, userId: string, courseId: string): Promise<TestLock | null | undefined> {
  const { data, error } = await db.from("test_locks").select("course_id,module_id,started_at").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (error) { console.error("[test-lock] unavailable:", error.message); return undefined; }
  return (data as TestLock | null) ?? null;
}

export async function startTest(db: SupabaseClient, userId: string, courseId: string, moduleId: string | null) {
  const { error } = await db.from("test_locks").insert({ user_id: userId, course_id: courseId, module_id: moduleId });
  if (error) console.error("[test-lock] couldn't start:", error.message);
}

export async function endTest(db: SupabaseClient, userId: string, courseId: string) {
  await db.from("test_locks").delete().eq("user_id", userId).eq("course_id", courseId);
}

/** Where a learner with an open test must go. */
export function testHref(slug: string, lock: TestLock, modules: { id: string; position: number }[]) {
  const m = lock.module_id ? modules.find((x) => x.id === lock.module_id) : null;
  return m ? `/learn/${slug}/m/${m.position}` : `/learn/${slug}/exam`;
}

export const LOCKED_MESSAGE = "You have a test open. The slides stay closed until you submit it.";
