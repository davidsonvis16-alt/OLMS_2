import Link from "next/link";
import type { Metadata } from "next";
import { AppShell, PageHead } from "@/components/app-shell";
import { CertificateView } from "@/components/certificate";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "My certificates" };

export default async function Certificates({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { user } = await requireUser("/certificates");
  const { new: fresh } = await searchParams;
  const { data } = await supabaseAdmin().from("certificates").select("*").eq("user_id", user.id).eq("revoked", false).order("issued_at", { ascending: false });
  const certs = data ?? [];
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
              <CertificateView tilt={false} c={{ serial: c.serial, fullName: c.full_name, idNumber: c.id_number, course: c.course_title, modules: c.modules, score: c.score, issuedAt: c.issued_at }} />
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
    </AppShell>
  );
}
