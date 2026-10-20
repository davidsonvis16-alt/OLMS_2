import type { FontKey } from "@/lib/cert-fonts";
import { LIGA, PAGE, type Op } from "@/lib/cert-layout";

/** Draws a laid-out certificate (see layoutCertificate) as SVG. No server code, so live previews can use it too. */
const FACE: Record<FontKey, React.CSSProperties> = {
  sans500: { fontFamily: "var(--f-sans)", fontWeight: 500 },
  sans600: { fontFamily: "var(--f-sans)", fontWeight: 600 },
  serif: { fontFamily: "var(--f-serif)", fontWeight: 400 },
  serifI: { fontFamily: "var(--f-serif)", fontWeight: 400, fontStyle: "italic" },
  serif600: { fontFamily: "var(--f-serif)", fontWeight: 600 },
  mono: { fontFamily: "var(--f-mono)", fontWeight: 500 },
};

export type CertSrc = Record<"logo" | "signature" | "qr", string>;

export function CertSvg({ ops, src, label }: { ops: Op[]; src: CertSrc; label: string }) {
  return (
    <svg className="cert" viewBox={`0 0 ${PAGE.w} ${PAGE.h}`} role="img" aria-label={label} textRendering="geometricPrecision">
      {ops.map((o, i) => draw(o, i, src))}
    </svg>
  );
}

function draw(o: Op, i: number, src: CertSrc) {
  switch (o.k) {
    case "rect": return <rect key={i} x={o.x} y={o.y} width={o.w} height={o.h} fill={o.fill ?? "none"} stroke={o.stroke} strokeWidth={o.sw} opacity={o.opacity} />;
    case "line": return <line key={i} x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke={o.stroke} strokeWidth={o.sw} opacity={o.opacity} />;
    case "circle": return <circle key={i} cx={o.cx} cy={o.cy} r={o.r} fill={o.fill ?? "none"} stroke={o.stroke} strokeWidth={o.sw} opacity={o.opacity} />;
    case "path": return <path key={i} d={o.d} fill={o.fill ?? "none"} stroke={o.stroke} strokeWidth={o.sw} opacity={o.opacity} />;
    case "image": return <image key={i} href={src[o.src]} x={o.x} y={o.y} width={o.w} height={o.h} preserveAspectRatio="xMidYMid meet" style={o.src === "qr" ? { imageRendering: "pixelated" } : undefined} />;
    case "text": return (
      <text key={i} x={o.x} y={o.y} fontSize={o.size} fill={o.color} letterSpacing={o.ls || undefined} opacity={o.opacity}
        transform={o.rotate ? `rotate(${o.rotate} ${o.x} ${o.y})` : undefined} style={{ ...FACE[o.font], whiteSpace: "pre", fontVariantLigatures: "none", fontKerning: LIGA.test(o.text) ? "none" : "normal" }}>{o.text}</text>
    );
  }
}
