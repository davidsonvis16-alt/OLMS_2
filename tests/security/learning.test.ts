import { describe, expect, it } from "vitest";
import { signIn } from "../support/setup";
import { USERS, fakeDb, stableId } from "../support/fake-supabase";
import { action as learnAction } from "@/app/api/learn/route";
import { asRoute } from "../support/setup";
const learn = asRoute(learnAction);
import { loadQuestions, toPublic } from "@/lib/grading";

const PH = stableId("personal-health-hygiene");
const HACCP = stableId("haccp-principles");
const m = (slug: string, n: number) => stableId(`${slug}#${n}`);
/** Sends a request; quiz and exam answers are preceded by starting that test, as the page does. */
const send = (body: unknown, raw?: string) => learn(new Request("https://aspire.test/api/learn", { method: "POST", body: raw ?? JSON.stringify(body), headers: { "content-type": "application/json" } }));
async function withStart(body: unknown, raw?: string) {
  const b = (body ?? {}) as { type?: string; moduleId?: string; courseId?: string };
  if (!raw && (b.type === "quiz" || b.type === "exam")) {
    const courseId = b.type === "exam" ? b.courseId : (fakeDb().modules.find((m) => m.id === b.moduleId)?.course_id as string | undefined);
    if (courseId) await send({ type: "start", courseId, ...(b.type === "quiz" ? { moduleId: b.moduleId } : {}) });
  }
  return send(body, raw);
}
const call = withStart;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
const deepKeys = (o: unknown): string[] => (o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => [k, ...deepKeys(v)]) : []);

describe("answer keys never leave the server", () => {
  it("questions sent to the browser have no answers", async () => {
    const qs = (await loadQuestions({ moduleId: m("haccp-principles", 2) })).map(toPublic);
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) expect(Object.keys(q).sort()).toEqual(["id", "multi", "options", "pick", "prompt"]);
  });

  it("a knowledge-check result says right or wrong, but never which option is correct", async () => {
    signIn(USERS.learner);
    const res = await call({ type: "quiz", moduleId: m("haccp-principles", 2), answers: {} });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(deepKeys(body)).not.toContain("answer");
    for (const r of Object.values(body.results)) expect(Object.keys(r as object)).toEqual(["correct"]);
  });

  it("the final exam returns only the score", async () => {
    signIn(USERS.learner);
    const body = (await (await call({ type: "exam", courseId: PH, answers: {} })).json()) as Json;
    expect(Object.keys(body).sort()).toEqual(["correct", "passed", "score", "total"]);
  });
});

describe("grades are computed on the server", () => {
  it("ignores score and pass fields sent by the browser", async () => {
    signIn(USERS.learner);
    const body = (await (await call({ type: "exam", courseId: PH, answers: {}, score: 100, passed: true, correct: 99 })).json()) as Json;
    expect(body).toMatchObject({ score: 0, passed: false });
    expect(fakeDb().exam_attempts.filter((a) => a.user_id === USERS.learner && a.course_id === PH).at(-1)).toMatchObject({ score: 0, passed: false });
  });

  it("the correct answers do score 100, so grading is real", async () => {
    signIn(USERS.learner);
    const qs = await loadQuestions({ courseId: PH, finalOnly: true });
    const body = (await (await call({ type: "exam", courseId: PH, answers: Object.fromEntries(qs.map((q) => [q.id, q.answer])) })).json()) as Json;
    expect(body).toMatchObject({ score: 100, passed: true });
  });
});

