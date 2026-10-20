import { useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import Link from "@/components/link";
import { notFound } from "@/lib/server/http";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icons";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { SITE, catLabel, coursePhoto, pageTitle, pagesOf, usd } from "@/lib/site";
import { ConsultPromo } from "@/components/consult-promo";

async function load(slug: string) {
  const { data } = await supabaseAdmin().from("courses")
    .select("*, modules(id,position,title,page_from,page_to,extra_pages,video_url), questions(count)")
    .eq("slug", slug).eq("published", true).maybeSingle();
  return data;
}

export const meta = ({ loaderData }: MetaArgs<typeof loader>) =>
  loaderData ? [...pageTitle(loaderData.c.title), { name: "description", content: loaderData.c.summary ?? "" }] : pageTitle("Course");

export async function loader({ params }: LoaderFunctionArgs) {
  const c = await load(params.slug ?? "");
  if (!c) notFound();
  const modules = [...(c.modules ?? [])].sort((a, b) => a.position - b.position);
  const { user } = await getSession();
  const signedIn = !!user;
  let enrolled = false;
  if (user) {
    const { data } = await supabaseAdmin().from("enrollments").select("course_id").eq("user_id", user.id).eq("course_id", c.id).maybeSingle();
    enrolled = !!data;
  }
  const slides = c.slide_count > 0 ? modules.reduce((n, m) => n + pagesOf(m).length, 0) : 0;
  const qCount = c.questions?.[0]?.count ?? 0;
  const price = c.certificate_price_usd != null ? usd(c.certificate_price_usd) : "On request";
  const cats = [...new Set([c.category, ...(c.categories ?? [])])].map(catLabel).join(" / ");

  return { c, modules, signedIn, enrolled, slides, qCount, price, cats };
}

export default function CoursePage() {
  const { c, modules, signedIn, enrolled, slides, qCount, price, cats } = useLoaderData<typeof loader>();
  const start = (block?: boolean) => (
    <form method="post" action="/do/enrol">
      <input type="hidden" name="slug" value={c.slug} />
      {enrolled
        ? <Link className={`cta${block ? " cta--block" : ""}`} href={`/learn/${c.slug}`}><span>Continue learning</span><i><Icon name="arrow" /></i></Link>
        : <button className={`cta${block ? " cta--block" : ""}`} type="submit"><span>{signedIn ? "Start this course, free" : "Sign up & start free"}</span><i><Icon name="arrow" /></i></button>}
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
              <ConsultPromo title="Training a whole team?" text="We also help with kitchen planning, food safety accreditation and operational improvement." />
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
