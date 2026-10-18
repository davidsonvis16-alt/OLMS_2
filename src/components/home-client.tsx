"use client";
import { useEffect, useRef, useState } from "react";

const MIN = -20, MAX = 100;
const pos = (t: number) => `${((t - MIN) / (MAX - MIN)) * 100}%`;

/** Facts here come from the course content, with the module named as the source. */
function read(t: number) {
  if (t <= -18) return { tone: "safe", title: "Freezer storage", body: "Freezers should be kept at −18°C.", src: "HACCP Principles · Module 5" };
  if (t < 5) return { tone: "", title: "Below the danger zone", body: "Under 5°C you are below the range in which bacteria multiply.", src: "Food Hygiene & Safety for Food Handlers · Module 1" };
  if (t <= 63) return { tone: "danger", title: "The danger zone", body: "5°C to 63°C is the temperature danger zone, where bacteria can multiply in food.", src: "Food Hygiene & Safety for Food Handlers · Module 1" };
  return { tone: "", title: "Above the danger zone", body: "Above 63°C you are out of the range in which bacteria multiply.", src: "Food Hygiene & Safety for Food Handlers · Module 1" };
}

export function Thermo() {
  const [t, setT] = useState(21);
  const r = read(t);
  return (
    <div className="thermo">
      <div className="thermo-copy">
        <span className="micro" style={{ color: "rgba(255,255,255,.55)" }}>(03) A lesson in one gesture</span>
        <h2 className="h-l" style={{ marginTop: 20 }}>Know your<br />numbers.</h2>
        <p>Drag the scale. Every reading below is taken from the courses, and names the module it comes from.</p>
      </div>
      <div className="thermo-read" aria-live="polite">
        <div className={`thermo-num${r.tone ? ` is-${r.tone}` : ""}`}>{t > 0 ? "" : t < 0 ? "−" : ""}{Math.abs(t)}<sup>°C</sup></div>
        <div className="thermo-state">
          <b>{r.title}</b>
          <p>{r.body}</p>
          <small>Source: {r.src}</small>
        </div>
      </div>
      <div className="scale">
        <span className="scale-mark" style={{ left: pos(-18) }}><b>−18°</b><span>Freezer</span></span>
        <span className="scale-mark" style={{ left: pos(5) }}><b>5°</b><span>Danger zone begins</span></span>
        <span className="scale-mark" style={{ left: pos(63) }}><b>63°</b><span>Danger zone ends</span></span>
        <div className="scale-track"><span className="scale-zone" style={{ left: pos(5), width: `calc(${pos(63)} - ${pos(5)})` }} /></div>
        <div className="scale-nums" aria-hidden="true">{[-20, 0, 20, 40, 60, 80, 100].map((n) => <span key={n}>{n}°</span>)}</div>
        <label className="sr-only" htmlFor="temp">Temperature in degrees Celsius</label>
        <input id="temp" type="range" min={MIN} max={MAX} step={1} value={t} onChange={(e) => setT(Number(e.target.value))} aria-valuetext={`${t} degrees Celsius: ${r.title}`} />
        <p className="scale-hint">Drag, or focus and use the arrow keys</p>
      </div>
    </div>
  );
}

/** A photo that follows the pointer over rows marked with data-pic (fine pointers only). */
export function HoverPics() {
  const box = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rows = document.querySelectorAll<HTMLElement>("[data-pic]");
    const move = (e: MouseEvent) => { if (box.current) { box.current.style.left = `${e.clientX + 170}px`; box.current.style.top = `${e.clientY}px`; } };
    const enter = (e: Event) => setSrc((e.currentTarget as HTMLElement).dataset.pic ?? null);
    const leave = () => setSrc(null);
    rows.forEach((r) => { r.addEventListener("mouseenter", enter); r.addEventListener("mouseleave", leave); r.addEventListener("mousemove", move); });
    return () => rows.forEach((r) => { r.removeEventListener("mouseenter", enter); r.removeEventListener("mouseleave", leave); r.removeEventListener("mousemove", move); });
  }, []);
  return <div ref={box} className={`hover-pic${src ? " is-on" : ""}`} aria-hidden="true">{src && <img src={src} alt="" />}</div>;
}