describe("course rules are enforced by the server, not the page", () => {
  it("a locked module can't be completed through the API", async () => {
    signIn(USERS.learner); // HACCP: module 1 done, 2 in progress, 3 locked
    expect((await call({ type: "quiz", moduleId: m("haccp-principles", 3), answers: {} })).status).toBe(403);
    expect((await call({ type: "progress", moduleId: m("haccp-principles", 4), page: 99 })).status).toBe(403);
  });

  it("the final exam is refused until every module is complete", async () => {
    signIn(USERS.learner);
    expect((await call({ type: "exam", courseId: HACCP, answers: {} })).status).toBe(403);
  });

  it("a module only completes once its slides have been viewed", async () => {
    signIn(USERS.learner);
    const mod = m("haccp-principles", 2);
    const first = (await (await call({ type: "quiz", moduleId: mod, answers: {} })).json()) as Json;
    expect(first.completed).toBe(false);
    expect(first.slidesLeft).toBeGreaterThan(0);
    await call({ type: "progress", moduleId: mod, page: 9999 }); // clamped to the module's real slide count
    const again = (await (await call({ type: "quiz", moduleId: mod, answers: {} })).json()) as Json;
    expect(again.completed).toBe(true);
    const row = fakeDb().module_progress.find((p) => p.user_id === USERS.learner && p.module_id === mod)!;
    expect(row.viewed_upto).toBe(9); // slides 22–30
  });
});

describe("malformed input is rejected before it reaches the database", () => {
  it.each<[string, unknown, string?]>([
    ["not JSON", undefined, "{oops"],
    ["unknown type", { type: "grant", courseId: PH }],
    ["non-UUID id", { type: "exam", courseId: "1 OR 1=1", answers: {} }],
    ["answers not an array", { type: "exam", courseId: PH, answers: { [stableId("x")]: "1" } }],
    ["object instead of answers", { type: "exam", courseId: PH, answers: { [stableId("x")]: [{ $gt: 0 }] } }],
    ["negative option", { type: "exam", courseId: PH, answers: { [stableId("x")]: [-1] } }],
    ["page as string", { type: "progress", moduleId: m("personal-health-hygiene", 1), page: "999" }],
    ["prototype pollution key", undefined, `{"type":"exam","courseId":"${PH}","answers":{"__proto__":[1]}}`],
  ])("%s → 400", async (_n, body, raw) => {
    signIn(USERS.learner);
    expect((await call(body, raw)).status).toBe(400);
  });

  it("an oversized request → 413", async () => {
    signIn(USERS.learner);
    const res = await learn(new Request("https://aspire.test/api/learn", { method: "POST", body: "x".repeat(70_000), headers: { "content-length": "70000" } }));
    expect(res.status).toBe(413);
  });
});

describe("rate limits", () => {
  it("the final exam allows 20 attempts an hour, then 429, per person", async () => {
    signIn(USERS.learner);
    const codes = [];
    for (let i = 0; i < 22; i++) codes.push((await call({ type: "exam", courseId: PH, answers: {} })).status);
    expect(codes.slice(0, 20).every((c) => c === 200)).toBe(true);
    expect(codes.slice(20)).toEqual([429, 429]);
    signIn(USERS.owner); // another person is unaffected
    expect((await call({ type: "exam", courseId: PH, answers: {} })).status).not.toBe(429);
  });
});

