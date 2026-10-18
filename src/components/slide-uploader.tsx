"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { setSlides } from "@/app/admin/actions";
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
      const sb = supabaseBrowser();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      for (let n = 1; n <= total; n++) {
        setState({ phase: "work", msg: `Converting & uploading slide ${n} of ${total}`, done: n - 1, total });
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: 1600 / base.width });
        canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode slide"))), "image/webp", 0.74));
        const path = `${courseId}/v${next}/${String(n).padStart(3, "0")}.webp`;
        const { error } = await sb.storage.from("slides").upload(path, blob, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
        if (error) throw new Error(error.message);
        page.cleanup();
      }
      await setSlides(courseId, next, total);
      setState({ phase: "done", msg: `${total} slides uploaded. Now set each module's slide range below.`, done: total, total });
      r.refresh();
    } catch (e) {
      setState({ phase: "error", msg: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const pct = state.total ? Math.round(((state.done ?? 0) / state.total) * 100) : 0;
  return (
    <div className="uploader">
      <div className="uploader-row">
        <div>
          <b>{count ? `${count} slides uploaded` : "No slides yet"}</b>
          <small>Upload the course deck as a PDF. Each page becomes a slide. Re-uploading replaces all slides.</small>
        </div>
        <label className={`btn btn--green btn--sm${state.phase === "work" ? " is-disabled" : ""}`}>
          <Icon name="upload" />{count ? "Replace slides" : "Upload PDF"}
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
