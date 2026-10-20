import type { CertModel } from "@/lib/certificate-model";
import { CertSvg } from "./cert-svg";

/** The certificate on screen, from a model made by certificateModel() in the page's loader. */
export function CertificateView({ model }: { model: CertModel; tilt?: boolean }) {
  return (
    <div className="cert-stage">
      <CertSvg {...model} />
    </div>
  );
}
