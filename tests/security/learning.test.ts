import { describe, expect, it } from "vitest";
import { signIn } from "../support/setup";
import { USERS, fakeDb, stableId } from "../support/fake-supabase";
import { POST as learn } from "@/app/api/learn/route";
import { loadQuestions, toPublic } from "@/lib/grading";

const PH = stableId("personal-health-hygiene");
const HACCP = stableId("haccp-principles");
const m = (slug: string, n: number) => stableId(`${slug}#${n}`);
const call = (body: unknown, raw?: string) => learn(new Request("https://aspire.test/api/learn", { method: "POST", body: raw ?? JSON.stringify(body), headers: { "content-type": "application/json" } }));
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
    const body = await res.json();
    expect(deepKeys(body)).not.toContain("answer");
    for (const r of Object.values(body.results)) expect(Object.keys(r as object)).toEqual(["correct"]);
  });

  it("the final exam returns only the score", async () => {
    signIn(USERS.learner);
    const body = await (await call({ type: "exam", courseId: PH, answers: {} })).json();
    expect(Object.keys(body).sort()).toEqual(["correct", "passed", "score", "total"]);
  });
});

describe("grades are computed on the server", () => {
  it("ignores score and pass fields sent by the browser", async () => {
    signIn(USERS.learner);
    const body = await (await call({ type: "exam", courseId: PH, answers: {}, score: 100, passed: true, correct: 99 })).json();
    expect(body).toMatchObject({ score: 0, passed: false });
    expect(fakeDb().exam_attempts.filter((a) => a.user_id === USERS.learner && a.course_id === PH).at(-1)).toMatchObject({ score: 0, passed: false });
  });

  it("the correct answers do score 100, so grading is real", async () => {
    signIn(USERS.learner);
    const qs = await loadQuestions({ courseId: PH, finalOnly: true });
    const body = await (await call({ type: "exam", courseId: PH, answers: Object.fromEntries(qs.map((q) => [q.id, q.answer])) })).json();
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
    const first = await (await call({ type: "quiz", moduleId: mod, answers: {} })).json();
    expect(first.completed).toBe(false);
    expect(first.slidesLeft).toBeGreaterThan(0);
    await call({ type: "progress", moduleId: mod, page: 9999 }); // clamped to the module's real slide count
    const again = await (await call({ type: "quiz", moduleId: mod, answers: {} })).json();
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
