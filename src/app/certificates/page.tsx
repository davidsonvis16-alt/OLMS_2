import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import Link from "@/components/link";
import { AppShell, PageHead } from "@/components/app-shell";
import { CertificateView } from "@/components/certificate";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { certificateModel } from "@/lib/certificate-model";
import { SITE, pageTitle } from "@/lib/site";
import { ConsultPromo } from "@/components/consult-promo";

export const meta = () => pageTitle("My certificates");

export async function loader({ request }: LoaderFunctionArgs) {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams) as Record<string, string | undefined>;
  const { user } = await requireUser("/certificates");
  const fresh = searchParams.new ?? null;
  const { data } = await supabaseAdmin().from("certificates").select("id,serial,full_name,id_number,course_title,modules,score,issued_at").eq("user_id", user.id).eq("revoked", false).order("issued_at", { ascending: false });
  const certs = await Promise.all((data ?? []).map(async (c) => ({
    id: c.id, serial: c.serial, course_title: c.course_title, issued_at: c.issued_at,
    model: await certificateModel({ serial: c.serial, fullName: c.full_name, idNumber: c.id_number, course: c.course_title, modules: c.modules, score: c.score, issuedAt: c.issued_at }),
  })));
  return { fresh, certs };
}

export default function Certificates() {
  const { fresh, certs } = useLoaderData<typeof loader>();
  return (
    <AppShell active="certificates" wide>
      <PageHead eyebrow="Achievements" title="My certificates" />
      {fresh && certs.some((c) => c.serial === fresh) && (
        <div className="alert alert--ok row-alert celebrate"><Icon name="award" /><span><b>Congratulations!</b> Your certificate {fresh} has been issued. Download it below or share the verification link.</span></div>
      )}
      {certs.length === 0 ? (
        <div className="empty-card">
          <Icon name="award" />
          <h3>No certificates yet</h3>
          <p>Pass a course&apos;s final assessment ({SITE.passMark}% or more) to earn your first one.</p>
          <Link className="btn btn--green" href="/dashboard">Go to my courses</Link>
        </div>
      ) : (
        <div className="cert-list">
          {certs.map((c) => (
            <article key={c.id} className={`cert-item${c.serial === fresh ? " is-new" : ""}`}>
              <CertificateView model={c.model} />
              <div className="cert-actions">
                <div><b>{c.course_title}</b><small>{c.serial} · {new Date(c.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</small></div>
                <div className="row-btns">
                  <a className="btn btn--green btn--sm" href={`/api/certificate/${c.serial}`} target="_blank" rel="noopener"><Icon name="download" />Download PDF</a>
                  <Link className="btn btn--outline btn--sm" href={`/verify/${c.serial}`}><Icon name="shield" />Verification page</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <ConsultPromo title="Want your whole workplace up to this standard?" text="Book an Aspire consultation: hygiene audits, HACCP support and training for every member of staff." />
    </AppShell>
  );
}
