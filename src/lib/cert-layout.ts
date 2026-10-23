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

  // Paper and a light security pattern (fine waves) under everything.
  ops.push({ k: "rect", x: 0, y: 0, w: W, h: H, fill: "#ffffff" });
  let waves = "";
  for (let y = 14, i = 0; y < H - 10; y += 4.2, i++) {
    // Explicit quadratic segments (no T shorthand) so every renderer draws the same curve.
    const half = 8;
    waves += `M9 ${r2(y)}`;
    for (let x = 9, k = i % 2; x < W - 9 - .01; x += half, k++) waves += `Q${x + half / 2} ${r2(y + (k % 2 ? 2.2 : -2.2))} ${x + half} ${r2(y)}`;
  }
  ops.push({ k: "path", d: waves, stroke: C.wave, sw: .12, opacity: .45 });
  // Watermark: the Aspire logo, large and faint, behind the name.
  ops.push({ k: "image", src: "logo", x: r2(CX - (466 / 640) * 45), y: 70, w: r2((466 / 640) * 90), h: 90, opacity: .06 });

  // Corners: navy triangles with a green band (top left and bottom right), as on the approved sample.
  const tri = (pts: number[][], fill: string) => ops.push({ k: "path", d: `M${pts.map((p) => p.join(" ")).join("L")}Z`, fill });
  tri([[0, 0], [100.5, 0], [0, 100.5], [0, 92.6], [92.6, 0]], C.green);
  tri([[0, 0], [87, 0], [0, 87]], C.navy);
  tri([[W, H], [W - 100.5, H], [W, H - 100.5], [W, H - 92.6], [W - 92.6, H]], C.green);
  tri([[W, H], [W - 87, H], [W, H - 87]], C.navy);
  // Frame: a navy rule and a fine inner line.
  ops.push({ k: "rect", x: 5.8, y: 5.8, w: W - 11.6, h: H - 11.6, stroke: C.navy, sw: .55 });
  ops.push({ k: "rect", x: 7.9, y: 7.9, w: W - 15.8, h: H - 15.8, stroke: C.line, sw: .25 });
  // "CERTIFIED" along the top-left corner.
  {
    const label = "CERTIFIED", size = 4, ls = 2.2, w = width(label, "sans600", size, ls), k = Math.SQRT1_2;
    const mx = 22, my = 22; // middle of the text, on the navy corner
    ops.push({ k: "text", x: r2(mx - (w / 2) * k + 1.4 * k), y: r2(my + (w / 2) * k + 1.4 * k), text: label, font: "sans600", size, color: "#ffffff", ls, rotate: -45 });
  }
  // Microtext along the top edge, clear of the corner.
  const micro = "ASPIRE SAFETY & HYGIENE SOLUTIONS · VALUE, QUALITY & SERVICE · ";
  let m = micro; while (width(m + micro, "mono", 1.35, .12) < 185) m += micro;
  text(m.trim(), 190, 11.6, "mono", 1.35, C.navy, { ls: .12, align: "middle", opacity: .5 });

  // Badge: the logo inside a navy laurel.
  {
    const bx = CX, by = 41, box = 40, sc = box / 200;
    const pt = (u: number, v: number) => `${r2(bx - box / 2 + u * sc)} ${r2(by - box / 2 + v * sc)}`;
    const R = 84;
    for (const side of [-1, 1]) {
      const a0 = Math.PI / 2 + side * .32, a1 = Math.PI / 2 + side * 2.55;
      let stem = "";
      for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; stem += `${i ? "L" : "M"}${pt(100 + Math.cos(a) * R, 100 + Math.sin(a) * R)}`; }
      ops.push({ k: "path", d: stem, stroke: C.navy, sw: .45 });
      for (let i = 0; i < 8; i++) {
        const a = a0 + (a1 - a0) * (i + .5) / 8, x = 100 + Math.cos(a) * R, y = 100 + Math.sin(a) * R;
        const sk = 1 - i * .035;
        for (const o of [-1, 1]) {
          const t = ((a * 180) / Math.PI + (side > 0 ? 90 : -90) + 180 + o * 42) * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t);
          const tp = (lx: number, ly: number) => pt(x + (lx * c - ly * sn) * sk, y + (lx * sn + ly * c) * sk);
          ops.push({ k: "path", d: `M${tp(0, 0)}C${tp(7, -6)} ${tp(7, -16)} ${tp(0, -24)}C${tp(-7, -16)} ${tp(-7, -6)} ${tp(0, 0)}Z`, fill: C.navy });
        }
      }
    }
    ops.push({ k: "image", src: "logo", x: r2(bx - (466 / 640) * 13.75), y: r2(by - 13.75), w: r2((466 / 640) * 27.5), h: 27.5 });
  }
  text(SITE.name, CX, 68.5, "sans600", fit(SITE.name, "sans600", 4.2, 150, 3), C.blue, { ls: .9, align: "middle" });

  // Body
  text("Certificate of Achievement", CX, 84, "serif", fit("Certificate of Achievement", "serif", 13.5, 200, 9), C.navy, { align: "middle" });
  text("This is to certify that", CX, 94, "serifI", 5.2, C.mute, { align: "middle" });
  const ns = fit(d.fullName, "serifI", 15, 200, 7.5);
  const nw = text(d.fullName, CX, 109, "serifI", ns, C.blue, { align: "middle" });
  const rule = Math.min(200, Math.max(110, nw + 10));
  ops.push({ k: "line", x1: r2(CX - rule / 2), y1: 113.5, x2: r2(CX + rule / 2), y2: 113.5, stroke: C.green, sw: .6 });
  text(`ID / PASSPORT NO.  ${d.idNumber}`, CX, 119.5, "mono", 2.6, C.mute, { ls: .45, align: "middle" });
  text("has successfully completed the course", CX, 127.5, "serifI", 5.2, C.mute, { align: "middle" });
  text(d.course, CX, 137.5, "serif600", fit(d.course, "serif600", 8.6, 200, 5), C.navy, { align: "middle" });
  if (d.modules.length) {
    const words = `Modules: ${d.modules.join("  ·  ")}`.split(" ");
    const lines: string[] = []; let cur = "";
    for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (width(t, "sans500", 2.9) > 180 && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    lines.slice(0, 3).forEach((l, i) => text(l, CX, 144.2 + i * 4.1, "sans500", 2.9, C.mute, { align: "middle" }));
  }

  // Signature (bottom left)
  ops.push({ k: "image", src: "signature", x: 24, y: 160, w: r2((486 / 161) * 17), h: 17 });
  text("AUTHORISED SIGNATORY", 24, 183, "mono", 2, C.mute, { ls: .3 });
  text(SITE.name, 24, 187.2, "sans500", 2.3, C.ink);
  if (d.companyName) text(`Sponsored by ${d.companyName}`, 24, 191.4, "sans500", 2.3, C.mute);

  // Seal (bottom centre). HACCP courses also carry the gold "HACCP Certified" seal beside it.
  const haccp = /haccp/i.test(d.course);
  const sx = haccp ? CX - 20 : CX, sy = 173;
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

  // Certificate details under the seal, QR code (bottom right)
  const date = new Date(d.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  text(`CERTIFICATE NO. ${d.serial}  ·  FINAL MARK ${d.score}%  ·  ISSUED ${date.toUpperCase()}`, CX, 194.8, "mono", 2.2, C.ink, { ls: .25, align: "middle" });
  text(`Verify at ${d.verifyUrl.replace(/^https?:\/\//, "")}`, CX, 199, "mono", 1.9, C.mute, { ls: .1, align: "middle" });
  ops.push({ k: "rect", x: 246, y: 163, w: 26, h: 26, fill: "#ffffff", stroke: C.line, sw: .2 });
  ops.push({ k: "image", src: "qr", x: 248, y: 165, w: 22, h: 22 });
  text("SCAN TO VERIFY", 259, 193, "mono", 1.6, "#ffffff", { ls: .3, align: "middle" });

  if (d.stamp) {
    const label = "SAMPLE";
    const size = 26, ls = size * .12, deg = -14;
    const w = width(label, "sans600", size, ls), th = (deg * Math.PI) / 180;
    const x = CX - Math.cos(th) * w / 2 - Math.sin(th) * size * .36, y = 104 - Math.sin(th) * w / 2 + Math.cos(th) * size * .36;
    ops.push({ k: "text", x: r2(x), y: r2(y), text: label, font: "sans600", size, color: C.red, ls, rotate: deg, opacity: .16 });
  }
  return ops;
}
