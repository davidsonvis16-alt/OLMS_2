import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { form, redirectOf, signIn } from "../support/setup";
import { USERS, bans, fakeDb, stableId } from "../support/fake-supabase";
import { action as learnAction } from "@/app/api/learn/route";
import { asRoute } from "../support/setup";
const learn = asRoute(learnAction);
import { updateProfile } from "@/app/actions";
import { claimCertificate } from "@/app/pay-actions";
import * as admin from "@/app/admin/actions";

const profile = (id: string) => fakeDb().profiles.find((p) => p.id === id);
const snapshot = () => JSON.stringify(fakeDb());
const progress = () => learn(new Request("https://aspire.test/api/learn", { method: "POST", body: JSON.stringify({ type: "progress", moduleId: stableId("haccp-principles#1"), page: 3 }), headers: { "content-type": "application/json" } }));
const JANE_CERT = "ASH-2026-JWK001";

describe("suspending and deleting accounts", () => {
  for (const who of ["learner", "owner", "member"] as const) {
    it(`a ${who} cannot suspend, restore or delete anyone`, async () => {
      signIn(USERS[who]);
      const before = snapshot();
      for (const act of [admin.suspendUser, admin.restoreUser, admin.deleteUser]) {
        expect(await redirectOf(() => act(form({ id: USERS.outsider, confirm: "DELETE" })))).toBe("/dashboard");
      }
      expect(snapshot()).toBe(before);
      expect(bans.size).toBe(0);
    });
  }

  it("an admin can't suspend or delete themselves or another admin", async () => {
    signIn(USERS.admin);
    fakeDb().profiles.find((p) => p.id === USERS.owner)!.role = "admin";
    const before = snapshot();
    for (const id of [USERS.admin, USERS.owner]) {
      for (const act of [admin.suspendUser, admin.deleteUser]) {
        expect(await redirectOf(() => act(form({ id, confirm: "DELETE" })))).toMatch(/^\/admin\/learners\?error=/);
      }
    }
    expect(snapshot()).toBe(before);
    expect(bans.size).toBe(0);
  });

  it("a suspended learner is locked out at once, even with an open session, until restored", async () => {
    signIn(USERS.learner);
    expect((await progress()).status).toBe(200);

    signIn(USERS.admin);
    expect(await redirectOf(() => admin.suspendUser(form({ id: USERS.learner })))).toMatch(/^\/admin\/learners\?done=/);
    expect(profile(USERS.learner)!.suspended_at).toBeTruthy();
    expect(bans.get(USERS.learner)).toBe("876000h"); // Supabase refuses new sign-ins

    signIn(USERS.learner); // the old session cookie is still there
    expect((await progress()).status).toBe(401);
    expect(await redirectOf(() => updateProfile(form({ full_name: "Still here" })))).toBe("/login?error=suspended");
    expect(profile(USERS.learner)!.full_name).not.toBe("Still here");

    signIn(USERS.admin);
    await redirectOf(() => admin.restoreUser(form({ id: USERS.learner })));
    expect(profile(USERS.learner)!.suspended_at).toBeNull();
    expect(bans.get(USERS.learner)).toBe("none");
    signIn(USERS.learner);
    expect((await progress()).status).toBe(200);
  });

  it("deleting needs DELETE typed, removes the person's data, and keeps issued certificates verifiable", async () => {
    signIn(USERS.admin);
    const before = snapshot();
    for (const confirm of ["", "delete", "yes"]) expect(await redirectOf(() => admin.deleteUser(form({ id: USERS.learner, confirm })))).toMatch(/error=/);
    expect(snapshot()).toBe(before);

    expect(await redirectOf(() => admin.deleteUser(form({ id: USERS.learner, confirm: "DELETE" })))).toMatch(/^\/admin\/learners\?done=/);
    const db = fakeDb();
    expect(profile(USERS.learner)).toBeUndefined();
    for (const t of ["enrollments", "module_progress", "exam_attempts", "assignment_submissions"]) expect(db[t].some((r) => r.user_id === USERS.learner)).toBe(false);
    const cert = db.certificates.find((c) => c.serial === JANE_CERT)!;
    expect(cert).toBeTruthy();
    expect(cert.user_id).toBeNull();
    expect(cert.full_name).toBe("Jane Wanjiku Kamau");
  });
});

