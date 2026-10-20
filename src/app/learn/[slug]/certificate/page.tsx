import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ClaimDetails } from "@/components/claim-details";
import { certificatePreview } from "@/app/cert-preview";
import { requireUser } from "@/lib/auth";
import { courseState } from "@/lib/learning";
import { coveredByCompany } from "@/lib/certs";
import { mpesaAvailable, quote } from "@/lib/paystack";
import { usd, wa } from "@/lib/site";

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
  const preview = await certificatePreview(slug, profile.full_name ?? "", profile.id_number ?? "");

  return (
    <AppShell active="dashboard" wide>
      <div className="learn-head">
        <Link href={`/learn/${slug}`} className="crumb crumb--dark"><Icon name="back" width={16} />{s.course.title}</Link>
        <span className="eyebrow">You passed with {s.bestScore}%</span>
        <h1>Claim your certificate</h1>
      </div>

      <ClaimDetails slug={slug} initial={preview} name={profile.full_name ?? ""} idNumber={profile.id_number ?? ""}>

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
      </ClaimDetails>
    </AppShell>
  );
}
