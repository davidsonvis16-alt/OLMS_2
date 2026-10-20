import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { form, paystack, redirectOf, signIn } from "../support/setup";
import { USERS, COMPANY, fakeDb, stableId } from "../support/fake-supabase";
import { action as webhookAction } from "@/app/api/pay/webhook/route";
import { loader as callbackLoader } from "@/app/api/pay/callback/route";
import { asRoute } from "../support/setup";
const webhook = asRoute(webhookAction);
const callback = asRoute(callbackLoader);
import { claimCertificate } from "@/app/pay-actions";
import { buySeats } from "@/app/company-actions";

const HACCP = stableId("haccp-principles");
const sign = (body: string, key = process.env.PAYSTACK_SECRET_KEY!) => crypto.createHmac("sha512", key).update(body).digest("hex");
const hook = (body: object, sig?: string | null) => {
  const raw = JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (sig !== null) headers["x-paystack-signature"] = sig ?? sign(raw);
  return webhook(new Request("https://aspire.test/api/pay/webhook", { method: "POST", body: raw, headers }));
};
const success = (reference: string) => ({ event: "charge.success", data: { reference, amount: 1500, status: "success" } });

/** A learner who has passed HACCP and has a pending US$15 certificate payment. */
function pendingCertificate(reference = "CERT-TEST-1", amount = 15, currency = "USD") {
  const db = fakeDb();
  db.courses.find((c) => c.id === HACCP)!.certificate_price_usd = 15;
  db.exam_attempts.push({ id: crypto.randomUUID(), user_id: USERS.learner, course_id: HACCP, score: 92, passed: true, created_at: new Date().toISOString() });
  db.payments.push({ id: crypto.randomUUID(), reference, user_id: USERS.learner, course_id: HACCP, purpose: "certificate", amount, currency, amount_usd: 15, status: "pending", created_at: new Date().toISOString(), paid_at: null, channel: null });
  return reference;
}
const certs = () => fakeDb().certificates.filter((c) => c.user_id === USERS.learner && c.course_id === HACCP);
const pay = (ref: string) => fakeDb().payments.find((p) => p.reference === ref)!;

describe("Paystack webhook cannot be forged", () => {
  it("rejects a request with no signature", async () => {
    const ref = pendingCertificate();
    paystack.txs.set(ref, { status: "success", amount: 1500, currency: "USD", reference: ref });
    const res = await hook(success(ref), null);
    expect(res.status).toBe(401);
    expect(pay(ref).status).toBe("pending");
    expect(certs()).toHaveLength(0);
  });

  it("rejects a request signed with any other key", async () => {
    const ref = pendingCertificate();
    paystack.txs.set(ref, { status: "success", amount: 1500, currency: "USD", reference: ref });
    const raw = JSON.stringify(success(ref));
    const res = await hook(success(ref), sign(raw, "sk_live_attacker_guess"));
    expect(res.status).toBe(401);
    expect(certs()).toHaveLength(0);
  });

  it("does nothing for a correctly signed event when Paystack does not confirm the payment", async () => {
    const ref = pendingCertificate();
    // Paystack has no successful transaction for this reference.
    expect((await hook(success(ref))).status).toBe(200);
    paystack.txs.set(ref, { status: "abandoned", amount: 1500, currency: "USD", reference: ref });
    expect((await hook(success(ref))).status).toBe(200);
    expect(pay(ref).status).toBe("pending");
    expect(certs()).toHaveLength(0);
    // It asked Paystack instead of trusting the event body, which claimed success.
    expect(paystack.calls.filter((c) => c.includes(`/transaction/verify/${ref}`))).toHaveLength(2);
  });

  it("rejects an underpayment and marks the payment failed", async () => {
    const ref = pendingCertificate();
    paystack.txs.set(ref, { status: "success", amount: 100, currency: "USD", reference: ref }); // US$1.00
    await hook(success(ref));
    expect(pay(ref).status).toBe("failed");
    expect(certs()).toHaveLength(0);
  });

  it("rejects the right number in the wrong currency", async () => {
    const ref = pendingCertificate();
    paystack.txs.set(ref, { status: "success", amount: 1500, currency: "KES", reference: ref }); // KES 15, not US$15
    await hook(success(ref));
    expect(pay(ref).status).toBe("failed");
    expect(certs()).toHaveLength(0);
  });

  it("rejects a verification that comes back for a different reference", async () => {
    const ref = pendingCertificate();
    paystack.txs.set(ref, { status: "success", amount: 1500, currency: "USD", reference: "SOMEONE-ELSES-REF" });
    await hook(success(ref));
    expect(pay(ref).status).toBe("pending");
    expect(certs()).toHaveLength(0);
  });

  it("never revives a payment that was marked failed", async () => {
    const ref = pendingCertificate();
    pay(ref).status = "failed";
    paystack.txs.set(ref, { status: "success", amount: 1500, currency: "USD", reference: ref });
    await hook(success(ref));
    expect(pay(ref).status).toBe("failed");
    expect(certs()).toHaveLength(0);
  });

  it("ignores an event for a reference this site never created", async () => {
    paystack.txs.set("NOT-OURS", { status: "success", amount: 1500, currency: "USD", reference: "NOT-OURS" });
    await hook(success("NOT-OURS"));
    expect(fakeDb().payments.find((p) => p.reference === "NOT-OURS")).toBeUndefined();
    expect(fakeDb().certificates).toHaveLength(1); // only the fixture's existing certificate
  });

  it("returns 400 for a signed body that is not JSON, without side effects", async () => {
    const raw = "not json";
    const res = await webhook(new Request("https://aspire.test/api/pay/webhook", { method: "POST", body: raw, headers: { "x-paystack-signature": sign(raw) } }));
    expect(res.status).toBe(400);
  });
});

