import { useRef, useState } from "react";

const PART = 20 * 1024 * 1024; // pieces of 20 MB (Cloudflare accepts up to 100 MB per request)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call(op: string, body: unknown): Promise<any> {
  const res = await fetch(`/api/admin/video?op=${op}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

/** "Upload video from this computer" for one lesson. The file goes to Cloudflare R2 in pieces, with a progress bar. */
export function VideoUploader({ moduleId, current }: { moduleId: string; current: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const uploaded = current?.startsWith("/media/");

  async function upload(file: File) {
    setMsg(null); setPct(0);
    let started: { key: string; uploadId: string } | null = null;
    try {
      const s0: { key: string; uploadId: string } = await call("start", { module: moduleId, size: file.size, type: file.type || "video/mp4" });
      started = s0;
      const parts: { partNumber: number; etag: string }[] = [];
      const total = Math.max(1, Math.ceil(file.size / PART));
      for (let n = 1; n <= total; n++) {
        const piece = file.slice((n - 1) * PART, n * PART);
        const q = new URLSearchParams({ op: "part", key: s0.key, uploadId: s0.uploadId, n: String(n) });
        const res = await fetch(`/api/admin/video?${q}`, { method: "POST", body: piece });
        const data = (await res.json().catch(() => ({}))) as { error?: string; partNumber: number; etag: string };
        if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
        parts.push({ partNumber: data.partNumber, etag: data.etag });
        setPct(Math.round((n / total) * 100));
      }
      await call("done", { module: moduleId, key: s0.key, uploadId: s0.uploadId, parts });
      setMsg({ ok: true, text: "Video uploaded. Learners see it at the top of this lesson." });
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      if (started) call("abort", started).catch(() => {});
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed. Please try again." });
    } finally { setPct(null); }
  }

  async function remove() {
    if (!confirm("Remove this lesson's video?")) return;
    try { await call("remove", { module: moduleId }); location.reload(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't remove it." }); }
  }

  return (
    <div className="vid-up">
      <input ref={input} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <button type="button" className="btn btn--sm btn--line" disabled={pct !== null} onClick={() => input.current?.click()}>
        {uploaded ? "Replace video" : "Upload video from this computer"}
      </button>
      {uploaded && pct === null && <><span className="ok">✓ Video uploaded</span><a className="link" href={current!} target="_blank" rel="noopener">Watch</a><button type="button" className="link-btn danger" onClick={remove}>Remove</button></>}
      {pct !== null && <><progress max={100} value={pct} /><span>Uploading… {pct}% (keep this page open)</span></>}
      {msg && <span className={msg.ok ? "ok" : "danger"} role="status">{msg.text}</span>}
    </div>
  );
}
