import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ctx, signIn } from "../support/setup";
import { USERS } from "../support/fake-supabase";
import { safeNext } from "@/lib/safe-next";
import { safeVideoUrl } from "@/lib/video";
import { loader as authCallbackLoader } from "@/app/auth/callback/route";
import { asRoute } from "../support/setup";
const authCallback = asRoute(authCallbackLoader);

vi.mock("@supabase/ssr", async (actual) => ({
  ...(await actual<typeof import("@supabase/ssr")>()),
  createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: ctx.uid ? { id: ctx.uid } : null } }) } }),
}));
// The page renderer itself isn't under test here: whatever reaches it answers "handled".
vi.mock("react-router", async (actual) => ({
  ...(await actual<typeof import("react-router")>()),
  createRequestHandler: () => async () => new Response("handled"),
}));
const SUPABASE = { NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service" };
const worker = async () => (await import("../../workers/app")).default;
const visit = async (url: string, init?: RequestInit) => (await worker()).fetch(new Request(url, init) as never, {} as Env);

describe("open redirects are closed", () => {
  it.each(["//evil.com", "/\\evil.com", "/\\/evil.com", "\\\\evil.com", "https://evil.com", "javascript:alert(1)", "/\r\nSet-Cookie:x=1", "/\tevil", "", undefined, 42])("%s → fallback", (raw) => {
    expect(safeNext(raw)).toBe("/dashboard");
  });
  it("encoded line breaks stay encoded and on this site (no header injection)", () => {
    const out = safeNext("/%0d%0aSet-Cookie:x=1");
    expect(out).not.toMatch(/[\r\n]/);
    expect(new URL(out, "https://aspire.test").origin).toBe("https://aspire.test");
  });
  it("keeps genuine same-site paths", () => {
    expect(safeNext("/learn/haccp-principles?x=1#m2")).toBe("/learn/haccp-principles?x=1#m2");
    expect(safeNext("/join/ABC")).toBe("/join/ABC");
  });
  it("the email-link callback only ever redirects on this site", async () => {
    for (const next of ["/\\evil.com", "//evil.com", "https://evil.com"]) {
      const res = await authCallback(new Request(`https://aspire.test/auth/callback?code=valid-code&next=${encodeURIComponent(next)}`));
      expect(new URL(res.headers.get("location")!).origin).toBe("https://aspire.test");
    }
    const bad = await authCallback(new Request("https://aspire.test/auth/callback?code=forged&next=/admin"));
    expect(bad.headers.get("location")).toBe("https://aspire.test/login?error=link");
  });
});

describe("only allow-listed https video players can be embedded", () => {
  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "http://www.youtube.com/embed/x", "https://evil.com/embed", "https://www.youtube.com.evil.com/x", "https://user:pw@www.youtube.com/embed/x"])("%s → rejected", (u) => {
    expect(safeVideoUrl(u)).toBeNull();
  });
  it("accepts real embeds", () => {
    expect(safeVideoUrl("https://www.youtube-nocookie.com/embed/abc")).toBe("https://www.youtube-nocookie.com/embed/abc");
    expect(safeVideoUrl("https://iframe.mediadelivery.net/embed/1/2")).toBeTruthy();
  });
});

