import { describe, expect, it } from "vitest";
import { asRoute, form, redirectOf, signIn, staleSession } from "../support/setup";
import { USERS, COMPANY, fakeDb, stableId } from "../support/fake-supabase";
import { loader as certificateLoader } from "@/app/api/certificate/[serial]/route";
import { action as learnAction } from "@/app/api/learn/route";
import { enrol, saveAssignment, updateProfile } from "@/app/actions";
import { claimCertificate } from "@/app/pay-actions";
import { buySeats, createCompany, joinCompany, removeMember } from "@/app/company-actions";
import * as admin from "@/app/admin/actions";
import { coveredByCompany } from "@/lib/certs";

const HACCP = stableId("haccp-principles");
const JANE_CERT = "ASH-2026-JWK001";
const pdf = (serial: string) => asRoute(certificateLoader, { serial })(new Request(`https://aspire.test/api/certificate/${serial}`));
/** Sends a request; quiz and exam answers are preceded by starting that test, as the page does. */
const learn = asRoute(learnAction);
const send = (body: unknown, raw?: string) => learn(new Request("https://aspire.test/api/learn", { method: "POST", body: raw ?? JSON.stringify(body), headers: { "content-type": "application/json" } }));
async function withStart(body: unknown, raw?: string) {
  const b = (body ?? {}) as { type?: string; moduleId?: string; courseId?: string };
  if (!raw && (b.type === "quiz" || b.type === "exam")) {
    const courseId = b.type === "exam" ? b.courseId : (fakeDb().modules.find((m) => m.id === b.moduleId)?.course_id as string | undefined);
    if (courseId) await send({ type: "start", courseId, ...(b.type === "quiz" ? { moduleId: b.moduleId } : {}) });
  }
  return send(body, raw);
}
const post = (body: unknown) => withStart(body);
const profile = (id: string) => fakeDb().profiles.find((p) => p.id === id)!;
const snapshot = () => JSON.stringify(fakeDb());

describe("unauthenticated and stale sessions are rejected", () => {
  it("the learning API returns 401 with no session, and with an expired or revoked one", async () => {
    signIn(null);
    expect((await post({ type: "progress", moduleId: stableId("haccp-principles#1"), page: 3 })).status).toBe(401);
    staleSession(USERS.learner); // cookie still says Jane, but Supabase no longer accepts the token
    expect((await post({ type: "exam", courseId: HACCP, answers: {} })).status).toBe(401);
  });

  it("certificate PDFs send anonymous and stale sessions to sign in", async () => {
    signIn(null);
    expect((await pdf(JANE_CERT)).headers.get("location")).toContain("/login");
    staleSession(USERS.learner);
    expect((await pdf(JANE_CERT)).headers.get("location")).toContain("/login");
  });

  it("every user server action refuses to run without a valid session", async () => {
    for (const s of [() => signIn(null), () => staleSession(USERS.owner)]) {
      s();
      const before = snapshot();
      for (const act of [
        () => updateProfile(form({ full_name: "Hacker" })),
        () => saveAssignment(form({ course_id: HACCP, slug: "haccp-principles", body: "x" })),
        () => createCompany(form({ name: "Evil Co" })),
        () => buySeats(form({ seats: "5", method: "card" })),
        () => removeMember(form({ user_id: USERS.member })),
        () => joinCompany(form({ code: "HOTEL0000000CODE" })),
        () => claimCertificate(form({ slug: "haccp-principles", method: "card", full_name: "A B C", id_number: "1234", confirm: "on" })),
      ]) expect(await redirectOf(act)).toMatch(/^\/login\?next=/);
      expect(await redirectOf(() => enrol(form({ slug: "haccp-principles" })))).toMatch(/^\/signup/);
      expect(snapshot()).toBe(before);
    }
  });
});

