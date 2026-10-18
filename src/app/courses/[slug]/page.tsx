import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icons";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { SITE, catLabel, coursePhoto, pagesOf, usd } from "@/lib/site";
import { enrol } from "@/app/actions";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const { data } = await supabaseAdmin().from("courses")
    .select("*, modules(id,position,title,page_from,page_to,extra_pages,video_url), questions(count)")
    .eq("slug", slug).eq("published", true).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await load((await params).slug);
  return c ? { title: c.title, description: c.summary ?? undefined } : {};
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const c = await load(slug);
  if (!c) notFound();
  const modules = [...(c.modules ?? [])].sort((a, b) => a.position - b.position);
  const { user } = await getSession();
  let enrolled = false;
  if (user) {
    const { data } = await supabaseAdmin().from("enrollments").select("course_id").eq("user_id", user.id).eq("course_id", c.id).maybeSingle();
    enrolled = !!data;
  }
  const slides = c.slide_count > 0 ? modules.reduce((n, m) => n + pagesOf(m).length, 0) : 0;
  const qCount = c.questions?.[0]?.count ?? 0;
  const price = c.certificate_price_usd != null ? usd(c.certificate_price_usd) : "On request";
  const cats = [...new Set([c.category, ...(c.categories ?? [])])].map(catLabel).join(" / ");

  const start = (block?: boolean) => (
    <form action={enrol}>
      <input type="hidden" name="slug" value={c.slug} />
      {enrolled
        ? <Link className={`cta${block ? " cta--block" : ""}`} href={`/learn/${c.slug}`}><span>Continue learning</span><i><Icon name="arrow" /></i></Link>
        : <button className={`cta${block ? " cta--block" : ""}`} type="submit"><span>{user ? "Start this course, free" : "Sign up & start free"}</span><i><Icon name="arrow" /></i></button>}
    </form>
  );

  return (
    <>
      <SiteHeader current="courses" />
      <main id="main">
        <section className="wrap ptop">
          <Link href="/courses" className="crumb"><Icon name="back" />All courses</Link>
          <div className="chero">
            <div className="chero-copy">
              <span className="micro">{cats}</span>
              <h1 className="h-l">{c.title}</h1>
              {c.summary && <p className="lede">{c.summary}</p>}
              {start()}
            </div>
            <figure className="chero-pic"><img src={coursePhoto(c.slug, c.category)} alt="" /></figure>
          </div>
          <dl className="spec">
            <div><dt>Modules</dt><dd>{modules.length}</dd></div>
            <div><dt>Slides</dt><dd>{slides > 0 ? slides : <small style={{ marginLeft: 0 }}>Being uploaded</small>}</dd></div>
            <div><dt>Knowledge-check questions</dt><dd>{qCount}</dd></div>
            <div><dt>Pass mark</dt><dd>{SITE.passMark}<small>%</small></dd></div>
            <div><dt>Retakes</dt><dd>Unlimited</dd></div>
          </dl>
        </section>

        <section className="sec" style={{ paddingTop: "clamp(48px, 6vw, 96px)" }}>
          <div className="wrap cdetail">
            <div className="cdetail-main">
              {c.topics?.length > 0 && (
                <>
                  <span className="micro" style={{ marginBottom: 14 }}>What you&apos;ll learn</span>
                  <ul className="learn-list">{c.topics.map((t: string) => <li key={t}>{t}</li>)}</ul>
                </>
              )}
              <span className="micro" style={{ margin: "64px 0 14px" }}>The modules</span>
              <ol className="mod-list">
                {modules.map((m, i) => (
                  <li key={m.id}>
                    <span className="n">{String(i + 1).padStart(2, "0")}</span>
                    <b>{m.title}</b>
                    <small>{c.slide_count > 0 ? `${pagesOf(m).length} slides · ` : ""}{m.video_url ? "Video · " : ""}Knowledge check</small>
                  </li>
                ))}
                <li className="final"><span className="n">FA</span><b>Final assessment</b><small>All modules · {SITE.passMark}% to pass</small></li>
              </ol>
              {c.assignment && (
                <div className="assign" style={{ marginTop: 64 }}>
                  <span className="micro">Course assignment</span>
                  <p>{c.assignment}</p>
                </div>
              )}
            </div>
            <aside className="cdetail-side">
              <div className="fees">
                <header><span className="micro">Fees</span><span className="micro">USD</span></header>
                <dl>
                  <div><dt>Learning</dt><dd className="free">Free</dd></div>
                  <div><dt>Certificate</dt><dd>{price}</dd></div>
                </dl>
                <p>Pay only after you pass, by card or M-Pesa. Staff on an active company account get their certificate included.</p>
                {start(true)}
                <div className="foot"><Link className="text-link" href="/#certificates">See a sample certificate</Link></div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
