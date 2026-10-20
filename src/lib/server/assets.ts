import { requestScope, workerEnv } from "./request";

/** Reads a file shipped in /public (e.g. certificate fonts and images) through the Worker's static-assets binding. */
export async function assetBytes(path: string): Promise<Uint8Array> {
  // Same host as the visitor's request: the local dev server refuses unknown host names.
  const res = await workerEnv().ASSETS.fetch(new Request(new URL(path, requestScope()?.request.url ?? "http://localhost")));
  if (!res.ok) throw new Error(`Asset ${path} not found (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}
