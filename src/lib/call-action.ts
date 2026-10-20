/**
 * Calls a form action (POST /do/<name>) from the page and returns its JSON answer. If the server sends the browser
 * somewhere else instead (e.g. to sign in again), the whole page goes there.
 */
export async function callAction<T>(name: string, fields: Record<string, string | number | Blob> | FormData): Promise<T> {
  const body = fields instanceof FormData ? fields : new FormData();
  if (!(fields instanceof FormData)) for (const [k, v] of Object.entries(fields)) body.set(k, v instanceof Blob ? v : String(v));
  const res = await fetch(`/do/${name}`, { method: "POST", body, headers: { Accept: "application/json" } });
  if (res.redirected || !(res.headers.get("content-type") ?? "").includes("application/json")) {
    window.location.assign(res.url);
    return new Promise<T>(() => {}); // the page is leaving
  }
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}
