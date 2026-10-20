import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ctx, signIn } from "../support/setup";
import { USERS } from "../support/fake-supabase";
import { safeNext } from "@/lib/safe-next";
import { safeVideoUrl } from "@/lib/video";
import { GET as authCallback } from "@/app/auth/callback/route";

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: ctx.uid ? { id: ctx.uid } : null } }) } }),
}));

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
      const res = await authCallback(new NextRequest(`https://aspire.test/auth/callback?code=valid-code&next=${encodeURIComponent(next)}`));
      expect(new URL(res.headers.get("location")!).origin).toBe("https://aspire.test");
    }
    const bad = await authCallback(new NextRequest("https://aspire.test/auth/callback?code=forged&next=/admin"));
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

describe("middleware", () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; vi.resetModules(); });
  const run = async (p: string) => { const { middleware } = await import("@/middleware"); return middleware(new NextRequest(`https://aspire.test${p}`)); };

  it("fails closed with 503 when Supabase isn't configured (no silent demo mode)", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    for (const p of ["/", "/admin", "/api/learn", "/login"]) expect((await run(p)).status).toBe(503);
  });

  it("sends signed-out visitors to sign in, and sets a nonce-based CSP", async () => {
    Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service" });
    signIn(null);
    const res = await run("/admin/payments");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://aspire.test/login?next=%2Fadmin%2Fpayments");
    signIn(USERS.learner);
    const ok = await run("/dashboard");
    const csp = ok.headers.get("content-security-policy")!;
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    const again = (await run("/dashboard")).headers.get("content-security-policy")!;
    expect(again).not.toBe(csp); // a fresh nonce per request
  });

  it("lets a signed-out form save reach the action's own check (which sends them to sign in) instead of crashing the page", async () => {
    Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service" });
    signIn(null);
    const { middleware } = await import("@/middleware");
    const action = await middleware(new NextRequest("https://aspire.test/admin/courses/x", { method: "POST", headers: { "next-action": "abc" } }));
    expect(action.status).toBe(200);
    expect(action.headers.get("location")).toBeNull();
    // Only real action posts are let through; a plain POST or page view is still redirected.
    expect((await middleware(new NextRequest("https://aspire.test/admin/courses/x", { method: "POST" }))).status).toBe(307);
    expect((await middleware(new NextRequest("https://aspire.test/admin/courses/x", { headers: { "next-action": "abc" } }))).status).toBe(307);
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

  it("no browser code can reach the service-role key or payment secret", () => {
    const client = src.filter((f) => /^["']use client["']/.test(read(f)));
    expect(client.length).toBeGreaterThan(5);
    for (const f of client) {
      const s = read(f).replace(/^import type .*$/gm, "");
      expect(s, f).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|PAYSTACK_SECRET_KEY|@\/lib\/supabase"|@\/lib\/paystack|@\/lib\/certs|@\/lib\/grading"/);
    }
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
    Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service" });
    const { middleware } = await import("@/middleware");
    const code = "5f0c9a3e-1b2c-4d5e-8f90-1234567890ab";
    const res = await middleware(new NextRequest(`https://aspire.test/?code=${code}`));
    expect(res.headers.get("location")).toBe(`https://aspire.test/auth/callback?code=${code}&next=%2Fdashboard`);
    const junk = await middleware(new NextRequest("https://aspire.test/?code=<script>"));
    expect(junk.headers.get("location")).toBeNull();
  });
});

describe("email confirmation and reset links (/auth/confirm)", () => {
  it("signs in with a valid one-time token and stays on this site", async () => {
    const { GET } = await import("@/app/auth/confirm/route");
    const go = async (q: string) => (await GET(new NextRequest(`https://aspire.test/auth/confirm?${q}`))).headers.get("location");
    expect(await go("token_hash=valid-token&type=email")).toBe("https://aspire.test/dashboard");
    expect(await go("token_hash=valid-token&type=recovery")).toBe("https://aspire.test/reset");
    expect(await go("token_hash=valid-token&type=email&next=%2F%5Cevil.com")).toBe("https://aspire.test/dashboard");
    expect(await go("token_hash=forged&type=email")).toBe("https://aspire.test/login?error=link");
    expect(await go("token_hash=valid-token&type=admin")).toBe("https://aspire.test/login?error=link");
    expect(await go("type=email")).toBe("https://aspire.test/login?error=link");
  });
});
