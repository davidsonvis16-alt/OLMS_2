import Link from "next/link";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { SITE } from "@/lib/site";

/** Shared layout for the Terms and Privacy pages: a contents list beside long-form text. */
export function LegalPage({ title, updated, intro, sections }: {
  title: string; updated: string; intro: React.ReactNode;
  sections: { id: string; title: string; body: React.ReactNode }[];
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap legal">
        <header className="legal-head">
          <span className="nh-eyebrow">{SITE.name}</span>
          <h1 className="h-l">{title}</h1>
          <p className="micro">Last updated {updated}</p>
          <div className="lede">{intro}</div>
        </header>
        <div className="legal-body">
          <nav className="legal-toc" aria-label="Contents">
            <span className="micro">Contents</span>
            <ol>{sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ol>
            <p className="micro" style={{ marginTop: 24 }}>See also: <Link href={title.startsWith("Privacy") ? "/terms" : "/privacy"}>{title.startsWith("Privacy") ? "Terms and Conditions" : "Privacy Policy"}</Link></p>
          </nav>
          <div className="legal-text">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id}>
                <h2><span className="mono">{String(i + 1).padStart(2, "0")}</span>{s.title}</h2>
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function Contact() {
  return <>email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call / WhatsApp <a href={SITE.phoneHref}>{SITE.phone}</a></>;
}
