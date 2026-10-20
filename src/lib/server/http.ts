import { redirect as rrRedirect } from "react-router";

/** Stops the current loader or action and sends the browser to `url` (303, so a form POST becomes a GET). */
export function redirect(url: string): never {
  throw rrRedirect(url, 303);
}

/** Stops the current loader or action with a 404 page. */
export function notFound(): never {
  throw new Response("Not found", { status: 404 });
}

/** JSON response for API routes (never cached). */
export function json(body: unknown, init?: number | ResponseInit) {
  const i = typeof init === "number" ? { status: init } : init ?? {};
  const h = new Headers(i.headers);
  if (!h.has("Cache-Control")) h.set("Cache-Control", "no-store");
  return Response.json(body, { ...i, headers: h });
}

/** Redirect response for API routes (303: the browser follows with a GET). */
export function seeOther(url: string | URL) {
  return new Response(null, { status: 303, headers: { Location: url.toString(), "Cache-Control": "no-store" } });
}
