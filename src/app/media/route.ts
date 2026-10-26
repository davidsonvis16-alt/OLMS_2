import type { LoaderFunctionArgs } from "react-router";
import { getSession } from "@/lib/auth";
import { videoBucket } from "@/lib/server/videos";
import { VIDEO_KEY } from "@/lib/video-key";

/** Plays an uploaded lesson video to signed-in learners, with seeking (HTTP range requests). */
async function get(req: Request, key: string) {
  if (!VIDEO_KEY.test(key)) return new Response("Not found", { status: 404 });
  const { user } = await getSession();
  if (!user) return new Response("Sign in to watch", { status: 401 });
  const bucket = videoBucket();
  if (!bucket) return new Response("Not found", { status: 404 });

  const obj = await bucket.get(key, { range: req.headers });
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("ETag", obj.httpEtag);
  h.set("Accept-Ranges", "bytes");
  h.set("Cache-Control", "private, max-age=3600");
  const r = (obj as R2ObjectBody & { range?: { offset?: number; length?: number; suffix?: number } }).range;
  if (req.headers.has("range") && r) {
    const start = r.suffix != null ? obj.size - r.suffix : r.offset ?? 0;
    const len = r.suffix != null ? r.suffix : r.length ?? obj.size - start;
    h.set("Content-Range", `bytes ${start}-${start + len - 1}/${obj.size}`);
    h.set("Content-Length", String(len));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set("Content-Length", String(obj.size));
  return new Response(obj.body, { headers: h });
}

export const loader = ({ request, params }: LoaderFunctionArgs) => get(request, params["*"] ?? "");
