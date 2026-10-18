/**
 * Turns a user-supplied "next" value into a same-site path, or the fallback.
 * Blocks //host, /\host, encoded tricks and anything that resolves to another origin. Safe in browser and server.
 */
export function safeNext(raw: unknown, fallback = "/dashboard"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const base = "https://aspire.invalid";
    const u = new URL(raw, base);
    if (u.origin !== base) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
