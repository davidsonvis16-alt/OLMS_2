import QRCode from "qrcode";
import { SITE } from "@/lib/site";
import { measuringFonts } from "@/lib/cert-fonts";
import { C, layoutCertificate } from "@/lib/cert-layout";
import { CertSvg } from "./cert-svg";

export type CertData = {
  serial: string; fullName: string; idNumber: string; course: string; modules: string[]; score: number; issuedAt: string | Date;
  companyName?: string | null; sample?: boolean;
};

export function verifyUrl(serial: string) {
  return `${SITE.url.replace(/\/$/, "")}/verify/${encodeURIComponent(serial)}`;
}



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
      <CertSvg ops={ops} src={src} label={label} />
    </div>
  );
}

