import { supabaseAdmin } from "./supabase";

/**
 * Fixed-window rate limit shared by every server instance (a counter in Postgres, see hit_rate_limit in schema.sql).
 * Returns true when the request may go ahead. If the counter itself is unavailable the request is allowed and the
 * failure is logged, so a missing migration can't lock learners out of exams.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("hit_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error(`[rate-limit] unavailable (${error.message}); allowing ${key.split(":")[0]}`);
    return true;
  }
  return data === true;
}

export const LIMITS = {
  progress: [900, 3600],
  quiz: [120, 3600],
  exam: [20, 3600],
  join: [10, 3600],
  payment: [15, 3600],
  pdf: [60, 3600],
  verify: [60, 60],
} as const satisfies Record<string, readonly [number, number]>;

export function limit(kind: keyof typeof LIMITS, who: string) {
  const [max, win] = LIMITS[kind];
  return rateLimit(`${kind}:${who}`, max, win);
}

/** The client address as seen by the hosting proxy (Vercel sets x-forwarded-for). */
export function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}
