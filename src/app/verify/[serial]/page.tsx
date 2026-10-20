import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CertificateView } from "@/components/certificate";
import { VerifyForm } from "@/components/forms";
import { Icon } from "@/components/icons";
import { supabaseAdmin } from "@/lib/supabase";
import { headers } from "next/headers";
import { SITE, maskId } from "@/lib/site";
import { clientIp, limit } from "@/lib/rate-limit";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.

export const metadata: Metadata = { title: "Certificate verification", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifySerial({ params }: { params: Promise<{ serial: string }> }) {
  const serial = decodeURIComponent((await params).serial).trim().toUpperCase();
  // Public lookups are rate limited per address, so serials can't be farmed.
  const allowed = await limit("verify", clientIp(await headers()));
  const { data: c } = allowed && /^[A-Z0-9-]{6,40}$/.test(serial)
    ? await supabaseAdmin().from("certificates").select("serial,full_name,id_number,course_title,modules,score,issued_at,revoked,company_name").eq("serial", serial).maybeSingle()
    : { data: null };
  if (!allowed) {
    return (
      <>
        <SiteHeader current="verify" />
        <main id="main" className="verify-page"><div className="wrap verify-card">
          <span className="micro">Certificate verification</span>
          <h1 className="h-l" style={{ marginTop: 16 }}>Too many checks.</h1>
          <p className="lede">Please wait a minute, then try again.</p>
        </div></main>
        <SiteFooter />
      </>
    );
  }
  const valid = !!c && !c.revoked;
  const issued = c ? new Date(c.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  return (
    <>
      <SiteHeader current="verify" />
      <main id="main" className="verify-page">
        <div className="wrap">
          <div className={`verdict ${valid ? "verdict--ok" : "verdict--bad"}`}>
            <span className="badge-ico"><Icon name={valid ? "check" : "close"} /></span>
            <div>
              <span className="eyebrow">{valid ? "Verified · on record" : c?.revoked ? "Revoked" : "Not found"} · <span className="mono">{serial}</span></span>
              <h1>{valid ? "This certificate is genuine." : c?.revoked ? "This certificate is no longer valid." : "We couldn't find that certificate."}</h1>
              <p>{valid
                ? <>Issued by {SITE.name} to <b>{c!.full_name}</b> for <b>{c!.course_title}</b> on {issued}, with a final mark of <b>{c!.score}%</b>.</>
                : c?.revoked ? <>Certificate {serial} was revoked by {SITE.name}. Contact us if you think this is a mistake.</>
                : <>No certificate has the number <b className="mono">{serial}</b>. Check the number and try again, or contact us.</>}
              </p>
            </div>
          </div>

          {valid && (
            <div className="verify-grid">
              <CertificateView c={{ serial: c!.serial, fullName: c!.full_name, idNumber: maskId(c!.id_number), course: c!.course_title, modules: c!.modules, score: c!.score, issuedAt: c!.issued_at, companyName: c!.company_name }} />
              <dl className="verify-facts">
                <div><dt>Certificate No.</dt><dd className="mono">{c!.serial}</dd></div>
                <div><dt>Holder</dt><dd>{c!.full_name}</dd></div>
                <div><dt>ID / Passport</dt><dd className="mono">{maskId(c!.id_number)}</dd></div>
                <div><dt>Course</dt><dd>{c!.course_title}</dd></div>
                <div><dt>Final mark</dt><dd>{c!.score}%</dd></div>
                <div><dt>Issued</dt><dd>{issued}</dd></div>
                {c!.company_name && <div><dt>Sponsored by</dt><dd>{c!.company_name}</dd></div>}
              </dl>
            </div>
          )}

          <div className="verify-again">
            <h2>Check another certificate</h2>
            <VerifyForm />
            <p className="muted small" style={{ marginTop: 16 }}>Questions? <Link className="text-link" href="/#contact">Contact {SITE.short}</Link></p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
