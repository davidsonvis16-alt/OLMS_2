import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import Link from "@/components/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CertificateView } from "@/components/certificate";
import { VerifyForm } from "@/components/forms";
import { Icon } from "@/components/icons";
import { supabaseAdmin } from "@/lib/supabase";
import { certificateModel } from "@/lib/certificate-model";
import { SITE, maskId, pageTitle } from "@/lib/site";
import { clientIp, limit } from "@/lib/rate-limit";

export const meta = () => [...pageTitle("Certificate verification"), { name: "robots", content: "noindex" }];

export async function loader({ params, request }: LoaderFunctionArgs) {
  const serial = decodeURIComponent(params.serial ?? "").trim().toUpperCase();
  // Public lookups are rate limited per address, so serials can't be farmed.
  const allowed = await limit("verify", clientIp(request.headers));
  if (!allowed) return { allowed: false as const, serial };
  const { data: row } = /^[A-Z0-9-]{6,40}$/.test(serial)
    ? await supabaseAdmin().from("certificates").select("serial,full_name,id_number,course_title,modules,score,issued_at,revoked,company_name").eq("serial", serial).maybeSingle()
    : { data: null };
  // Only the partly hidden ID number ever leaves the server.
  const c = row ? { ...row, id_number: maskId(row.id_number) } : null;
  const valid = !!c && !c.revoked;
  const issued = c ? new Date(c.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const model = valid ? await certificateModel({ serial: c!.serial, fullName: c!.full_name, idNumber: c!.id_number, course: c!.course_title, modules: c!.modules, score: c!.score, issuedAt: c!.issued_at, companyName: c!.company_name }) : null;
  return { allowed: true as const, serial, c, valid, issued, model };
}

export default function VerifySerial() {
  const d = useLoaderData<typeof loader>();
  if (!d.allowed) {
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
  const { serial, c, valid, issued, model } = d;
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
              <CertificateView model={model!} />
              <dl className="verify-facts">
                <div><dt>Certificate No.</dt><dd className="mono">{c!.serial}</dd></div>
                <div><dt>Holder</dt><dd>{c!.full_name}</dd></div>
                <div><dt>ID / Passport</dt><dd className="mono">{c!.id_number}</dd></div>
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