describe("a verified payment is applied exactly once", () => {
  it("issues one certificate for a genuine payment", async () => {
    const ref = pendingCertificate();
    paystack.txs.set(ref, { status: "success", amount: 1500, currency: "USD", reference: ref });
    await hook(success(ref));
    expect(pay(ref).status).toBe("success");
    expect(certs()).toHaveLength(1);
    expect(certs()[0].payment_id).toBe(pay(ref).id);
  });

  it("survives duplicate and concurrent webhook deliveries plus the browser callback", async () => {
    const ref = pendingCertificate();
    paystack.txs.set(ref, { status: "success", amount: 1500, currency: "USD", reference: ref });
    await hook(success(ref));
    const firstPaidAt = pay(ref).paid_at;
    await Promise.all([
      ...Array.from({ length: 6 }, () => hook(success(ref))),
      callback(new Request(`https://aspire.test/api/pay/callback?reference=${ref}`)),
      callback(new Request(`https://aspire.test/api/pay/callback?trxref=${ref}`)),
    ]);
    expect(certs()).toHaveLength(1);
    expect(fakeDb().payments.filter((p) => p.reference === ref)).toHaveLength(1);
    expect(pay(ref).paid_at).toBe(firstPaidAt);
  });

  it("applies seats once, to the paying company only", async () => {
    const db = fakeDb();
    const rival = db.companies.find((c) => c.id === COMPANY.rival)!;
    const before = { seats: rival.seats, until: rival.paid_until };
    db.payments.push({ id: crypto.randomUUID(), reference: "SEATS-1", user_id: USERS.owner, company_id: COMPANY.hotel, purpose: "company_seats", seats: 40, amount: 400, currency: "USD", amount_usd: 400, status: "pending" });
    paystack.txs.set("SEATS-1", { status: "success", amount: 40000, currency: "USD", reference: "SEATS-1" });
    await Promise.all([hook(success("SEATS-1")), hook(success("SEATS-1")), hook(success("SEATS-1"))]);
    expect(db.companies.find((c) => c.id === COMPANY.hotel)!.seats).toBe(40);
    expect({ seats: rival.seats, until: rival.paid_until }).toEqual(before);
  });
});

describe("replayed payment events can't roll anything back", () => {
  it("an old seat payment replayed later does not overwrite seats bought since", async () => {
    const db = fakeDb();
    db.payments.push({ id: crypto.randomUUID(), reference: "SEATS-OLD", user_id: USERS.owner, company_id: COMPANY.hotel, purpose: "company_seats", seats: 5, amount: 50, currency: "USD", amount_usd: 50, status: "pending" });
    paystack.txs.set("SEATS-OLD", { status: "success", amount: 5000, currency: "USD", reference: "SEATS-OLD" });
    await hook(success("SEATS-OLD"));
    const hotel = db.companies.find((c) => c.id === COMPANY.hotel)!;
    expect(hotel.seats).toBe(5);
    hotel.seats = 60; hotel.paid_until = "2030-01-01"; // later purchase / admin change
    await hook(success("SEATS-OLD"));
    await callback(new Request("https://aspire.test/api/pay/callback?reference=SEATS-OLD"));
    expect(hotel).toMatchObject({ seats: 60, paid_until: "2030-01-01" });
  });
});