describe("no privilege escalation", () => {
  const attempts = (target: string) => [
    () => admin.setRole(form({ id: target, role: "admin" })),
    () => admin.saveCourse(form({ id: HACCP, title: "Hacked", certificate_price_usd: "0", published: "on" })),
    () => admin.saveQuestion(form({ course_id: HACCP, id: fakeDb().questions.find((q) => q.course_id === HACCP)!.id as string, prompt: "x", options: "a\nb", answer: "1" })),
    () => admin.deleteCourse(form({ id: HACCP })),
    () => admin.setRevoked(form({ id: fakeDb().certificates[0].id as string, revoked: "1" })),
    () => admin.adjustCompany(form({ id: COMPANY.hotel, seats: "9999", paid_until: "2099-01-01" })),
    () => admin.saveSettings(form({ seat_price_usd: "0" })),
    () => admin.createCourse(form({ title: "Evil" })),
    () => admin.saveModule(form({ course_id: HACCP, title: "x", video_url: "javascript:alert(1)" })),
    () => admin.setSlides(HACCP, 99, 1),
  ];
  for (const who of ["learner", "owner", "member"] as const) {
    it(`a ${who} cannot run any admin action`, async () => {
      signIn(USERS[who]);
      const before = snapshot();
      for (const act of attempts(USERS[who])) expect(await redirectOf(act)).toBe("/dashboard");
      expect(snapshot()).toBe(before);
      expect(profile(USERS[who]).role).toBe("learner");
    });
  }

  it("profile updates ignore role, company and email fields smuggled into the form", async () => {
    signIn(USERS.member);
    await redirectOf(() => updateProfile(form({ full_name: "Member", role: "admin", company_role: "owner", company_id: COMPANY.rival, email: "Aspiresafetystandards@gmail.com", id: USERS.owner })));
    expect(profile(USERS.member)).toMatchObject({ role: "learner", company_role: "member", company_id: COMPANY.hotel, email: "member@test.invalid", full_name: "Member" });
    expect(profile(USERS.owner).full_name).toBe("Grace Achieng");
  });

  it("an admin cannot demote themselves (no lock-out), and roles take effect immediately", async () => {
    signIn(USERS.admin);
    await redirectOf(() => admin.setRole(form({ id: USERS.admin, role: "learner" })));
    expect(profile(USERS.admin).role).toBe("admin");
    await redirectOf(() => admin.setRole(form({ id: USERS.learner, role: "admin" })));
    signIn(USERS.learner);
    expect(await redirectOf(() => admin.saveSettings(form({ seat_price_usd: "7" })))).toBe("/admin?saved=1");
    signIn(USERS.admin);
    await redirectOf(() => admin.setRole(form({ id: USERS.learner, role: "learner" })));
    signIn(USERS.learner);
    expect(await redirectOf(() => admin.saveSettings(form({ seat_price_usd: "0" })))).toBe("/dashboard");
  });
});

describe("no access to other people's records", () => {
  it("another user's certificate PDF is a 404; the owner and an admin get it", async () => {
    for (const u of [USERS.owner, USERS.member, USERS.rivalOwner, USERS.outsider]) {
      signIn(u);
      expect((await pdf(JANE_CERT)).status).toBe(404);
    }
    signIn(USERS.learner);
    const own = await pdf(JANE_CERT);
    expect(own.status).toBe(200);
    expect(own.headers.get("content-type")).toBe("application/pdf");
    expect(own.headers.get("cache-control")).toContain("no-store");
    signIn(USERS.admin);
    expect((await pdf(JANE_CERT)).status).toBe(200);
  });

  it("a revoked certificate can't be downloaded, even by its holder", async () => {
    fakeDb().certificates[0].revoked = true;
    signIn(USERS.learner);
    expect((await pdf(JANE_CERT)).status).toBe(404);
  });

  it("progress and quizzes can't be written into a course the user isn't enrolled in", async () => {
    signIn(USERS.outsider);
    expect((await post({ type: "progress", moduleId: stableId("haccp-principles#1"), page: 20 })).status).toBe(403);
    expect((await post({ type: "quiz", moduleId: stableId("haccp-principles#1"), answers: {} })).status).toBe(403);
    expect((await post({ type: "exam", courseId: HACCP, answers: {} })).status).toBe(403);
    expect(fakeDb().module_progress.filter((p) => p.user_id === USERS.outsider)).toHaveLength(0);
    expect(fakeDb().exam_attempts.filter((p) => p.user_id === USERS.outsider)).toHaveLength(0);
  });

  it("assignments can't be filed against a course the learner isn't enrolled in", async () => {
    signIn(USERS.outsider);
    await redirectOf(() => saveAssignment(form({ course_id: HACCP, slug: "haccp-principles", body: "spam" })));
    expect(fakeDb().assignment_submissions).toHaveLength(0);
  });
});

