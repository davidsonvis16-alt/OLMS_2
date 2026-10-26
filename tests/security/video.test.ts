import { beforeEach, describe, expect, it, vi } from "vitest";
import { asRoute, signIn } from "../support/setup";
import { USERS, fakeDb, stableId } from "../support/fake-supabase";
import { safeVideoUrl } from "@/lib/video";

// An in-memory stand-in for the Cloudflare R2 bucket.
const r2 = vi.hoisted(() => ({ objects: new Map<string, Uint8Array>(), uploads: new Map<string, { key: string; parts: Map<number, Uint8Array> }>(), on: true }));
vi.mock("@/lib/server/videos", () => ({
  videoBucket: () => !r2.on ? null : ({
    createMultipartUpload: async (key: string) => { const id = `up-${Math.random().toString(36).slice(2, 12)}`; r2.uploads.set(id, { key, parts: new Map() }); return { uploadId: id }; },
    resumeMultipartUpload: (key: string, id: string) => ({
      uploadPart: async (n: number, b: ArrayBuffer) => { r2.uploads.get(id)!.parts.set(n, new Uint8Array(b)); return { partNumber: n, etag: `e${n}` }; },
      complete: async (parts: { partNumber: number }[]) => { const u = r2.uploads.get(id)!; r2.objects.set(key, new Uint8Array(parts.flatMap((p) => [...u.parts.get(p.partNumber)!]))); r2.uploads.delete(id); },
      abort: async () => { r2.uploads.delete(id); },
    }),
    delete: async (key: string) => { r2.objects.delete(key); },
    get: async (key: string) => { const b = r2.objects.get(key); return b ? { body: b, size: b.length, httpEtag: '"x"', writeHttpMetadata: (h: Headers) => h.set("Content-Type", "video/mp4") } : null; },
  }),
}));

const { action } = await import("@/app/api/admin/video/route");
const { loader: media } = await import("@/app/media/route");
const POST = asRoute(action);
const MOD = stableId("haccp-principles#1");
const call = (op: string, body: unknown) => POST(new Request(`https://aspire.test/api/admin/video?op=${op}`, { method: "POST", body: JSON.stringify(body) }));
const part = (q: Record<string, string>, bytes: Uint8Array) => POST(new Request(`https://aspire.test/api/admin/video?${new URLSearchParams({ op: "part", ...q })}`, { method: "POST", body: bytes }));
const watch = (key: string) => asRoute(media, { "*": key })(new Request(`https://aspire.test/media/${key}`));

describe("lesson video uploads", () => {
  beforeEach(() => { r2.objects.clear(); r2.uploads.clear(); r2.on = true; });

  it("are for signed-in admins only", async () => {
    signIn(null); expect((await call("start", { module: MOD, size: 10, type: "video/mp4" })).status).toBe(401);
    for (const u of [USERS.learner, USERS.owner, USERS.member]) { signIn(u); expect((await call("start", { module: MOD, size: 10, type: "video/mp4" })).status).toBe(403); }
    expect(r2.uploads.size).toBe(0);
  });

  it("reject non-video files, oversized files, unknown lessons and keys outside the lesson's folder", async () => {
    signIn(USERS.admin);
    expect((await call("start", { module: MOD, size: 10, type: "text/html" })).status).toBe(400);
    expect((await call("start", { module: MOD, size: 3 * 1024 ** 3, type: "video/mp4" })).status).toBe(400);
    expect((await call("start", { module: stableId("nope"), size: 10, type: "video/mp4" })).status).toBe(404);
    expect((await part({ key: "../../secret", uploadId: "up-aaaaaaaa", n: "1" }, new Uint8Array(4))).status).toBe(400);
    const other = stableId("haccp-principles#2");
    const s = await (await call("start", { module: other, size: 4, type: "video/mp4" })).json();
    expect((await call("done", { module: MOD, key: s.key, uploadId: s.uploadId, parts: [{ partNumber: 1, etag: "e1" }] })).status).toBe(400);
  });

  it("save an uploaded video on the lesson, and play it only to signed-in users", async () => {
    signIn(USERS.admin);
    const s = await (await call("start", { module: MOD, size: 6, type: "video/mp4" })).json();
    expect(s.key).toMatch(new RegExp(`^videos/${MOD}/[a-z0-9]{16}\\.mp4$`));
    const p1 = await (await part({ key: s.key, uploadId: s.uploadId, n: "1" }, new Uint8Array([1, 2, 3]))).json();
    const p2 = await (await part({ key: s.key, uploadId: s.uploadId, n: "2" }, new Uint8Array([4, 5, 6]))).json();
    const done = await call("done", { module: MOD, key: s.key, uploadId: s.uploadId, parts: [p1, p2] });
    expect(done.status).toBe(200);
    const row = fakeDb().modules.find((m: { id: string }) => m.id === MOD) as { video_url: string };
    expect(row.video_url).toBe(`/media/${s.key}`);
    expect(safeVideoUrl(row.video_url)).toBe(row.video_url);
    expect([...r2.objects.get(s.key)!]).toEqual([1, 2, 3, 4, 5, 6]);

    signIn(USERS.learner); expect((await watch(s.key)).status).toBe(200);
    signIn(null); expect((await watch(s.key)).status).toBe(401);
    signIn(USERS.learner); expect((await watch("videos/../../etc/passwd")).status).toBe(404);

    // Replacing the video deletes the old file.
    signIn(USERS.admin);
    const s2 = await (await call("start", { module: MOD, size: 1, type: "video/mp4" })).json();
    const q = await (await part({ key: s2.key, uploadId: s2.uploadId, n: "1" }, new Uint8Array([9]))).json();
    await call("done", { module: MOD, key: s2.key, uploadId: s2.uploadId, parts: [q] });
    expect(r2.objects.has(s.key)).toBe(false);
    expect(r2.objects.has(s2.key)).toBe(true);
  });

  it("say so clearly when video storage isn't switched on", async () => {
    r2.on = false; signIn(USERS.admin);
    expect((await call("start", { module: MOD, size: 10, type: "video/mp4" })).status).toBe(503);
  });
});
