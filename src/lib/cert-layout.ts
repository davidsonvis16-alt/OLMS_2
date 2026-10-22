/**
 * The certificate, described once. Units are millimetres on an A4 landscape sheet (297 × 210), y down.
 * `layoutCertificate` measures text with the real font files and returns drawing operations;
 * components/certificate.tsx renders them as SVG and api/certificate renders them into the PDF.
 */
import type { PDFFont } from "pdf-lib";
import type { FontKey } from "./cert-fonts";
import { SITE } from "./site";

export const PAGE = { w: 297, h: 210 };
/** Letter pairs that fonts turn into ligatures; pdf-lib advances those incorrectly. */
export const LIGA = /f[filt]/;
export const C = {
  paper: "#fffefb", ink: "#0d0d24", mute: "#6a6a7e", navy: "#24235d", blue: "#013996",
  green: "#63ca33", greenInk: "#2a7612", line: "#c9c8bf", wave: "#d3dcee", waveG: "#d6ebcb", red: "#b42318",
};

export type CertInput = {
  serial: string; fullName: string; idNumber: string; course: string; modules: string[]; score: number;
  issuedAt: string | Date; companyName?: string | null; verifyUrl: string;
  /** "sample" for previews; real certificates have no stamp. */
  stamp?: "sample" | null;
};

