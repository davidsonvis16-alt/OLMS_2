import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured } from "@/lib/config";

const GATED = ["/dashboard", "/learn", "/certificates", "/account", "/company", "/admin"];

/** A per-request Content-Security-Policy. Next.js reads the nonce from the request header and applies it to its own scripts. */
function csp(nonce: string) {
  let sb = "", ws = "";
  try { const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""); sb = u.origin; ws = `${u.protocol === "https:" ? "wss" : "ws"}://${u.host}`; } catch { /* not configured */ }
  const dev = process.env.NODE_ENV !== "production";
  const https = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${sb ? ` ${sb}` : ""}`,
    "font-src 'self'",
    `connect-src 'self'${sb ? ` ${sb} ${ws}` : ""}`,
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://iframe.mediadelivery.net",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "form-action 'self' https://checkout.paystack.com",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function secure(res: NextResponse, policy: string) {
  res.headers.set("Content-Security-Policy", policy);
  if ((process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://")) res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  return res;
}

export async function middleware(request: NextRequest) {
  const p = request.nextUrl.pathname;
  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);

  // Fail closed: without a database there is no way to check who anyone is.
  if (!supabaseConfigured()) {
    const body = p.startsWith("/api/")
      ? JSON.stringify({ error: "Service not configured" })
      : "<!doctype html><meta charset=utf-8><title>Not configured</title><body style=\"font:16px/1.5 system-ui;padding:48px;max-width:640px\"><h1>Aspire is not configured yet</h1><p>Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (see .env.example), then restart.</p>";
    return secure(new NextResponse(body, { status: 503, headers: { "Content-Type": p.startsWith("/api/") ? "application/json" : "text/html; charset=utf-8", "Cache-Control": "no-store" } }), policy);
  }

  // Email links land on the Site URL (e.g. "/?code=…") when the exact callback address isn't in Supabase's
  // redirect list. Hand the one-time code to the callback, which exchanges it securely and signs the person in.
  const code = request.nextUrl.searchParams.get("code");
  if (code && p !== "/auth/callback" && /^[A-Za-z0-9-]{20,128}$/.test(code)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.search = `?code=${encodeURIComponent(code)}&next=${encodeURIComponent(p === "/" ? "/dashboard" : p)}`;
    return secure(NextResponse.redirect(url), policy);
  }

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  let response = NextResponse.next({ request: { headers } });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        // Rebuild the response so refreshed session cookies reach both the page render and the browser.
        const h = new Headers(request.headers); h.set("x-nonce", nonce); h.set("Content-Security-Policy", policy);
        response = NextResponse.next({ request: { headers: h } });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getUser() checks the token with Supabase Auth (not just the cookie), and refreshes it when needed.
  const { data: { user } } = await sb.auth.getUser();
  if (GATED.some((x) => p === x || p.startsWith(x + "/")) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(p + request.nextUrl.search)}`;
    return secure(NextResponse.redirect(url), policy);
  }
  return secure(response, policy);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|photos/|pdf.worker|api/pay/webhook|.*\\.(?:png|jpg|jpeg|svg|webp|ico|mjs)$).*)"],
};
