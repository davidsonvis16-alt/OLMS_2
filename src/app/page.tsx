import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icons";
import { CertificateView } from "@/components/certificate";
import { EnquiryForm, Reveal, VerifyForm } from "@/components/forms";
import { HoverPics, Thermo } from "@/components/home-client";
import { supabaseAdmin } from "@/lib/supabase";
import { SITE, catLabel, coursePhoto, wa } from "@/lib/site";

export const dynamic = "force-dynamic"; // the header is per-user, so these pages are never cached

type Row = { title: string; slug: string; category: string; categories: string[] | null; summary: string | null; modules: { count: number }[]; questions: { count: number }[] };

async function getCourses(): Promise<Row[]> {
  try {
    const { data } = await supabaseAdmin().from("courses")
      .select("title,slug,category,categories,summary,modules(count),questions(count)")
      .eq("published", true).order("sort");
    return (data ?? []) as unknown as Row[];
  } catch { return []; }
}

const n = (x: { count: number }[] | undefined) => x?.[0]?.count ?? 0;
const pad = (i: number) => String(i + 1).padStart(2, "0");
const plural = (k: number, w: string) => `${k} ${w}${k === 1 ? "" : "s"}`;
const cats = (c: Row) => [...new Set([c.category, ...(c.categories ?? [])])].map(catLabel).join(" / ");

const FAQ = [
  ["Is it really free to learn?", "Yes. Every module, slide and knowledge check is free. You only pay if you pass the final assessment and want your certificate."],
  ["What do I need to pass?", `Score ${SITE.passMark}% or more on the final assessment. If you fall short, review the modules and try again. There is no limit on retakes.`],
  ["How do I pay for my certificate?", "Pay by M-Pesa in KES, or by Visa or Mastercard in USD. Your certificate is issued as soon as the payment is confirmed."],
  ["How does an employer check a certificate?", "Every certificate carries a unique number and a QR code. Scan it, or enter the number on our Verify page, and it is checked against our records."],
  ["Can I train my whole team?", "Yes. A company account gives your staff access to every course, with certificates included while the account is active, and a dashboard showing who has passed."],
  ["Do you train on-site?", "We do. We run group training, hygiene audits and HACCP support at hotels, restaurants and food premises. Message us on WhatsApp to book."],
] as const;