export type Op =
  | { k: "rect"; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number; opacity?: number }
  | { k: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { k: "path"; d: string; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { k: "text"; x: number; y: number; text: string; font: FontKey; size: number; color: string; ls?: number; rotate?: number; opacity?: number }
  | { k: "image"; src: "logo" | "signature" | "qr" | "seal"; x: number; y: number; w: number; h: number; opacity?: number };

type Fonts = Record<FontKey, PDFFont>;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function layoutCertificate(d: CertInput, f: Fonts): Op[] {
  const W = PAGE.w, H = PAGE.h, CX = W / 2;
  const ops: Op[] = [];
  // Strings with f-ligature pairs are measured (and drawn in the PDF) letter by letter, with ligatures off on screen too.
  const width = (t: string, font: FontKey, size: number, ls = 0) =>
    (LIGA.test(t) ? [...t].reduce((n, ch) => n + f[font].widthOfTextAtSize(ch, size), 0) : f[font].widthOfTextAtSize(t, size)) + ls * Math.max(0, [...t].length - 1);
  const text = (t: string, x: number, y: number, font: FontKey, size: number, color: string, opts: { ls?: number; align?: "start" | "middle" | "end"; opacity?: number } = {}) => {
    const w = width(t, font, size, opts.ls);
    const left = opts.align === "middle" ? x - w / 2 : opts.align === "end" ? x - w : x;
    ops.push({ k: "text", x: r2(left), y: r2(y), text: t, font, size: r2(size), color, ls: opts.ls, opacity: opts.opacity });
    return w;
  };
  const fit = (t: string, font: FontKey, size: number, max: number, min: number) => { let s = size; while (width(t, font, s) > max && s > min) s -= .25; return s; };

  // Paper and security pattern: horizontal waves, a rosette of circles behind the name, microtext.
  ops.push({ k: "rect", x: 0, y: 0, w: W, h: H, fill: C.paper });
  let waves = "";
  for (let y = 14, i = 0; y < H - 10; y += 4.2, i++) {
    // Explicit quadratic segments (no T shorthand) so every renderer draws the same curve.
    const half = 8;
    waves += `M9 ${r2(y)}`;
    for (let x = 9, k = i % 2; x < W - 9 - .01; x += half, k++) waves += `Q${x + half / 2} ${r2(y + (k % 2 ? 2.2 : -2.2))} ${x + half} ${r2(y)}`;
  }
  ops.push({ k: "path", d: waves, stroke: C.wave, sw: .12, opacity: .9 });
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    ops.push({ k: "circle", cx: r2(CX + Math.cos(a) * 12), cy: r2(104 + Math.sin(a) * 12), r: 30, stroke: C.waveG, sw: .14, opacity: .85 });
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + .13;
    ops.push({ k: "circle", cx: r2(CX + Math.cos(a) * 20), cy: r2(104 + Math.sin(a) * 20), r: 46, stroke: C.wave, sw: .12, opacity: .6 });
  }
  // A clear field for the type to sit on.
  ops.push({ k: "rect", x: 40, y: 47, w: W - 80, h: 104, fill: C.paper, opacity: .78 });
  // Watermark: the Aspire logo, large and faint, behind the name.
  ops.push({ k: "image", src: "logo", x: r2(CX - (466 / 640) * 45), y: 59, w: r2((466 / 640) * 90), h: 90, opacity: .07 });

  // Frame: a strong rule, a hairline, and print-style corner ticks.
  ops.push({ k: "rect", x: 7, y: 7, w: W - 14, h: H - 14, stroke: C.navy, sw: .6 });
  ops.push({ k: "rect", x: 9.2, y: 9.2, w: W - 18.4, h: H - 18.4, stroke: C.navy, sw: .18, opacity: .45 });
  for (const [x, y, dx, dy] of [[4, 4, 1, 1], [W - 4, 4, -1, 1], [4, H - 4, 1, -1], [W - 4, H - 4, -1, -1]] as const) {
    ops.push({ k: "line", x1: x, y1: y + dy * 5, x2: x, y2: y, stroke: C.navy, sw: .25 });
    ops.push({ k: "line", x1: x, y1: y, x2: x + dx * 5, y2: y, stroke: C.navy, sw: .25 });
  }
  const micro = "ASPIRE SAFETY & HYGIENE SOLUTIONS · VALUE, QUALITY & SERVICE · ";
  let m = micro; while (width(m + micro, "mono", 1.35, .12) < W - 26) m += micro;
  text(m.trim(), CX, 12.6, "mono", 1.35, C.navy, { ls: .12, align: "middle", opacity: .55 });

  // Header
  ops.push({ k: "image", src: "logo", x: 20, y: 17, w: r2((466 / 640) * 27), h: 27 });
  text(SITE.name, 43, 28.5, "sans600", 4.5, C.blue, { ls: .14 });
  text("Value, Quality & Service.", 43, 35.6, "serifI", 5, C.greenInk);
  text("CERTIFICATE NO.", W - 20, 24, "mono", 2, C.mute, { ls: .32, align: "end" });
  text(d.serial, W - 20, 30.2, "mono", 3.9, C.ink, { ls: .1, align: "end" });

  // Body
  text("AWARDED ON SUCCESSFUL COMPLETION", CX, 58, "mono", 2.3, C.mute, { ls: .95, align: "middle" });
  text("Certificate of Achievement", CX, 72, "serif", fit("Certificate of Achievement", "serif", 13.5, 200, 9), C.navy, { align: "middle" });
  text("This is to certify that", CX, 84.5, "serifI", 5.2, C.mute, { align: "middle" });
  const ns = fit(d.fullName, "serifI", 15, 200, 7.5);
  const nw = text(d.fullName, CX, 102, "serifI", ns, C.blue, { align: "middle" });
  const rule = Math.min(220, Math.max(110, nw + 24));
  ops.push({ k: "line", x1: r2(CX - rule / 2), y1: 106.2, x2: r2(CX + rule / 2), y2: 106.2, stroke: C.navy, sw: .2, opacity: .5 });
  text(`ID / PASSPORT NO.  ${d.idNumber}`, CX, 113, "mono", 2.6, C.mute, { ls: .45, align: "middle" });
  text("has successfully completed the course", CX, 124, "serifI", 5.2, C.mute, { align: "middle" });
  text(d.course, CX, 136, "serif600", fit(d.course, "serif600", 8.6, 215, 5), C.navy, { align: "middle" });
  if (d.modules.length) {
    const words = `Modules: ${d.modules.join("  ·  ")}`.split(" ");
    const lines: string[] = []; let cur = "";
    for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (width(t, "sans500", 2.9) > 196 && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    lines.slice(0, 3).forEach((l, i) => text(l, CX, 143.6 + i * 4.3, "sans500", 2.9, C.mute, { align: "middle" }));
  }

  // Signature (bottom left)
  ops.push({ k: "image", src: "signature", x: 22, y: 157, w: r2((486 / 161) * 17), h: 17 });
  text("AUTHORISED SIGNATORY", 22, 180.4, "mono", 2, C.mute, { ls: .3 });
  text(SITE.name, 22, 184.6, "sans500", 2.3, C.ink);
  if (d.companyName) text(`Sponsored by ${d.companyName}`, 22, 189, "sans500", 2.3, C.mute);

  // Seal (bottom centre). HACCP courses also carry the gold "HACCP Certified" seal beside it.
  const haccp = /haccp/i.test(d.course);
  const sx = haccp ? CX - 20 : CX, sy = 172;
  if (haccp) ops.push({ k: "image", src: "seal", x: r2(CX + 20 - (538 / 600) * 16), y: sy - 16, w: r2((538 / 600) * 32), h: 32 });
  let star = "";
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, rr = i % 2 ? 15.2 : 16.4;
    star += `${i ? "L" : "M"}${r2(sx + Math.sin(a) * rr)} ${r2(sy - Math.cos(a) * rr)}`;
  }
  ops.push({ k: "path", d: star + "Z", fill: C.green });
  ops.push({ k: "circle", cx: sx, cy: sy, r: 14.3, fill: C.blue });
  ops.push({ k: "circle", cx: sx, cy: sy, r: 13.5, stroke: "#ffffff", sw: .18, opacity: .7 });
  ops.push({ k: "circle", cx: sx, cy: sy, r: 9.4, stroke: "#ffffff", sw: .18, opacity: .7 });
  const ring = "VALUE · QUALITY · SERVICE · ASPIRE · ";
  [...ring].forEach((ch, i) => {
    const a = (i / ring.length) * Math.PI * 2;
    const cw = width(ch, "mono", 2.05);
    const rr = 10.5;
    const x = sx + Math.sin(a) * rr - Math.cos(a) * cw / 2, y = sy - Math.cos(a) * rr - Math.sin(a) * cw / 2;
    ops.push({ k: "text", x: r2(x), y: r2(y), text: ch, font: "mono", size: 2.05, color: "#ffffff", rotate: r2((a * 180) / Math.PI) });
  });
  text("ASPIRE", sx, sy - 3.3, "sans600", 2.3, "#ffffff", { ls: .35, align: "middle" });
  text(`${d.score}%`, sx, sy + 3.2, "sans600", 6, C.green, { align: "middle" });
  text("PASSED", sx, sy + 6.6, "mono", 1.75, "#ffffff", { ls: .4, align: "middle" });

  // Meta + QR (bottom right)
  const date = new Date(d.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  text("FINAL MARK", 244, 165, "mono", 2, C.mute, { ls: .3, align: "end" });
  text(`${d.score}%`, 244, 170.4, "mono", 3.6, C.ink, { align: "end" });
  text("DATE OF ISSUE", 244, 178, "mono", 2, C.mute, { ls: .3, align: "end" });
  text(date, 244, 183.4, "mono", 3.6, C.ink, { align: "end" });
  ops.push({ k: "rect", x: 249, y: 158, w: 28, h: 28, fill: "#ffffff", stroke: C.line, sw: .2 });
  ops.push({ k: "image", src: "qr", x: 251, y: 160, w: 24, h: 24 });
  text("SCAN TO VERIFY", 263, 190, "mono", 1.6, C.mute, { ls: .3, align: "middle" });

  text(`Verify at ${d.verifyUrl.replace(/^https?:\/\//, "")}`, CX, 197.4, "mono", 1.9, C.mute, { ls: .1, align: "middle" });

  if (d.stamp) {
    const label = "SAMPLE";
    const size = 26, ls = size * .12, deg = -14;
    const w = width(label, "sans600", size, ls), th = (deg * Math.PI) / 180;
    const x = CX - Math.cos(th) * w / 2 - Math.sin(th) * size * .36, y = 104 - Math.sin(th) * w / 2 + Math.cos(th) * size * .36;
    ops.push({ k: "text", x: r2(x), y: r2(y), text: label, font: "sans600", size, color: C.red, ls, rotate: deg, opacity: .16 });
  }
  return ops;
}