describe("the Cloudflare Worker in front of every request", () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; vi.resetModules(); });

  it("fails closed with 503 when Supabase isn't configured (no silent demo mode)", async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
    for (const p of ["/", "/admin", "/api/learn", "/login"]) expect((await visit(`https://aspire.test${p}`)).status).toBe(503);
  });

  it("sets a fresh nonce-based CSP and the other security headers on every response", async () => {
    Object.assign(process.env, SUPABASE);
    const res = await visit("https://aspire.test/dashboard");
    expect(await res.text()).toBe("handled");
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const again = (await visit("https://aspire.test/dashboard")).headers.get("content-security-policy");
    expect(again).not.toBe(csp); // a fresh nonce per request
  });

  it("refuses form posts and API calls from other sites (CSRF); only the signed payment webhook is exempt", async () => {
    Object.assign(process.env, SUPABASE);
    const post = (path: string, origin?: string) => visit(`https://aspire.test${path}`, { method: "POST", headers: origin ? { origin } : {} });
    for (const p of ["/do/saveCourse", "/do/deleteUser", "/api/learn", "/api/admin/slides"]) {
      expect((await post(p, "https://evil.example")).status).toBe(403);
      expect((await post(p)).status).toBe(403); // no Origin at all
      expect(await (await post(p, "https://aspire.test")).text()).toBe("handled");
    }
    expect(await (await post("/api/pay/webhook", "https://api.paystack.co")).text()).toBe("handled");
  });

  it("sends signed-out visitors away from private pages (and lets them through when signed in)", async () => {
    Object.assign(process.env, SUPABASE);
    const { middleware } = await import("@/root");
    const gate = async (path: string) => {
      try { await middleware[0]({ request: new Request(`https://aspire.test${path}`), params: {}, context: {} } as never, (async () => new Response("ok")) as never); return null; }
      catch (e) { return e instanceof Response ? e.headers.get("location") : String(e); }
    };
    signIn(null);
    expect(await gate("/admin/payments")).toBe("/login?next=%2Fadmin%2Fpayments");
    expect(await gate("/admin/payments.data")).toBe("/login?next=%2Fadmin%2Fpayments"); // page data requests too
    expect(await gate("/learn/haccp-principles/exam")).toBe("/login?next=%2Flearn%2Fhaccp-principles%2Fexam");
    expect(await gate("/courses")).toBeNull();
    signIn(USERS.learner);
    expect(await gate("/dashboard")).toBeNull();
  });
});

describe("the form-action route (/do/<name>)", () => {
  it("only runs actions on its list; anything else is 404", async () => {
    const { action } = await import("@/app/do.$name");
    const call = (name: string) => action({ request: new Request(`https://aspire.test/do/${name}`, { method: "POST", body: new FormData() }), params: { name }, context: {} } as never);
    for (const name of ["constructor", "__proto__", "toString", "hasOwnProperty", "applyPayment", "issueCertificate", "seatPrice", "grantAdmin"]) {
      const res = await call(name);
      expect((res as Response).status, name).toBe(404);
    }
  });

  it("signed-out posts end at sign-in, never in the action's work", async () => {
    signIn(null);
    const { action } = await import("@/app/do.$name");
    for (const name of ["saveCourse", "deleteUser", "updateProfile", "claimCertificate"]) {
      const f = new FormData(); f.set("id", USERS.learner); f.set("confirm", "DELETE"); f.set("slug", "haccp-principles");
      try { await action({ request: new Request(`https://aspire.test/do/${name}`, { method: "POST", body: f }), params: { name }, context: {} } as never); throw new Error(`${name} ran`); }
      catch (e) { expect(e instanceof Response && e.headers.get("location"), name).toMatch(/^\/login/); }
    }
  });
});