describe("simultaneous deliveries", () => {
  it("only one of several concurrent deliveries is allowed to apply the payment", async () => {
    const db = fakeDb();
    db.payments.push({ id: crypto.randomUUID(), reference: "SEATS-RACE", user_id: USERS.owner, company_id: COMPANY.hotel, purpose: "company_seats", seats: 8, amount: 80, currency: "USD", amount_usd: 80, status: "pending" });
    paystack.txs.set("SEATS-RACE", { status: "success", amount: 8000, currency: "USD", reference: "SEATS-RACE" });
    const i = db.companies.findIndex((c) => c.id === COMPANY.hotel);
    let writes = 0;
    db.companies[i] = new Proxy(db.companies[i], { set(t, k, v) { if (k === "paid_until") writes++; return Reflect.set(t, k, v); } });
    await Promise.all(Array.from({ length: 5 }, () => hook(success("SEATS-RACE"))));
    expect(writes).toBe(1);
  });
});

describe("the browser callback is not proof of payment", () => {
  it("does not issue a certificate when Paystack says the payment failed", async () => {
    const ref = pendingCertificate();
    paystack.txs.set(ref, { status: "failed", amount: 1500, currency: "USD", reference: ref });
    const res = await callback(new Request(`https://aspire.test/api/pay/callback?reference=${ref}`));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/learn/haccp-principles/certificate?error=");
    expect(certs()).toHaveLength(0);
  });

  it("does nothing for an invented reference", async () => {
    const res = await callback(new Request("https://aspire.test/api/pay/callback?reference=MADE-UP"));
    expect(res.headers.get("location")).toBe("https://aspire.test/dashboard");
    expect(fakeDb().payments).toHaveLength(0);
  });
});

describe("the client never decides the price", () => {
  it("charges the course price from the database, ignoring price fields sent by the browser", async () => {
    pendingCertificate("unused");
    fakeDb().payments.length = 0;
    signIn(USERS.learner);
    const to = await redirectOf(() => claimCertificate(form({ slug: "haccp-principles", method: "card", full_name: "Jane Wanjiku Kamau", id_number: "32456789", confirm: "on", amount: "1", price: "0", certificate_price_usd: "0", currency: "KES" })));
    expect(to).toMatch(/^https:\/\/checkout\.paystack\.com\//);
    expect(paystack.initialized[0]).toMatchObject({ amount: 1500, currency: "USD", channels: ["card"] });
    expect(fakeDb().payments[0]).toMatchObject({ amount: 15, currency: "USD", status: "pending", user_id: USERS.learner });
    expect(certs()).toHaveLength(0); // nothing is issued until Paystack confirms
  });

  it("quotes M-Pesa in KES on the server", async () => {
    pendingCertificate("unused"); fakeDb().payments.length = 0;
    signIn(USERS.learner);
    await redirectOf(() => claimCertificate(form({ slug: "haccp-principles", method: "mpesa", full_name: "Jane Wanjiku Kamau", id_number: "32456789", confirm: "on", amount: "1" })));
    expect(paystack.initialized[0]).toMatchObject({ amount: 195000, currency: "KES", channels: ["mobile_money"] }); // ceil(15 × 130) KES
  });

  it("refuses to start a payment for someone who has not passed", async () => {
    fakeDb().courses.find((c) => c.id === HACCP)!.certificate_price_usd = 15;
    signIn(USERS.learner);
    const to = await redirectOf(() => claimCertificate(form({ slug: "haccp-principles", method: "card", full_name: "Jane Wanjiku Kamau", id_number: "32456789", confirm: "on" })));
    expect(to).toContain("error=");
    expect(paystack.initialized).toHaveLength(0);
  });

  it("computes seat totals on the server and only lets the owner buy", async () => {
    fakeDb().settings.find((s) => s.key === "seat_price_usd")!.value = 10;
    signIn(USERS.member);
    expect(await redirectOf(() => buySeats(form({ seats: "50", method: "card" })))).toContain("Only%20the%20company%20owner");
    expect(paystack.initialized).toHaveLength(0);
    signIn(USERS.owner);
    await redirectOf(() => buySeats(form({ seats: "5", method: "card", price: "0", amount: "1" })));
    expect(paystack.initialized[0]).toMatchObject({ amount: 5000, currency: "USD" });
  });
});
