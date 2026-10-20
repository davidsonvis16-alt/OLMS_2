import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { CertificateView } from "@/components/certificate";
import { requireUser } from "@/lib/auth";
import { courseState } from "@/lib/learning";
import { coveredByCompany } from "@/lib/certs";
import { mpesaAvailable, quote } from "@/lib/paystack";
import { usd, wa } from "@/lib/site";
import { claimCertificate } from "@/app/pay-actions";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

export default async function ClaimPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { error } = await searchParams;
  const { user, profile } = await requireUser(`/learn/${slug}/certificate`);
  const s = await courseState(user.id, slug);
  if (!s) notFound();
  if (s.certificate) redirect(`/certificates?new=${s.certificate.serial}`);
  if (!s.passed) redirect(`/learn/${slug}`);
  const covered = await coveredByCompany(user.id);
  const price = s.course.certificate_price_usd;
  const free = covered || (price != null && Number(price) === 0);
  let kes: number | null = null;
  if (!free && price != null && mpesaAvailable()) kes = quote(Number(price), "mpesa").amount;

  return (
    <AppShell active="dashboard" wide>
      <div className="learn-head">
        <Link href={`/learn/${slug}`} className="crumb crumb--dark"><Icon name="back" width={16} />{s.course.title}</Link>
        <span className="eyebrow">You passed with {s.bestScore}%</span>
        <h1>Claim your certificate</h1>
      </div>

      <div className="claim">
        <div className="claim-preview">
          <CertificateView tilt={false} c={{ serial: "ASH-XXXX-XXXXXX", fullName: profile.full_name || "Your Full Name", idNumber: profile.id_number || "Your ID number", course: s.course.title, modules: s.modules.map((m) => m.title), score: s.bestScore ?? 0, issuedAt: new Date(), sample: true }} />
          <p className="muted small center">Preview. Your real certificate gets its own serial number and QR code.</p>
        </div>

        <form action={claimCertificate} className="form-card claim-form">
          <input type="hidden" name="slug" value={slug} />
          <h3>Your details on the certificate</h3>
          <p>These are printed exactly as you type them and can&apos;t be changed after the certificate is issued.</p>
          <div className="field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} required minLength={3} autoComplete="name" /></div>
          <div className="field"><label htmlFor="id_number">National ID or passport number</label><input id="id_number" name="id_number" defaultValue={profile.id_number ?? ""} required minLength={4} /></div>
          <label className="check"><input type="checkbox" name="confirm" required /> <span>My name and ID number are correct.</span></label>

          {error && <p className="alert alert--error" role="alert">{error}</p>}

          {free ? (
            <>
              <div className="price-box price-box--free"><span>{covered ? "Covered by your company account" : "Certificate"}</span><b>Free</b></div>
              <button className="btn btn--green btn--block" name="method" value="card"><Icon name="award" />Issue my certificate</button>
            </>
          ) : price == null ? (
            <>
              <p className="alert alert--info">The certificate fee for this course is being finalised. Message us and we&apos;ll sort it out.</p>
              <a className="btn btn--wa btn--block" href={wa(`Hello Aspire, I passed "${s.course.title}" and would like my certificate.`)} target="_blank" rel="noopener"><Icon name="whatsapp" />WhatsApp us</a>
            </>
          ) : (
            <>
              <div className="price-box"><span>Certificate fee</span><b>{usd(price)}</b></div>
              <div className="pay-buttons">
                <button className="btn btn--green btn--block" name="method" value="card"><Icon name="card" />Pay {usd(price)} by card</button>
                {kes != null && <button className="btn btn--mpesa btn--block" name="method" value="mpesa"><img src="/brand/mpesa.svg" alt="" data-hide-broken />Pay KES {kes.toLocaleString()} with M-Pesa</button>}
              </div>
              <div className="pay-logos" aria-label="Accepted payment methods">
                <img src="/brand/visa.svg" alt="Visa" /><img src="/brand/mastercard.svg" alt="Mastercard" />{kes != null && <img src="/brand/mpesa.svg" alt="M-Pesa" />}
              </div>
              <p className="muted small">Secure payment by Paystack. Your certificate is issued the moment payment is confirmed.</p>
            </>
          )}
        </form>
      </div>
    </AppShell>
  );
}