describe("a test, once started, closes the slides until it is submitted", () => {
  const start = (courseId: string, moduleId?: string) => send({ type: "start", courseId, ...(moduleId ? { moduleId } : {}) });
  const locks = () => fakeDb().test_locks.filter((l) => l.user_id === USERS.learner);

  it("answers are refused unless the test was started first", async () => {
    signIn(USERS.learner);
    const before = JSON.stringify(fakeDb());
    const q = await send({ type: "quiz", moduleId: m("haccp-principles", 2), answers: {} });
    expect(q.status).toBe(409);
    expect(((await q.json()) as Json).notStarted).toBe(true);
    expect((await send({ type: "exam", courseId: PH, answers: {} })).status).toBe(409);
    expect(JSON.stringify(fakeDb())).toBe(before);
  });

  it("while a knowledge check is open, no slide in that course can be opened, and no other test started", async () => {
    signIn(USERS.learner);
    expect((await start(HACCP, m("haccp-principles", 2))).status).toBe(200);
    const viewed = () => fakeDb().module_progress.find((p) => p.user_id === USERS.learner && p.module_id === m("haccp-principles", 2))?.viewed_upto;
    const was = viewed();
    for (const mod of [m("haccp-principles", 1), m("haccp-principles", 2)]) {
      const r = await send({ type: "progress", moduleId: mod, page: 5 });
      expect(r.status).toBe(409);
      expect(((await r.json()) as Json).locked).toBe(true);
    }
    expect(viewed()).toBe(was);
    expect((await start(HACCP, m("haccp-principles", 1))).status).toBe(409); // another check in the same course
    expect((await start(HACCP, m("haccp-principles", 2))).status).toBe(200); // reopening the same one is fine
    expect(locks()).toHaveLength(1);
    // Other courses are unaffected.
    expect((await send({ type: "progress", moduleId: m("personal-health-hygiene", 1), page: 2 })).status).toBe(200);

    // Submitting closes the test and opens the slides again.
    expect((await send({ type: "quiz", moduleId: m("haccp-principles", 2), answers: {} })).status).toBe(200);
    expect(locks()).toHaveLength(0);
    expect((await send({ type: "progress", moduleId: m("haccp-principles", 2), page: 5 })).status).toBe(200);
    // A retake must be started again.
    expect((await send({ type: "quiz", moduleId: m("haccp-principles", 2), answers: {} })).status).toBe(409);
  });

  it("the final assessment locks the course's slides the same way", async () => {
    signIn(USERS.learner);
    expect((await start(PH)).status).toBe(200);
    expect((await send({ type: "progress", moduleId: m("personal-health-hygiene", 1), page: 1 })).status).toBe(409);
    expect((await start(PH, m("personal-health-hygiene", 1))).status).toBe(409);
    expect((await send({ type: "exam", courseId: PH, answers: {} })).status).toBe(200);
    expect(locks()).toHaveLength(0);
    expect((await send({ type: "progress", moduleId: m("personal-health-hygiene", 1), page: 1 })).status).toBe(200);
  });

  it("a test can only be started when it could be taken", async () => {
    signIn(USERS.learner);
    expect((await start(HACCP, m("haccp-principles", 3))).status).toBe(403); // module still locked
    expect((await start(HACCP)).status).toBe(403); // modules not finished
    expect((await start(PH, m("haccp-principles", 2))).status).toBe(400); // module from another course
    signIn(USERS.outsider);
    expect((await start(HACCP, m("haccp-principles", 1))).status).toBe(403); // not enrolled
    expect(fakeDb().test_locks).toHaveLength(0);
  });

  it("the course and module pages send a learner with an open test back to it", async () => {
    const { redirectOf } = await import("../support/setup");
    const { loader: moduleLoader } = await import("@/app/learn/[slug]/m/[position]/page");
    const { loader: courseLoader } = await import("@/app/learn/[slug]/page");
    const args = (params: Record<string, string>, path: string) => ({ params, request: new Request(`https://aspire.test${path}`), context: {} as never, unstable_pattern: "", url: new URL(`https://aspire.test${path}`) }) as unknown as Parameters<typeof moduleLoader>[0];
    signIn(USERS.learner);
    await start(PH);
    expect(await redirectOf(() => moduleLoader(args({ slug: "personal-health-hygiene", position: "1" }, "/learn/personal-health-hygiene/m/1")))).toBe("/learn/personal-health-hygiene/exam");
    expect(await redirectOf(() => courseLoader(args({ slug: "personal-health-hygiene" }, "/learn/personal-health-hygiene")))).toBe("/learn/personal-health-hygiene/exam");
    // No slide addresses are sent to a learner who has a test open in that module.
    await send({ type: "exam", courseId: PH, answers: {} });
    expect(await redirectOf(() => moduleLoader(args({ slug: "personal-health-hygiene", position: "1" }, "/learn/personal-health-hygiene/m/1")))).toBeNull();
    await start(PH, m("personal-health-hygiene", 1));
    const open = await moduleLoader(args({ slug: "personal-health-hygiene", position: "1" }, "/learn/personal-health-hygiene/m/1"));
    expect(open.testOpen).toBe(true);
    expect(open.slides).toEqual([]);
  });

});
