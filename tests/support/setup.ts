/**
 * Runs the real route handlers, loaders and form actions in-process. Only four things are replaced: the Supabase
 * client (by an in-memory double), the request's cookies/headers, files read from /public, and Paystack's HTTP API.
 */
import fs from "node:fs";
import path from "node:path";
import { vi, beforeEach } from "vitest";
import { bans, fakeClient, resetFakeDb, resetRateLimits, sessions } from "./fake-supabase";

process.env.PAYSTACK_SECRET_KEY = "sk_test_security_suite";
process.env.USD_TO_KES = "130";
process.env.NEXT_PUBLIC_SITE_URL = "https://aspire.test";

export const ctx = { uid: null as string | null, ip: "203.0.113.7" };

vi.mock("@/lib/supabase", () => ({
  supabaseServer: async () => fakeClient(ctx.uid),
  supabaseAdmin: () => fakeClient(null),
  slideUrl: (c: string, v: number, p: number) => `https://storage.test/slides/${c}/v${v}/${p}.webp`,
}));
vi.mock("@/lib/server/request", async (actual) => ({
  ...(await actual<typeof import("@/lib/server/request")>()),
  headers: async () => new Headers({ "x-forwarded-for": ctx.ip }),
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}));
// On Cloudflare these come through the static-assets binding; here, straight from /public.
vi.mock("@/lib/server/assets", () => ({
  assetBytes: async (p: string) => new Uint8Array(fs.readFileSync(path.join(process.cwd(), "public", p))),
}));

/** Sign in as a user with a valid session (or null for anonymous). */
export function signIn(uid: string | null) { ctx.uid = uid; if (uid) sessions.add(uid); }
/** A session cookie whose token Supabase no longer accepts (expired, revoked or forged). */
export function staleSession(uid: string) { ctx.uid = uid; sessions.delete(uid); }

// ---- Paystack's API, as seen by lib/paystack.ts ----
export type Tx = { status: string; amount: number; currency: string; reference: string; channel?: string; paid_at?: string };
export const paystack = { txs: new Map<string, Tx>(), calls: [] as string[], initialized: [] as Record<string, unknown>[] };
vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
  const url = String(input);
  paystack.calls.push(url);
  if (url.startsWith("https://api.paystack.co/transaction/verify/")) {
    const ref = decodeURIComponent(url.split("/").pop()!);
    const tx = paystack.txs.get(ref);
    if (!tx) return Response.json({ status: false, message: "Transaction reference not found" }, { status: 400 });
    return Response.json({ status: true, data: { channel: "card", paid_at: new Date().toISOString(), ...tx } });
  }
  if (url === "https://api.paystack.co/transaction/initialize") {
    const body = JSON.parse(String(init?.body));
    paystack.initialized.push(body);
    return Response.json({ status: true, data: { authorization_url: `https://checkout.paystack.com/${body.reference}`, reference: body.reference } });
  }
  throw new Error(`Unexpected network call in tests: ${url}`);
});

beforeEach(() => {
  resetFakeDb(); resetRateLimits(); sessions.clear(); bans.clear();
  ctx.uid = null; ctx.ip = "203.0.113.7";
  paystack.txs.clear(); paystack.calls.length = 0; paystack.initialized.length = 0;
});

/** Runs a server action and returns where Next would redirect, or null if it didn't. */
export async function redirectOf(fn: () => unknown): Promise<string | null> {
  try { await fn(); return null; }
  catch (e) {
    // Loaders and actions stop with a thrown Response: a redirect (where to) or e.g. a 404.
    if (e instanceof Response) return e.status >= 300 && e.status < 400 ? e.headers.get("Location") : `status ${e.status}`;
    throw e;
  }
}
export const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

/** Calls a route's loader or action the way React Router does. */
export const asRoute = (fn: (args: never) => unknown, params: Record<string, string> = {}) =>
  (request: Request) => fn({ request, params, context: {} } as never) as Promise<Response>;
