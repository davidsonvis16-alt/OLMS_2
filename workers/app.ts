import { createRequestHandler } from "react-router";
import { withRequest, pendingCookies } from "../src/lib/server/request";
import { secureHeaders } from "../src/lib/server/security";
import { supabaseConfigured } from "../src/lib/config";

const handle = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);

/** Only the payment provider may post to the site from elsewhere (it signs its messages; see the webhook route). */
const CROSS_SITE_POSTS = new Set(["/api/pay/webhook"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const nonce = btoa(crypto.randomUUID());
    const finish = (res: Response) => {
      const out = new Response(res.body, res); // headers of fetched/redirect responses can be immutable
      secureHeaders(out.headers, nonce);
      for (const c of pendingCookies()) out.headers.append("Set-Cookie", c);
      return out;
    };

    return withRequest(request, env, nonce, async () => {
      // Fail closed: without a database there is no way to check who anyone is.
      if (!supabaseConfigured()) {
        const api = url.pathname.startsWith("/api/");
        return finish(new Response(api ? JSON.stringify({ error: "Service not configured" })
          : "<!doctype html><meta charset=utf-8><title>Not configured</title><body style=\"font:16px/1.5 system-ui;padding:48px;max-width:640px\"><h1>Aspire is not configured yet</h1><p>Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (see .env.example), then restart.</p>",
          { status: 503, headers: { "Content-Type": api ? "application/json" : "text/html; charset=utf-8", "Cache-Control": "no-store" } }));
      }

      // Forms and API calls must come from this site (cross-site request forgery protection).
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !CROSS_SITE_POSTS.has(url.pathname)) {
        const origin = request.headers.get("origin");
        if (origin !== url.origin) return finish(new Response("Forbidden", { status: 403 }));
      }

      // Email links land on the Site URL (e.g. "/?code=…") when the exact callback address isn't in Supabase's
      // redirect list. Hand the one-time code to the callback, which exchanges it securely and signs the person in.
      const code = url.searchParams.get("code");
      if (request.method === "GET" && code && url.pathname !== "/auth/callback" && /^[A-Za-z0-9-]{20,128}$/.test(code)) {
        const to = new URL("/auth/callback", url);
        to.search = `?code=${encodeURIComponent(code)}&next=${encodeURIComponent(url.pathname === "/" ? "/dashboard" : url.pathname)}`;
        return finish(Response.redirect(to.toString(), 307));
      }

      return finish(await handle(request));
    });
  },
} satisfies ExportedHandler<Env>;
