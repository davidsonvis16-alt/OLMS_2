import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import Link from "@/components/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CourseTabs } from "@/components/course-tabs";
import { Icon } from "@/components/icons";
import { supabaseAdmin } from "@/lib/supabase";
import { SITE, catLabel, coursePhoto, wa, usd, pageTitle } from "@/lib/site";

export const meta = () => pageTitle("Courses");

type C = { id: string; slug: string; title: string; category: string; categories: string[]; summary: string | null; topics: string[]; certificate_price_usd: number | null; modules: { count: number }[]; questions: { count: number }[] };

const n = (x: { count: number }[] | undefined) => x?.[0]?.count ?? 0;
const pad = (i: number) => String(i + 1).padStart(2, "0");

export async function loader(_: LoaderFunctionArgs) {
  const { data } = await supabaseAdmin().from("courses")
    .select("id,slug,title,category,categories,summary,topics,certificate_price_usd,modules(count),questions(count)")
    .eq("published", true).order("sort");
  const courses = (data ?? []) as unknown as C[];
  const counts: Record<string, number> = { all: courses.length };
  for (const c of courses) for (const k of new Set([c.category, ...c.categories])) counts[k] = (counts[k] ?? 0) + 1;

  return { courses, counts };
}

export default function CoursesPage() {
  const { courses, counts } = useLoaderData<typeof loader>();
  return (
    <>
      <SiteHeader current="courses" />
      <main id="main">
        <section className="wrap ptop" aria-labelledby="courses-title">
          <div className="ptop-grid">
            <span className="micro">Catalogue · {courses.length} course{courses.length === 1 ? "" : "s"} · Free to learn</span>
            <h1 className="h-xl" id="courses-title"><span className="sr-only">Courses</span><span aria-hidden="true">C<span className="lens"><img src="/photos/plating.jpg" alt="" /></span>urses</span></h1>
            <div className="ptop-aside">
              <p className="lede">Every course is free to study. Each one ends with a final assessment ({SITE.passMark}% to pass, unlimited retakes) and a numbered, QR-verified Aspire certificate.</p>
            </div>
          </div>
        </section>

        <Suspense>
          <CourseTabs counts={counts}>
            <section className="wrap" aria-label="Courses" style={{ paddingTop: 40, paddingBottom: 96 }}>
              <ol className="cat-list" data-courses>
                {courses.map((c, i) => {
                  const mods = n(c.modules);
                  return (
                    <li key={c.id} className={`cat${i === 0 ? " cat--feature" : ""}`} data-cats={[c.category, ...c.categories].join(" ")}>
                      <span className="cat-n">{pad(i)}</span>
                      <div className="cat-pic"><img src={coursePhoto(c.slug, c.category)} alt="" loading={i < 3 ? "eager" : "lazy"} /></div>
                      <div className="cat-body">
                        <span className="micro" style={{ marginBottom: 12 }}>{[...new Set([c.category, ...c.categories])].map(catLabel).join(" / ")}</span>
                        <h2><Link href={`/courses/${c.slug}`}>{c.title}</Link></h2>
                        {c.summary && <p>{c.summary}</p>}
                        {c.topics?.length > 0 && <ul className="cat-topics">{c.topics.slice(0, 3).map((t) => <li key={t}>{t}</li>)}</ul>}
                      </div>
                      <dl className="cat-spec">
                        <div><dt>Modules</dt><dd>{mods}</dd></div>
                        <div><dt>Questions</dt><dd>{n(c.questions)}</dd></div>
                        <div><dt>Learning</dt><dd className="gtext">Free</dd></div>
                        <div><dt>Certificate</dt><dd>{c.certificate_price_usd != null ? usd(c.certificate_price_usd) : "Price on request"}</dd></div>
                        <div className="go" style={{ border: 0 }}><span className="link" aria-hidden="true">View course <Icon name="arrow" /></span></div>
                      </dl>
                    </li>
                  );
                })}
              </ol>
              {courses.length === 0 && <p className="empty-line is-visible">Courses are being prepared. <a className="text-link" href="#book">Contact us</a> in the meantime.</p>}
              {courses.length > 0 && <p className="empty-line" data-empty>No courses in this category yet. <a className="text-link" href="#book">Ask us</a> about tailored training.</p>}
            </section>
          </CourseTabs>
        </Suspense>

        <section className="sec sec--night" id="book" aria-labelledby="book-title">
          <div className="wrap band">
            <div className="band-l">
              <span className="micro" style={{ color: "rgba(255,255,255,.5)" }}>For businesses</span>
              <h2 className="h-l" id="book-title" style={{ marginTop: 18 }}>Training a whole team?</h2>
            </div>
            <div className="band-r">
              <p className="lede" style={{ color: "rgba(255,255,255,.75)" }}>Open a company account so your staff learn online under your business, or have us train your team at your premises.</p>
              <div className="row" style={{ marginTop: 28 }}>
                <Link className="btn btn--go btn--lg" href="/business">Company accounts <Icon name="arrow" /></Link>
                <a className="btn btn--ghost btn--lg" href={wa("Hello Aspire, I'd like to book training for my team.")} target="_blank" rel="noopener">WhatsApp us</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
