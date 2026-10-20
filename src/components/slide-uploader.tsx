import { useRef, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { callAction } from "@/lib/call-action";
import { Icon } from "./icons";

/**
 * Turns a PDF (PowerPoint: File > Save As > PDF) into one WebP image per slide, in the browser,
 * and uploads them to Supabase Storage. No server conversion needed.
 */
export function SlideUploader({ courseId, version, count }: { courseId: string; version: number; count: number }) {
  const r = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ phase: "idle" | "work" | "done" | "error"; msg?: string; done?: number; total?: number }>({ phase: "idle" });

  async function run(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { setState({ phase: "error", msg: "Choose a PDF file. In PowerPoint: File › Save As › PDF." }); return; }
    setState({ phase: "work", msg: "Opening PDF…", done: 0, total: 0 });
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
      const total = doc.numPages;
      const next = version + 1;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      // Pages are converted one by one, and sent in batches of 6 with up to 3 batches uploading at once.
      const BATCH = 6, PARALLEL = 3;
      let uploaded = 0;
      let failure: Error | null = null;
      const inFlight = new Set<Promise<void>>();
      const send = (batch: { page: number; blob: Blob }[]) => {
        const fd = new FormData();
        fd.set("course", courseId); fd.set("version", String(next));
        for (const x of batch) fd.set(`p${x.page}`, x.blob, `${x.page}.webp`);
        const p: Promise<void> = fetch("/api/admin/slides", { method: "POST", body: fd })
          .then(async (res) => {
            if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `server said ${res.status}`);
            uploaded += batch.length;
            setState({ phase: "work", msg: `Uploading… ${uploaded} of ${total} slides saved. Keep this page open.`, done: uploaded, total });
          })
          .catch((e) => { failure ??= e instanceof Error ? e : new Error(String(e)); })
          .finally(() => { inFlight.delete(p); });
        inFlight.add(p);
      };
      let batch: { page: number; blob: Blob }[] = [];
      setState({ phase: "work", msg: `Uploading… 0 of ${total} slides saved. Keep this page open.`, done: 0, total });
      for (let n = 1; n <= total; n++) {
        if (failure) break;
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: 1600 / base.width });
        canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("could not convert a slide"))), "image/webp", 0.74));
        page.cleanup();
        batch.push({ page: n, blob });
        if (batch.length === BATCH || n === total) {
          send(batch); batch = [];
          while (inFlight.size >= PARALLEL) await Promise.race(inFlight);
        }
      }
      await Promise.all(inFlight);
      if (failure) throw failure;
      await callAction("setSlides", { course: courseId, version: next, count: total });
      setState({ phase: "done", msg: `✓ ${total} slides uploaded and saved.`, done: total, total });
      r.refresh();
    } catch (e) {
      setState({ phase: "error", msg: `Upload stopped: ${e instanceof Error ? e.message : "unknown problem"}. Nothing was changed; try again, ideally in Chrome or Firefox.` });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const pct = state.total ? Math.round(((state.done ?? 0) / state.total) * 100) : 0;
  return (
    <div className="uploader">
      <div className="uploader-row">
        <div>
          <b>{count ? `${count} slides are uploaded` : "No slides yet"}</b>
          <small>{count ? "Uploading a new PDF replaces all the slides." : "Each page of the PDF becomes one slide."}</small>
        </div>
        <label className={`btn btn--green btn--sm${state.phase === "work" ? " is-disabled" : ""}`}>
          <Icon name="upload" />{state.phase === "work" ? "Uploading…" : count ? "Upload a new PDF" : "Upload course PDF"}
          <input ref={input} type="file" accept="application/pdf,.pdf" hidden disabled={state.phase === "work"} onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
        </label>
      </div>
      {state.phase !== "idle" && (
        <div className={`uploader-status is-${state.phase}`} role="status">
          {state.phase === "work" && <div className="bar"><span style={{ width: `${pct}%` }} /></div>}
          <small>{state.msg}</small>
        </div>
      )}
    </div>
  );
}