describe("static checks on the code and database policies", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
  const files = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? files(path.join(d, e.name)) : [path.join(d, e.name)]);
  const src = files("src").filter((f) => /\.(ts|tsx)$/.test(f));

  it("users have no direct write access to any table (all writes go through the server)", () => {
    const sql = read("supabase/schema.sql").replace(/--.*$/gm, "");
    const writes = [...sql.matchAll(/create policy[^;]*?on (\S+) for (insert|update|delete|all)[^;]*;/gi)].map((m) => m[1]);
    expect(writes.every((t) => t === "storage.objects")).toBe(true);
    expect(sql).toMatch(/drop policy if exists "update own profile"/);
  });

  it("only admins may read the question bank (answer keys)", () => {
    expect(read("supabase/schema.sql")).toMatch(/create policy "admin questions" on public\.questions for select using \(public\.is_admin\(\)\);/);
  });

  it("the rate-limit function can't be called by browsers", () => {
    expect(read("supabase/schema.sql")).toMatch(/revoke all on function public\.hit_rate_limit\(text, int, int\) from public, anon, authenticated;/);
  });

  it("no browser code can reach the service-role key, payment secret or other server-only code", () => {
    // Everything a component imports ends up in the browser. Follow the imports from every component.
    const SERVER = /^src\/(lib\/(supabase|auth|paystack|certs|grading|learning|rate-limit|identity|test-lock|cert-fonts|certificate-model|config)\.ts|lib\/server\/|app\/.*actions\.ts|app\/cert-preview\.ts|app\/api\/)/;
    const resolve = (from: string, spec: string) => {
      const base = spec.startsWith("@/") ? path.join("src", spec.slice(2)) : spec.startsWith(".") ? path.join(path.dirname(from), spec) : null;
      if (!base) return null;
      for (const ext of ["", ".ts", ".tsx", "/index.ts"]) if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) return path.normalize(base + ext);
      return null;
    };
    const seen = new Set<string>(); const stack = files("src/components").filter((f) => /\.tsx?$/.test(f));
    expect(stack.length).toBeGreaterThan(20);
    while (stack.length) {
      const f = stack.pop()!; if (seen.has(f)) continue; seen.add(f);
      const code = read(f).replace(/^import type .*$/gm, "");
      expect(code, f).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|PAYSTACK_SECRET_KEY/);
      for (const m of code.matchAll(/from "([^"]+)"/g)) { const r = resolve(f, m[1]); if (r) stack.push(r); }
    }
    const leaked = [...seen].filter((f) => SERVER.test(f.split(path.sep).join("/")));
    expect(leaked).toEqual([]);
    const publicVars = new Set(src.flatMap((f) => [...read(f).matchAll(/process\.env\.(NEXT_PUBLIC_\w+)/g)].map((m) => m[1])));
    expect([...publicVars].sort()).toEqual(["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_URL"]);
  });

  it("no demo or impersonation endpoints remain", () => {
    for (const f of src) expect(read(f), f).not.toMatch(/demo_uid|api\/demo|DemoPicker|DEMO_USERS/);
  });

  it("the seed script promotes admins by confirmed sign-in account, not by the editable profile email", () => {
    const seed = read("scripts/seed.mjs");
    expect(seed).toContain("auth.admin.listUsers");
    expect(seed).toContain("email_confirmed_at");
    expect(seed).not.toMatch(/\.ilike\("email"/);
  });
});

describe("email links that fall back to the site address", () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; vi.resetModules(); });
  it("hand the one-time code to the callback, and nothing else", async () => {
    Object.assign(process.env, SUPABASE);
    const code = "5f0c9a3e-1b2c-4d5e-8f90-1234567890ab";
    const res = await visit(`https://aspire.test/?code=${code}`);
    expect(res.headers.get("location")).toBe(`https://aspire.test/auth/callback?code=${code}&next=%2Fdashboard`);
    const junk = await visit("https://aspire.test/?code=<script>");
    expect(junk.headers.get("location")).toBeNull();
  });
});

describe("email confirmation and reset links (/auth/confirm)", () => {
  it("signs in with a valid one-time token and stays on this site", async () => {
    const GET = asRoute((await import("@/app/auth/confirm/route")).loader);
    const go = async (q: string) => (await GET(new Request(`https://aspire.test/auth/confirm?${q}`))).headers.get("location");
    expect(await go("token_hash=valid-token&type=email")).toBe("https://aspire.test/dashboard");
    expect(await go("token_hash=valid-token&type=recovery")).toBe("https://aspire.test/reset");
    expect(await go("token_hash=valid-token&type=email&next=%2F%5Cevil.com")).toBe("https://aspire.test/dashboard");
    expect(await go("token_hash=forged&type=email")).toBe("https://aspire.test/login?error=link");
    expect(await go("token_hash=valid-token&type=admin")).toBe("https://aspire.test/login?error=link");
    expect(await go("type=email")).toBe("https://aspire.test/login?error=link");
  });
});