export default async function Home() {
  const courses = await getCourses();
  const count = courses.length;
  return (
    <>
      <SiteHeader current="home" stage />
      <main id="main">
        {/* THE STAGE */}
        <section className="stage" aria-labelledby="hero-title">
          <div className="wrap">
            <div className="stage-top">
              <p className="micro"><b>{SITE.name}</b><br />Food safety · Hygiene · Health &amp; safety</p>
              <p className="micro">Online training for the<br />hospitality &amp; food industry</p>
              <p className="micro">Kenya<br />Learn free · {SITE.passMark}% to pass</p>
            </div>
            <h1 className="headline" id="hero-title">
              <span className="sr-only">Safer people. Stronger industries.</span>
              <span className="l1" aria-hidden="true">Safer pe<span className="lens lens--dial"><img src="/photos/thermometer.jpg" alt="" /></span>ple.</span>
              <span className="l2" aria-hidden="true">Stronger industries<span className="gtext">.</span></span>
            </h1>
            <div className="stage-base">
              <div className="stage-name">
                <b>Aspire Safety &amp;<br />Hygiene Solutions</b>
                <span className="motto">Value, Quality &amp; Service.</span>
              </div>
              <dl className="stage-facts">
                <div><dt className="micro">Courses</dt><dd style={{ margin: 0 }}><b>{count > 0 ? `${count} online courses` : "Courses coming soon"}</b></dd></div>
                <div><dt className="micro">To learn</dt><dd style={{ margin: 0 }}><b>Free, every module</b></dd></div>
                <div><dt className="micro">To pass</dt><dd style={{ margin: 0 }}><b>{SITE.passMark}% on the final assessment</b></dd></div>
                <div><dt className="micro">To prove it</dt><dd style={{ margin: 0 }}><b>Numbered, QR-verified certificate</b></dd></div>
              </dl>
              <div className="stage-cta">
                <Link className="cta" href="/courses"><span>Explore training</span><i><Icon name="arrow" /></i></Link>
                <Link className="link" href="/business">Train my team <Icon name="arrow" /></Link>
              </div>
            </div>
          </div>
          {count > 0 && (
            <div className="ticker" aria-hidden="true">
              <ul>{[...courses, ...courses].map((c, i) => <li key={i}><b>{pad(i % count)}</b>{c.title}</li>)}</ul>
            </div>
          )}
        </section>

        {/* 01 STATEMENT */}
        <section className="sec" aria-label="About Aspire">
          <div className="wrap statement">
            <span className="micro">(01) Who we train</span>
            <p className="rv">We train the people who cook, serve, clean and care, so that every plate leaves the kitchen <em>safe</em>, and every worker goes home safe too. Then we prove it, with a certificate anyone can check. <span className="motto">Value, Quality &amp; Service.</span></p>
            <div className="statement-foot">
              <div className="rv"><span className="idx">A</span><b>Learn online</b><p>Short slide lessons and a knowledge check after every module, on any phone.</p></div>
              <div className="rv rv-d1"><span className="idx">B</span><b>Train on site</b><p>Group training, hygiene audits and HACCP support at your premises.</p></div>
              <div className="rv rv-d2"><span className="idx">C</span><b>Prove it</b><p>Numbered certificates with a QR code that checks against our records.</p></div>
            </div>
          </div>
        </section>

        {/* 02 COURSES */}
        <section className="sec" style={{ paddingTop: 0 }} aria-labelledby="courses-title">
          <div className="wrap">
            <div className="sec-head">
              <span className="micro">(02) The courses</span>
              <h2 className="h-xl" id="courses-title"><span className="sr-only">Courses</span><span aria-hidden="true">C<span className="lens"><img src="/photos/hands.jpg" alt="" /></span>urses</span></h2>
              <p className="lede">Free to study. A knowledge check after every module, a final assessment at {SITE.passMark}%, and a certificate when you pass.</p>
            </div>
            {count === 0 ? (
              <p className="empty-card">Courses are being prepared. <a className="text-link" href="#contact">Contact us</a> in the meantime.</p>
            ) : (
              <div className="cindex">
                {courses.map((c, i) => (
                  <Link key={c.slug} href={`/courses/${c.slug}`} className={`crow${i === 0 ? " crow--feature" : ""}`} data-pic={coursePhoto(c.slug, c.category)}>
                    <span className="crow-n">{pad(i)}</span>
                    <span>{i === 0 && <span className="crow-tag">Featured</span>}<span className="crow-t" style={{ display: "block" }}>{c.title}</span></span>
                    <span className="crow-c">{cats(c)}</span>
                    <span className="crow-m">{plural(n(c.modules), "module")}<br />{plural(n(c.questions), "question")}</span>
                    <span className="crow-go"><Icon name="arrow" /></span>
                  </Link>
                ))}
              </div>
            )}
            <div className="row" style={{ marginTop: 32, justifyContent: "space-between" }}>
              <span className="micro">Every course: free to learn · certificate on passing</span>
              <Link className="link" href="/courses">Full catalogue with filters <Icon name="arrow" /></Link>
            </div>
          </div>
          <HoverPics />
        </section>

        {/* 03 THERMO */}
        <section className="sec sec--navy" aria-label="Interactive temperature scale">
          <div className="wrap"><Thermo /></div>
        </section>

        {/* 04 HOW */}
        <section className="sec" aria-labelledby="how-title">
          <div className="wrap">
            <div className="sec-head">
              <span className="micro">(04) How it works</span>
              <h2 className="h-l" id="how-title">From the first slide<br />to a framed certificate.</h2>
            </div>
            <ol className="ruler-steps">
              <li className="rv"><span className="n">01</span><h3>Create a free account</h3><p>No card needed. Start any course straight away.</p></li>
              <li className="rv rv-d1"><span className="n">02</span><h3>Study the modules</h3><p>Slide lessons with a short knowledge check after each one.</p></li>
              <li className="rv rv-d2"><span className="n">03</span><h3>Pass at {SITE.passMark}%</h3><p>Take the final assessment. Retake it as often as you need.</p></li>
              <li className="rv rv-d3"><span className="n">04</span><h3>Get your certificate</h3><p>Pay by M-Pesa or card, then download it, numbered and QR-verified.</p></li>
            </ol>
          </div>
        </section>

        {/* 05 CERTIFICATE */}
        <section className="sec sec--bone" id="certificates" aria-labelledby="cert-title">
          <div className="wrap certshow">
            <div className="certshow-doc rv">
              <span className="pin" style={{ right: "4%", top: "6%" }}>A</span>
              <span className="pin" style={{ left: "21%", top: "45%" }}>B</span>
              <span className="pin" style={{ left: "5%", bottom: "16%" }}>C</span>
              <span className="pin" style={{ right: "2.5%", bottom: "28%" }}>D</span>
              <CertificateView c={{ serial: "ASH-2026-SAMPLE", fullName: "Learner Full Name", idNumber: "••••••••", course: "HACCP Principles", modules: ["Food safety fundamentals", "Introduction to HACCP", "Prerequisites & the HACCP team", "Hazard analysis", "Critical control points", "Monitoring & records"], score: 92, issuedAt: new Date(), sample: true }} />
            </div>
            <div className="certshow-side">
              <span className="micro">(05) The certificate</span>
              <h2 className="h-m" id="cert-title" style={{ margin: "18px 0 32px" }}>Checked by an inspector in seconds.</h2>
              <ol className="callouts">
                <li><span className="k">A</span><div><b>A unique serial number</b><span>Issued once, never reused.</span></div></li>
                <li><span className="k">B</span><div><b>Personal to the learner</b><span>Full name and ID or passport number, the course and its modules.</span></div></li>
                <li><span className="k">C</span><div><b>Signed by Aspire</b><span>With the final mark and date of issue.</span></div></li>
                <li><span className="k">D</span><div><b>A QR code</b><span>Scan it to open the live record on our Verify page.</span></div></li>
              </ol>
              <span className="micro" style={{ marginBottom: 10 }} id="verify">Verify a certificate</span>
              <VerifyForm />
            </div>
          </div>
        </section>

        {/* 06 TEAMS */}
        <section className="sec" aria-labelledby="team-title">
          <div className="wrap split">
            <figure className="split-pic rv" style={{ margin: 0 }}>
              <img src="/photos/team.jpg" alt="Three kitchen staff in whites, aprons and face masks" loading="lazy" />
              <figcaption className="micro">For hotels, restaurants &amp; caterers</figcaption>
            </figure>
            <div className="split-copy">
              <div>
                <span className="micro">(06) For employers</span>
                <h2 className="h-l" id="team-title" style={{ marginTop: 18 }}>Train the whole kitchen.</h2>
                <p className="lede">A company account gives your staff every course. You see who has started, who has passed, and every certificate carries your company name.</p>
              </div>
              <ul className="ticks">
                <li><b>One invite link</b><span>Staff join in a tap, straight from WhatsApp.</span></li>
                <li><b>Certificates included</b><span>No extra cost for staff while your account is active.</span></li>
                <li><b>Progress per person</b><span>Modules completed and certificates earned, in one table.</span></li>
              </ul>
              <div className="row">
                <Link className="btn btn--ink btn--lg" href="/business">Company accounts <Icon name="arrow" /></Link>
                <a className="btn btn--line btn--lg" href={wa("Hello Aspire, I'd like to book on-site training for my team.")} target="_blank" rel="noopener">Book on-site training</a>
              </div>
            </div>
          </div>
        </section>

        {/* 07 SERVICES */}
        <section className="sec sec--bone" id="about" aria-labelledby="services-title">
          <div className="wrap">
            <div className="sec-head">
              <span className="micro">(07) Beyond the screen</span>
              <h2 className="h-l" id="services-title">More than courses.<br />A partner for compliance.</h2>
            </div>
            <div className="svc">
              <ul className="svc-list">
                <li><Link href="/courses?c=food-safety"><span className="idx">01</span><div><h3>Food safety training</h3><p>Food hygiene for handlers, HACCP principles and allergen awareness that stop food poisoning before it starts.</p></div><Icon name="arrow" /></Link></li>
                <li><Link href="/courses?c=health-safety"><span className="idx">02</span><div><h3>Health &amp; safety</h3><p>Occupational safety, fire safety and fire marshal training for busy kitchens and hotels.</p></div><Icon name="arrow" /></Link></li>
                <li><a href="#contact"><span className="idx">03</span><div><h3>Audits &amp; consultancy</h3><p>Hygiene audits, HACCP plan development, pest control and cleaning reviews of your premises and records.</p></div><Icon name="arrow" /></a></li>
                <li><Link href="/business"><span className="idx">04</span><div><h3>Hospitality solutions</h3><p>Standards, induction programmes and staff development for hotels, lodges, restaurants and caterers.</p></div><Icon name="arrow" /></Link></li>
              </ul>
              <aside className="award rv">
                <figure>
                  <img src="/brand/certificate-gold.jpg" alt="Framed Aspire Food Hygiene Training Standards Gold award" loading="lazy" width={1164} height={1400} />
                </figure>
                <span className="micro" style={{ marginTop: 16 }}>On the wall</span>
                <p>Businesses that train with Aspire can display the Aspire Food Hygiene Training Standards award for customers and inspectors.</p>
              </aside>
            </div>
          </div>
        </section>

        {/* 08 FAQ */}
        <section className="sec" aria-labelledby="faq-title">
          <div className="wrap faq">
            <header>
              <span className="micro">(08) Questions</span>
              <h2 className="h-l" id="faq-title" style={{ marginTop: 18 }}>Asked &amp; answered.</h2>
              <p className="muted" style={{ marginTop: 20 }}>Something else? <a className="text-link" href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener">Message us on WhatsApp</a> and a person will reply.</p>
            </header>
            <div className="faq-list">
              {FAQ.map(([q, a], i) => (
                <details key={q} open={i === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 09 CONTACT */}
        <section className="sec sec--bone" id="contact" aria-labelledby="contact-title">
          <div className="wrap contact">
            <div className="contact-copy">
              <span className="micro">(09) Contact</span>
              <h2 className="h-l" id="contact-title" style={{ marginTop: 18 }}>Let&apos;s train your team.</h2>
              <p className="lede" style={{ marginTop: 20 }}>Tell us what your business does and how many people need training. We&apos;ll come back with a plan.</p>
              <div className="contact-lines">
                <a href={SITE.phoneHref}><span className="micro">Call</span><b>{SITE.phone}</b></a>
                <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener"><span className="micro">WhatsApp</span><b>{SITE.phone}</b></a>
                <a href={`mailto:${SITE.email}`}><span className="micro">Email</span><b>{SITE.email}</b></a>
                {SITE.websites.map((w) => <a key={w.href} href={w.href} target="_blank" rel="noopener"><span className="micro">Website</span><b>{w.label}</b></a>)}
              </div>
            </div>
            <div className="contact-form form-card">
              <h3>Send an enquiry</h3>
              <p>Fill this in, then send it by WhatsApp or email, whichever suits you.</p>
              <EnquiryForm courses={courses.map((c) => c.title)} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <Reveal />
    </>
  );
}
