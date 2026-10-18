import QRCode from "qrcode";
import { SITE } from "@/lib/site";
import { measuringFonts, type FontKey } from "@/lib/cert-fonts";
import { C, LIGA, PAGE, layoutCertificate, type Op } from "@/lib/cert-layout";

export type CertData = {
  serial: string; fullName: string; idNumber: string; course: string; modules: string[]; score: number; issuedAt: string | Date;
  companyName?: string | null; sample?: boolean;
};

export function verifyUrl(serial: string) {
  return `${SITE.url.replace(/\/$/, "")}/verify/${encodeURIComponent(serial)}`;
}

const FACE: Record<FontKey, React.CSSProperties> = {
  sans500: { fontFamily: "var(--f-sans)", fontWeight: 500 },
  sans600: { fontFamily: "var(--f-sans)", fontWeight: 600 },
  serif: { fontFamily: "var(--f-serif)", fontWeight: 400 },
  serifI: { fontFamily: "var(--f-serif)", fontWeight: 400, fontStyle: "italic" },
  serif600: { fontFamily: "var(--f-serif)", fontWeight: 600 },
  mono: { fontFamily: "var(--f-mono)", fontWeight: 500 },
};

/** The certificate on screen. Same layout, fonts and measurements as the downloadable PDF. */
export async function CertificateView({ c }: { c: CertData; tilt?: boolean }) {
  const url = verifyUrl(c.serial);
  const [fonts, qr] = await Promise.all([
    measuringFonts(),
    QRCode.toDataURL(url, { margin: 0, width: 320, errorCorrectionLevel: "M", color: { dark: C.ink, light: "#ffffff" } }),
  ]);
  const ops = layoutCertificate({ ...c, verifyUrl: url, stamp: c.sample ? "sample" : null }, fonts);
  const src = { logo: "/brand/logo-light.png", signature: "/brand/signature.png", qr };
  const label = `${c.sample ? "Sample " : ""}Aspire certificate of achievement: ${c.fullName}, ${c.course}, final mark ${c.score}%, certificate number ${c.serial}`;
  return (
    <div className="cert-stage">
      <svg className="cert" viewBox={`0 0 ${PAGE.w} ${PAGE.h}`} role="img" aria-label={label} textRendering="geometricPrecision">
        {ops.map((o, i) => draw(o, i, src))}
      </svg>
    </div>
  );
}

function draw(o: Op, i: number, src: Record<"logo" | "signature" | "qr", string>) {
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
