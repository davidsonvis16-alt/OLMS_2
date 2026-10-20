"use client";
import { useMemo, useState } from "react";
import type { PublicQuestion } from "@/lib/grading";
import { Icon } from "./icons";

type ModuleResult = { score: number; correct: number; total: number; results: Record<string, { correct: boolean }>; completed: boolean; slidesLeft: number };
type ExamResult = { score: number; correct: number; total: number; passed: boolean };

function shuffle<T>(a: T[], seed: number) {
  const r = [...a];
  let s = seed || 1;
  for (let i = r.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const TF = (o: string[]) => o.length === 2 && o.every((x) => /^(true|false|yes|no)$/i.test(x.trim()));

export function Quiz({
  questions, mode, endpointBody, startBody, started: openAtLoad = false, onStart, onDone, passMark = 80,
}: {
  questions: PublicQuestion[];
  mode: "module" | "exam";
  endpointBody: Record<string, string>;
  /** Opens the test on the server; the course's slides stay closed until it is submitted. */
  startBody: Record<string, string>;
  started?: boolean;
  onStart?: () => void;
  onDone?: (r: ModuleResult | ExamResult) => void;
  passMark?: number;
}) {
  // Deterministic first shuffle (same on server and browser); retries reshuffle.
  const [seed, setSeed] = useState(() => [...questions.map((q) => q.id).join("")].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 99991, 7) + 1);
  const order = useMemo(() => {
    const qs = mode === "exam" ? shuffle(questions, seed) : questions;
    return qs.map((q, i) => ({ q, opts: TF(q.options) ? q.options.map((_, k) => k) : shuffle(q.options.map((_, k) => k), seed + i * 7) }));
  }, [questions, mode, seed]);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ModuleResult | ExamResult | null>(null);
  const [started, setStarted] = useState(openAtLoad);

  async function begin() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/learn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(startBody) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start");
      setAnswers({}); setResult(null); setStarted(true); onStart?.();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not start"); }
    finally { setBusy(false); }
  }

  const answered = order.filter(({ q }) => (answers[q.id]?.length ?? 0) > 0).length;

  function pick(q: PublicQuestion, k: number) {
    if (result) return;
    setAnswers((a) => {
      const cur = a[q.id] ?? [];
      if (!q.multi) return { ...a, [q.id]: [k] };
      return { ...a, [q.id]: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] };
    });
  }

  async function submit() {
    if (answered < order.length && !confirm(`You've answered ${answered} of ${order.length} questions. Submit anyway?`)) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/learn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...endpointBody, answers }) });
      const data = await res.json();
      if (!res.ok) {
        if (data.notStarted) setStarted(false);
        throw new Error(data.error || "Could not submit");
      }
      setResult(data); setStarted(false); onDone?.(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not submit"); }
    finally { setBusy(false); }
  }

  function retry() { setSeed(seed + 13); begin(); }

  const mres = mode === "module" ? (result as ModuleResult | null) : null;
  const eres = mode === "exam" ? (result as ExamResult | null) : null;

  if (questions.length === 0) return <p className="alert alert--info">No questions have been added here yet.</p>;

  if (!started && !result) {
    const what = mode === "exam" ? "assessment" : "knowledge check";
    return (
      <div className="test-start">
        <Icon name="clipboard" />
        <div>
          <b>Ready? {order.length} question{order.length === 1 ? "" : "s"}.</b>
          <p>Once you start, <strong>the slides are closed until you submit</strong>. Leaving this page or refreshing won&apos;t reopen them, so make sure you&apos;ve finished studying first. After you submit, the slides open again for revision{mode === "exam" ? " and you can retake the assessment as often as you need" : ""}.</p>
          {err && <p className="alert alert--error" role="alert">{err}</p>}
          <button className="btn btn--go btn--lg" onClick={begin} disabled={busy}>{busy ? "Starting…" : `Start the ${what}`}<Icon name="arrow" /></button>
        </div>
      </div>
    );
  }

  const verdict = mode === "exam" ? (eres?.passed ? "is-pass" : "is-fail") : result && result.score >= passMark ? "is-pass" : "is-mid";
  return (
    <div className="quiz">
      {result && (
        <div className={`quiz-result ${verdict}`} role="status">
          <div className="score">{result.score}<span style={{ fontSize: ".4em", letterSpacing: 0 }}>%</span></div>
          <div>
            <h3>{mode === "exam" ? (eres!.passed ? "You passed." : "Not quite there yet.") : result.score >= passMark ? "Great work." : "Knowledge check complete."}</h3>
            <p>{result.correct} of {result.total} correct.{" "}
              {mode === "exam"
                ? eres!.passed ? "Your certificate is ready to claim." : `You need ${passMark}% to pass. Review the modules and try again; there's no limit on retakes.`
                : "Your answers are marked right or wrong below. Review the slides for any you missed, then retake the check whenever you like."}
            </p>
            <div className="meter meter--lg" aria-hidden="true">
              <span style={{ width: `${result.score}%`, background: verdict === "is-fail" ? "var(--red)" : undefined }} />
              <i className="pass" style={{ left: `${passMark}%` }} data-l={`PASS ${passMark}%`} />
            </div>
          </div>
        </div>
      )}

      <ol className="q-list">
        {order.map(({ q, opts }, i) => {
          const r = mres?.results[q.id];
          return (
            <li key={q.id} className={`q ${r ? (r.correct ? "q--right" : "q--wrong") : ""}`}>
              <p className="q-prompt" id={`qp-${q.id}`}><span className="q-n">{String(i + 1).padStart(2, "0")}</span><span>{q.prompt}{q.multi && <em>Choose {q.pick}</em>}</span></p>
              <div className="q-opts" role={q.multi ? "group" : "radiogroup"} aria-labelledby={`qp-${q.id}`}>
                {opts.map((k, j) => {
                  const on = answers[q.id]?.includes(k) ?? false;
                  const mark = r && on ? (r.correct ? " is-answer" : " is-miss") : "";
                  return (
                    <label key={k} className={`opt${on ? " is-on" : ""}${mark}`}>
                      <input type={q.multi ? "checkbox" : "radio"} name={q.id} checked={on} onChange={() => pick(q, k)} disabled={!!result} />
                      <span className="box" aria-hidden="true">{r && on ? <Icon name={r.correct ? "check" : "close"} /> : String.fromCharCode(65 + j)}</span>
                      <span>{q.options[k]}</span>
                      {r && on && <span className="sr-only"> (your answer: {r.correct ? "correct" : "incorrect"})</span>}
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      {err && <p className="alert alert--error" role="alert">{err}</p>}
      <div className="quiz-bar">
        <span className="quiz-count">{result ? `Score ${result.score}%` : `${answered} / ${order.length} answered`}</span>
        {!result && <div className="meter" aria-hidden="true"><span style={{ width: `${order.length ? (answered / order.length) * 100 : 0}%` }} /></div>}
        {!result
          ? <button className="btn btn--go" onClick={submit} disabled={busy}>{busy ? "Marking…" : mode === "exam" ? "Submit assessment" : "Check my answers"}</button>
          : <button className="btn btn--line" onClick={retry}>{mode === "exam" ? "Retake assessment" : "Retake check"}</button>}
      </div>
    </div>
  );
}
