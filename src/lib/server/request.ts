import { AsyncLocalStorage } from "node:async_hooks";
import { parseCookieHeader, serializeCookieHeader, type CookieOptions } from "@supabase/ssr";

/** What the Worker knows about the request being handled: read by Supabase (cookies), rate limits (IP) and the PDF route (assets). */
type RequestScope = {
  request: Request;
  /** Set-Cookie headers to add to the response (e.g. a refreshed sign-in). */
  setCookies: string[];
  /** Cookie values changed during this request, so later reads see them. */
  changed: Map<string, string>;
  nonce: string;
  env: Env;
};

const scope = new AsyncLocalStorage<RequestScope>();

export function withRequest<T>(request: Request, env: Env, nonce: string, run: () => Promise<T>) {
  return scope.run({ request, env, nonce, setCookies: [], changed: new Map() }, run);
}

function current() {
  const s = scope.getStore();
  if (!s) throw new Error("No request in scope (server code was called outside a request).");
  return s;
}

export const requestScope = () => scope.getStore();

/** The incoming request's headers. */
export async function headers(): Promise<Headers> {
  return current().request.headers;
}

/** Request cookies, with changes made during this request written back to the response. */
export async function cookies() {
  const s = current();
  return {
    getAll(): { name: string; value: string }[] {
      const base = parseCookieHeader(s.request.headers.get("cookie") ?? "").map(({ name, value }) => ({ name, value: value ?? "" }));
      const merged = new Map(base.map((c) => [c.name, c.value]));
      for (const [k, v] of s.changed) if (v === "") merged.delete(k); else merged.set(k, v);
      return [...merged].map(([name, value]) => ({ name, value }));
    },
    get(name: string) { return this.getAll().find((c) => c.name === name); },
    set(name: string, value: string, options?: CookieOptions) {
      s.changed.set(name, options?.maxAge === 0 ? "" : value);
      s.setCookies.push(serializeCookieHeader(name, value, { path: "/", sameSite: "lax", ...options }));
    },
  };
}

export function pendingCookies() { return scope.getStore()?.setCookies ?? []; }
export function cspNonce() { return scope.getStore()?.nonce ?? ""; }
export function workerEnv() { return current().env; }