describe("one account per person", () => {
  it("an ID number already on another account can't be saved again, however it's typed", async () => {
    signIn(USERS.outsider);
    const before = snapshot();
    for (const id of ["32456789", "32 456 789", "32-456-789"]) {
      const to = await redirectOf(() => updateProfile(form({ full_name: "Out Sider", id_number: id })));
      expect(decodeURIComponent(to!)).toContain("already registered to another account");
    }
    expect(snapshot()).toBe(before);
  });

  it("a phone number already on another account is refused, in local or international form", async () => {
    signIn(USERS.outsider);
    const before = snapshot();
    for (const local of ["0711 000 000", "711000000", "+254 711 000000"]) {
      const to = await redirectOf(() => updateProfile(form({ full_name: "Out Sider", phone_country: "KE", phone_local: local })));
      expect(decodeURIComponent(to!)).toContain("already linked to another account");
    }
    expect(snapshot()).toBe(before);
    // Their own number, or a new one, is fine and is stored in full international form.
    await redirectOf(() => updateProfile(form({ full_name: "Out Sider", phone_country: "KE", phone_local: "0722 123 456" })));
    expect(profile(USERS.outsider)!.phone).toBe("+254722123456");
  });

  it("an invalid phone number is refused with a plain message", async () => {
    signIn(USERS.outsider);
    const to = await redirectOf(() => updateProfile(form({ full_name: "Out Sider", phone_country: "KE", phone_local: "12345" })));
    expect(decodeURIComponent(to!)).toContain("doesn't look right for Kenya");
  });

  it("a second account can't claim a certificate with someone else's ID number", async () => {
    signIn(USERS.outsider);
    const before = snapshot();
    const to = await redirectOf(() => claimCertificate(form({ slug: "haccp-principles", method: "card", full_name: "Jane Wanjiku Kamau", id_number: "32456789", confirm: "on" })));
    expect(decodeURIComponent(to!)).toContain("already registered to another account");
    expect(snapshot()).toBe(before);
  });

  it("the database blocks a sign-up with a phone already in use, and records consent to the terms", () => {
    const sql = fs.readFileSync("supabase/schema.sql", "utf8");
    const trigger = sql.slice(sql.indexOf("function public.handle_new_user"), sql.indexOf("create trigger on_auth_user_created"));
    expect(trigger).toMatch(/norm_phone\(phone\) = public\.norm_phone\(new\.raw_user_meta_data->>'phone'\)[\s\S]*raise exception/);
    expect(trigger).toContain("terms_accepted_at");
    expect(sql).toMatch(/revoke all on function public\.identity_taken\(uuid, text, text\) from public, anon, authenticated/);
    expect(sql).toMatch(/certificates_user_id_fkey foreign key \(user_id\) references auth\.users\(id\) on delete set null/);
  });
});

describe("your details and the live certificate preview", () => {
  it("saving details answers in place, with plain errors and the same one-account rule", async () => {
    const { saveDetails } = await import("@/app/actions");
    signIn(USERS.outsider);
    expect(await saveDetails({}, form({ full_name: "Out Sider Updated", id_number: "55556666", phone_country: "KE", phone_local: "" }))).toMatchObject({ ok: true });
    expect(profile(USERS.outsider)!.full_name).toBe("Out Sider Updated");
    expect((await saveDetails({}, form({ full_name: "Out Sider", id_number: "32456789" }))).error).toContain("already registered to another account");
    expect((await saveDetails({}, form({ full_name: "Al", id_number: "55556666" }))).error).toContain("full name");
    expect(profile(USERS.outsider)!.full_name).toBe("Out Sider Updated");
    signIn(null);
    expect(await redirectOf(() => saveDetails({}, form({ full_name: "Nobody" })))).toMatch(/^\/login/);
  });

  it("the preview draws only for a course the signed-in learner has passed, with what they typed", async () => {
    const { certificatePreview } = await import("@/app/cert-preview");
    signIn(USERS.learner);
    const passed = fakeDb().exam_attempts.find((a) => a.user_id === USERS.learner && a.passed);
    const course = fakeDb().courses.find((c) => c.id === passed?.course_id);
    expect(course).toBeTruthy();
    const p = await certificatePreview(String(course!.slug), "Jane Typed Name", "ZZ1234");
    const text = JSON.stringify(p!.ops);
    expect(text).toContain("Jane Typed Name");
    expect(text).toContain("ZZ1234");
    expect(text).toContain("ASH-XXXX-XXXXXX"); // a sample: never a real serial
    const notPassed = fakeDb().courses.find((c) => !fakeDb().exam_attempts.some((a) => a.user_id === USERS.learner && a.passed && a.course_id === c.id));
    expect(await certificatePreview(String(notPassed!.slug), "X Y Z", "1234")).toBeNull();
    signIn(null);
    expect(await redirectOf(() => certificatePreview(String(course!.slug), "X", "Y"))).toMatch(/^\/login/);
  });
});
