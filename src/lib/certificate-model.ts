import { SITE } from "./site";
import { measuringFonts } from "./cert-fonts";
import { layoutCertificate, type Op } from "./cert-layout";
import { qrShape, type QrShape } from "./qr";

export type CertData = {
  serial: string; fullName: string; idNumber: string; course: string; modules: string[]; score: number; issuedAt: string | Date;
  companyName?: string | null; sample?: boolean;
};

/** A certificate laid out for the screen (by a loader), drawn by <CertificateView>. Same layout and fonts as the PDF. */
export type CertModel = { ops: Op[]; qr: QrShape; label: string };

export function verifyUrl(serial: string) {
  return `${SITE.url.replace(/\/$/, "")}/verify/${encodeURIComponent(serial)}`;
}

export async function certificateModel(c: CertData): Promise<CertModel> {
  const url = verifyUrl(c.serial);
  const ops = layoutCertificate({ ...c, verifyUrl: url, stamp: c.sample ? "sample" : null }, await measuringFonts());
  const label = `${c.sample ? "Sample " : ""}Aspire certificate of achievement: ${c.fullName}, ${c.course}, final mark ${c.score}%, certificate number ${c.serial}`;
  return { ops, qr: qrShape(url), label };
}