describe("company accounts are isolated", () => {
  it("an owner can't remove another company's staff; a member can't remove anyone", async () => {
    signIn(USERS.rivalOwner);
    await redirectOf(() => removeMember(form({ user_id: USERS.member })));
    expect(profile(USERS.member).company_id).toBe(COMPANY.hotel);
    signIn(USERS.member);
    await redirectOf(() => removeMember(form({ user_id: USERS.owner })));
    expect(profile(USERS.owner).company_role).toBe("owner");
  });

  it("an owner can't remove the owner role from themselves via removeMember, and can remove their own member", async () => {
    signIn(USERS.owner);
    await redirectOf(() => removeMember(form({ user_id: USERS.owner })));
    expect(profile(USERS.owner).company_id).toBe(COMPANY.hotel);
    await redirectOf(() => removeMember(form({ user_id: USERS.member })));
    expect(profile(USERS.member).company_id).toBeNull();
  });

  it("a removed member immediately loses free certificates", async () => {
    expect(await coveredByCompany(USERS.member)).toBe(true);
    signIn(USERS.owner);
    await redirectOf(() => removeMember(form({ user_id: USERS.member })));
    expect(await coveredByCompany(USERS.member)).toBe(false);
  });

  it("a newly created company does not cover anyone until it pays", async () => {
    signIn(USERS.outsider);
    await redirectOf(() => createCompany(form({ name: "Self-made Ltd" })));
    expect(profile(USERS.outsider).company_role).toBe("owner");
    expect(await coveredByCompany(USERS.outsider)).toBe(false);
  });

  it("guessing invite codes is rate limited", async () => {
    signIn(USERS.outsider);
    const results: (string | null)[] = [];
    for (let i = 0; i < 12; i++) results.push(await redirectOf(() => joinCompany(form({ code: `GUESS${String(i).padStart(6, "0")}` }))));
    expect(results.slice(0, 10).every((r) => r?.includes("isn't%20valid") || r?.includes("isn%27t%20valid"))).toBe(true);
    expect(results.slice(10).every((r) => r?.includes("Too%20many"))).toBe(true);
    // Even the right code is refused while the limit applies.
    expect(await redirectOf(() => joinCompany(form({ code: "HOTEL0000000CODE" })))).toContain("Too%20many");
    expect(profile(USERS.outsider).company_id).toBeNull();
  });

  it("simultaneous joins never exceed the seats bought", async () => {
    const db = fakeDb();
    const extra = ["a", "b", "c", "d"].map((x, i) => {
      const id = `00000000-0000-4000-8000-0000000001${i}0`;
      db.profiles.push({ id, email: `${x}@test.invalid`, full_name: x, role: "learner", company_id: null, company_role: null, created_at: new Date().toISOString() });
      return id;
    });
    // Hotel: 3 seats, 2 used (owner + member).
    await Promise.all(extra.map(async (id) => { signIn(id); return redirectOf(() => joinCompany(form({ code: "HOTEL0000000CODE" }))); }));
    expect(db.profiles.filter((p) => p.company_id === COMPANY.hotel).length).toBeLessThanOrEqual(3);
  });
});

describe("public certificate checks", () => {
  it("the verify page sends only a partly hidden ID number to the browser", async () => {
    const { loader } = await import("@/app/verify/[serial]/page");
    const cert = fakeDb().certificates.find((c) => c.serial === JANE_CERT)!;
    const data = await loader({ request: new Request(`https://aspire.test/verify/${JANE_CERT}`), params: { serial: JANE_CERT }, context: {} } as never);
    const sent = JSON.stringify(data);
    expect(sent).toContain("Jane Wanjiku Kamau");
    expect(sent).not.toContain(String(cert.id_number)); // the full number never leaves the server
    expect(data.allowed && data.c?.id_number).toMatch(/•/);
  });
});

describe("company history and deletion", () => {
  const events = (id: string) => fakeDb().company_events.filter((e) => e.company_id === id);

  it("records owner and admin changes in one shared history", async () => {
    signIn(USERS.owner);
    await redirectOf(() => removeMember(form({ user_id: USERS.member })));
    signIn(USERS.admin);
    await redirectOf(() => admin.adjustCompany(form({ id: COMPANY.hotel, seats: "7", paid_until: "2030-01-01" })));
    const log = events(COMPANY.hotel);
    expect(log.map((e) => e.kind)).toEqual(["member_removed", "adjusted"]);
    expect(log[1].by_admin).toBe(true);
    expect(String(log[1].detail)).toContain("seats 3 → 7");
  });

  it("only an admin can delete a company, and only after typing its name", async () => {
    for (const u of [USERS.owner, USERS.member, USERS.learner]) {
      signIn(u);
      await redirectOf(() => admin.deleteCompany(form({ id: COMPANY.hotel, confirm: "Beach Hotel" })));
    }
    signIn(USERS.admin);
    expect(await redirectOf(() => admin.deleteCompany(form({ id: COMPANY.hotel, confirm: "beach hotel" })))).toContain("error");
    expect(fakeDb().companies.some((c) => c.id === COMPANY.hotel)).toBe(true);
  });

  it("deleting keeps the staff's own accounts and certificates, and the history", async () => {
    const certsBefore = fakeDb().certificates.length;
    signIn(USERS.admin);
    expect(await redirectOf(() => admin.deleteCompany(form({ id: COMPANY.hotel, confirm: "Beach Hotel" })))).toContain("done");
    expect(fakeDb().companies.some((c) => c.id === COMPANY.hotel)).toBe(false);
    expect(profile(USERS.member).company_id).toBeNull();
    expect(profile(USERS.owner).company_id).toBeNull();
    expect(fakeDb().certificates.length).toBe(certsBefore);
    expect(fakeDb().company_events.some((e) => e.kind === "deleted" && e.company_name === "Beach Hotel")).toBe(true);
  });
});
