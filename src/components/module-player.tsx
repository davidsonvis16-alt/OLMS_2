"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicQuestion } from "@/lib/grading";
import { Icon } from "./icons";
import { Quiz } from "./quiz";

type Props = {
  course: { id: string; slug: string; title: string };
  module: { id: string; title: string; index: number; total: number; video: string | null };
  slides: string[];
  startAt: number;
  questions: PublicQuestion[];
  completed: boolean;
  nextHref: string;
  nextLabel: string;
  /** The knowledge check was already started (e.g. the page was refreshed mid-test). */
  testOpen: boolean;
};

export function ModulePlayer({ course, module, slides, startAt, questions, completed, nextHref, nextLabel, testOpen }: Props) {
  const [i, setI] = useState(startAt);
  // While the knowledge check is open the slides are closed (the server enforces this too).
  const [testing, setTesting] = useState(testOpen);
  const [blocked, setBlocked] = useState(false);
  const [stage, setStage] = useState<"slides" | "quiz">(testOpen ? "quiz" : "slides");
  const [done, setDone] = useState(completed);
  const [loaded, setLoaded] = useState(false);
  const [left, setLeft] = useState(0);
  const sent = useRef(-1);
  const frame = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const last = slides.length - 1;

  // Reports every slide shown: the server records the furthest one, and refuses (409) while a test is open, e.g.
  // when the test was started in another tab, in which case this tab closes its slides too.
  const report = useCallback((page: number) => {
    if (page === sent.current) return;
    sent.current = page;
    fetch("/api/learn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "progress", moduleId: module.id, page }), keepalive: true })
      .then(async (r) => { if (r.status === 409 && (await r.json().catch(() => ({}))).locked) setBlocked(true); })
      .catch(() => {});
  }, [module.id]);

  useEffect(() => {
    report(i + 1);
    // the image may already be loaded (e.g. cached or loaded before hydration)
    setLoaded(!!img.current?.complete && (img.current?.naturalWidth ?? 0) > 0);
  }, [i, report]);

  // preload neighbours
  useEffect(() => { [i + 1, i + 2].forEach((n) => { if (slides[n]) { const im = new Image(); im.src = slides[n]; } }); }, [i, slides]);

  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(last, x + d))), [last]);

  useEffect(() => {
    if (stage !== "slides") return;
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input:not([type=range]),textarea,select")) return;
      if ((e.target as HTMLElement)?.closest("input[type=range]") && e.key.startsWith("Arrow")) return;
      if (e.key === " " && (e.target as HTMLElement)?.closest("button,a")) return; // let Space press the focused control
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
      if (e.key === "Home") { e.preventDefault(); setI(0); }
      if (e.key === "End") { e.preventDefault(); setI(last); }
      if (e.key === "f" || e.key === "F") { e.preventDefault(); fullscreen(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go, stage, last]);

  // swipe on phones
  const touch = useRef<number | null>(null);

  function fullscreen() {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.();
  }

  const pct = slides.length ? Math.round(((i + 1) / slides.length) * 100) : 0;

  return (
    <div className="player">
      <header className="player-top">
        {testing ? <span className="player-back is-off" aria-hidden="true"><Icon name="lock" /></span> : <Link href={`/learn/${course.slug}`} className="player-back" aria-label="Back to course"><Icon name="back" /></Link>}
        <div className="player-titles">
          <small>Module {String(module.index).padStart(2, "0")} of {String(module.total).padStart(2, "0")} · {course.title}</small>
          <b>{module.title}</b>
        </div>
        <div className="player-steps" role="group" aria-label="Module sections">
          <button aria-pressed={stage === "slides"} onClick={() => setStage("slides")} disabled={testing} title={testing ? "Closed until you submit the knowledge check" : undefined}><Icon name={testing ? "lock" : "book"} /><span>Slides</span></button>
          <button aria-pressed={stage === "quiz"} onClick={() => setStage("quiz")}><Icon name="clipboard" /><span>Knowledge check</span></button>
        </div>
      </header>

      {blocked && stage === "slides" ? (
        <main id="main" className="player-main">
          <div className="slide-empty">
            <Icon name="lock" />
            <p>You have a test open in this course. The slides stay closed until you submit it.</p>
            <a className="btn btn--go" href={`/learn/${course.slug}`}>Go to my test<Icon name="arrow" /></a>
          </div>
        </main>
      ) : stage === "slides" ? (
        <main id="main" className="player-main">
          {module.video && (
            <div className="video-wrap">
              <iframe src={module.video} title={`${module.title} video`} loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
          )}
          {slides.length === 0 ? (
            <div className="slide-empty">
              <img src="/brand/logo-light.png" alt="" />
              <span className="micro" style={{ color: "rgba(255,255,255,.5)" }}>Slides not uploaded yet</span>
              <p>The slides for this module haven&apos;t been uploaded yet. You can still take the knowledge check.</p>
              <button className="btn btn--go" onClick={() => setStage("quiz")}>Go to the knowledge check<Icon name="arrow" /></button>
            </div>
          ) : (
            <>
              <div
                className="slide-frame" ref={frame}
                onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); touch.current = null; }}
              >
                {!loaded && <div className="slide-loading" aria-hidden="true" />}
                <img ref={img} key={slides[i]} src={slides[i]} alt={`Slide ${i + 1} of ${slides.length}`} onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} className={loaded ? "is-loaded" : ""} draggable={false} />
                <button className="slide-nav slide-nav--prev" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous slide"><Icon name="back" /></button>
                <button className="slide-nav slide-nav--next" onClick={() => go(1)} disabled={i === last} aria-label="Next slide"><Icon name="arrow" /></button>
                <button className="slide-fs" onClick={fullscreen} aria-label="Full screen (F)"><Icon name="expand" /></button>
              </div>
              <div className="slide-bar">
                <button className="btn btn--outline btn--sm" onClick={() => go(-1)} disabled={i === 0}><Icon name="back" />Back</button>
                <div className="scrub">
                  <div className="scrub-ticks" style={{ ["--step" as string]: `${100 / Math.max(slides.length - 1, 1)}%` }}>
                    <span className="scrub-fill" style={{ width: `${slides.length > 1 ? (i / last) * 100 : 100}%` }} />
                  </div>
                  <input type="range" min={1} max={slides.length} value={i + 1} onChange={(e) => setI(Number(e.target.value) - 1)} aria-label="Go to slide" aria-valuetext={`Slide ${i + 1} of ${slides.length}`} />
                  <div className="scrub-label"><span>Slide {String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span><span>{pct}%</span></div>
                </div>
                {i < last
                  ? <button className="btn btn--green btn--sm" onClick={() => go(1)}>Next<Icon name="arrow" /></button>
                  : <button className="btn btn--green btn--sm" onClick={() => setStage("quiz")}>Knowledge check<Icon name="arrow" /></button>}
              </div>
              <p className="hint"><kbd>←</kbd><kbd>→</kbd> move · <kbd>Home</kbd><kbd>End</kbd> jump · <kbd>F</kbd> full screen · swipe on a phone</p>
              <p className="sr-only" aria-live="polite">Slide {i + 1} of {slides.length}</p>
            </>
          )}
        </main>
      ) : (
        <main id="main" className="player-main player-main--quiz">
          <div className="quiz-head">
            <span className="eyebrow">Knowledge check</span>
            <h1>{module.title}</h1>
            <p className="muted">Check what you&apos;ve learned. View every slide and complete this check to finish the module. You&apos;ll see which of your answers were right.</p>
          </div>
          <Quiz questions={questions} mode="module" endpointBody={{ type: "quiz", moduleId: module.id }} startBody={{ type: "start", courseId: course.id, moduleId: module.id }} started={testOpen}
            onStart={() => setTesting(true)}
            onDone={(r) => { setTesting(false); if ("completed" in r) { setDone(r.completed); setLeft(r.slidesLeft); } }} />
          {!done && left > 0 && <p className="alert alert--info" role="status">View the remaining {left} slide{left === 1 ? "" : "s"} of this module, then submit the check again to finish it.</p>}
          {done && (
            <div className="next-card">
              <div><small>Module complete</small><b>{nextLabel}</b></div>
              <Link className="cta" href={nextHref}><span>Continue</span><i><Icon name="arrow" /></i></Link>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
