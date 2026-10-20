/**
 * A per-request Content-Security-Policy. The Worker makes a fresh nonce for each request and entry.server.tsx puts it on
 * React Router's scripts, so only the site's own scripts run.
 */
export function csp(nonce: string) {
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
    `connect-src 'self'${sb ? ` ${sb} ${ws}` : ""}${dev ? " ws: wss:" : ""}`, // dev: hot reload
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://iframe.mediadelivery.net",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "form-action 'self' https://checkout.paystack.com",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}


/** Security headers for every response the Worker builds. */
export function secureHeaders(h: Headers, nonce: string) {
  h.set("Content-Security-Policy", csp(nonce));
  if ((process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://")) h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("X-Frame-Options", "SAMEORIGIN");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

/** Pages that need a signed-in user (checked again by each page and action). */
export const GATED = ["/dashboard", "/learn", "/certificates", "/account", "/company", "/admin"];
export const isGated = (path: string) => GATED.some((x) => path === x || path.startsWith(x + "/"));
