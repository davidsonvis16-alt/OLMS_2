import type { ActionFunctionArgs } from "react-router";
import { json } from "@/lib/server/http";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { videoBucket } from "@/lib/server/videos";
import { VIDEO_KEY, VIDEO_TYPES, keyFromMedia } from "@/lib/video-key";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_VIDEO = 2 * 1024 ** 3; // 2 GB
const MAX_PART = 50 * 1024 * 1024; // each piece the browser sends; R2 needs at least 5 MB except the last
const UPLOAD_ID = /^[A-Za-z0-9._~+/=-]{8,1024}$/;

/**
 * Admins upload a lesson video from their computer in pieces (Workers accept at most 100 MB per request):
 *   ?op=start  {module, size, type}            → {key, uploadId}
 *   ?op=part   &key&uploadId&n  body = bytes   → {partNumber, etag}
 *   ?op=done   {module, key, uploadId, parts}  → saves /media/<key> as the lesson's video
 *   ?op=abort  {key, uploadId}
 */
async function post(req: Request) {
  const { user, profile } = await getSession();
  if (!user) return json({ error: "Not signed in" }, { status: 401 });
  if (profile?.role !== "admin") return json({ error: "Admins only" }, { status: 403 });
  const bucket = videoBucket();
  if (!bucket) return json({ error: "Video storage isn't switched on yet (Cloudflare R2)." }, { status: 503 });

  const url = new URL(req.url);
  const op = url.searchParams.get("op");
  const db = supabaseAdmin();
  const moduleOf = async (id: unknown) => {
    if (typeof id !== "string" || !UUID.test(id)) return null;
    const { data } = await db.from("modules").select("id,video_url").eq("id", id).maybeSingle();
    return data as { id: string; video_url: string | null } | null;
  };
  const keyOk = (key: unknown, moduleId?: string): key is string =>
    typeof key === "string" && VIDEO_KEY.test(key) && (!moduleId || key.startsWith(`videos/${moduleId}/`));

  if (op === "part") {
    const key = url.searchParams.get("key"), uploadId = url.searchParams.get("uploadId") ?? "", n = Number(url.searchParams.get("n"));
    if (!keyOk(key) || !UPLOAD_ID.test(uploadId) || !Number.isInteger(n) || n < 1 || n > 10000) return json({ error: "Bad upload details" }, { status: 400 });
    if (Number(req.headers.get("content-length") ?? 0) > MAX_PART) return json({ error: "Piece too large" }, { status: 413 });
    const bytes = await req.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_PART) return json({ error: "Bad piece" }, { status: 400 });
    const part = await bucket.resumeMultipartUpload(key, uploadId).uploadPart(n, bytes);
    return json({ partNumber: part.partNumber, etag: part.etag });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: "Bad request" }, { status: 400 });

  if (op === "start") {
    const m = await moduleOf(body.module);
    if (!m) return json({ error: "Lesson not found" }, { status: 404 });
    const ext = VIDEO_TYPES[String(body.type)];
    const size = Number(body.size);
    if (!ext) return json({ error: "Upload an MP4, WebM or MOV video." }, { status: 400 });
    if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO) return json({ error: "Videos can be up to 2 GB." }, { status: 400 });
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
    const key = `videos/${m.id}/${rand}.${ext}`;
    const up = await bucket.createMultipartUpload(key, { httpMetadata: { contentType: String(body.type), cacheControl: "private, max-age=86400" } });
    return json({ key, uploadId: up.uploadId });
  }

  if (op === "done") {
    const m = await moduleOf(body.module);
    if (!m) return json({ error: "Lesson not found" }, { status: 404 });
    const parts = Array.isArray(body.parts) ? body.parts : [];
    if (!keyOk(body.key, m.id) || typeof body.uploadId !== "string" || !UPLOAD_ID.test(body.uploadId) || parts.length < 1 || parts.length > 10000
      || !parts.every((p) => p && Number.isInteger((p as R2UploadedPart).partNumber) && typeof (p as R2UploadedPart).etag === "string")) {
      return json({ error: "Bad upload details" }, { status: 400 });
    }
    await bucket.resumeMultipartUpload(body.key, body.uploadId).complete(parts as R2UploadedPart[]);
    const { error } = await db.from("modules").update({ video_url: `/media/${body.key}` }).eq("id", m.id);
    if (error) return json({ error: error.message }, { status: 500 });
    const old = keyFromMedia(m.video_url);
    if (old && old !== body.key) await bucket.delete(old).catch(() => {});
    return json({ ok: true, video: `/media/${body.key}` });
  }

  if (op === "abort") {
    if (keyOk(body.key) && typeof body.uploadId === "string" && UPLOAD_ID.test(body.uploadId)) await bucket.resumeMultipartUpload(body.key, body.uploadId).abort().catch(() => {});
    return json({ ok: true });
  }

  if (op === "remove") {
    const m = await moduleOf(body.module);
    if (!m) return json({ error: "Lesson not found" }, { status: 404 });
    const old = keyFromMedia(m.video_url);
    await db.from("modules").update({ video_url: null }).eq("id", m.id);
    if (old) await bucket.delete(old).catch(() => {});
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

export const action = ({ request }: ActionFunctionArgs) => post(request);
