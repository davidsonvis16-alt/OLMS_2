import { useLoaderData } from "react-router";
import Link from "@/components/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icons";
import { CertificateView } from "@/components/certificate";
import { EnquiryForm, Reveal, VerifyForm } from "@/components/forms";
import { HoverPics, Thermo } from "@/components/home-client";
import { CONSULTANCY } from "@/lib/consultancy";
import { supabaseAdmin } from "@/lib/supabase";
import { certificateModel } from "@/lib/certificate-model";
import { SITE, catLabel, coursePhoto, wa } from "@/lib/site";

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

export async function loader() {
  const [courses, sample] = await Promise.all([getCourses(), certificateModel({ serial: "ASH-2026-SAMPLE", fullName: "Learner Full Name", idNumber: "••••••••", course: "HACCP Principles", modules: ["Food safety fundamentals", "Introduction to HACCP", "Prerequisites & the HACCP team", "Hazard analysis", "Critical control points", "Monitoring & records"], score: 92, issuedAt: new Date(), sample: true })]);
  return { courses, sample };
}

export default function Home() {
  const { courses, sample } = useLoaderData<typeof loader>();
  const count = courses.length;
  return (
    <>
      <SiteHeader current="home" stage />
      <main id="main">
        {/* HERO */}
        <section className="nh-hero" aria-labelledby="hero-title">
          <div className="nh-hero-pic" aria-hidden="true"><img src="/photos/prep.jpg" alt="" /></div>
          <div className="wrap nh-hero-in">
            <span className="nh-eyebrow">Food safety, hygiene &amp; health and safety training · Kenya</span>
            <h1 id="hero-title" className="nh-title"><span className="sr-only">Safe food, happy customers &amp; industry compliant.</span><span aria-hidden="true">Safe <span className="nowrap">f<span className="lens lens--dial"><img src="/photos/thermometer.jpg" alt="" /></span>od,</span><br />happy customers<br /><span className="nowrap">&amp; industry</span> compliant.</span></h1>
            <p className="nh-lede"><b>{SITE.name}</b> trains food handlers, kitchen and service teams, supervisors and managers online and on site, and proves it with a certificate anyone can check. <span className="motto">We give you value, quality &amp; service.</span></p>
            <div className="row nh-actions">
              <Link className="btn btn--go btn--lg" href="/courses">Explore training</Link>
              <Link className="btn btn--ghost btn--lg" href="/consultancy">Book a consultation <Icon name="arrow" /></Link>
            </div>
          </div>
          <div className="wrap">
            <dl className="nh-stats">
              <div><dt>{count > 0 ? count : "Free"}</dt><dd>{count > 0 ? "online courses, free to study" : "to learn, every module"}</dd></div>
              <div><dt>{SITE.passMark}%</dt><dd>pass mark, unlimited retakes</dd></div>
              <div><dt>QR-verified</dt><dd>numbered certificates</dd></div>
            </dl>
          </div>
        </section>

        <section className="wrap nh-cards" aria-label="What we do">
          {[
            ["/courses?c=food-safety", "/photos/training-room.jpg", "Food safety training"],
            ["/courses?c=health-safety", "/photos/flame.jpg", "Health & safety"],
            ["/consultancy", "/photos/team.jpg", "Consultancy & audits"],
          ].map(([href, img, label]) => (
            <Link key={label} href={href} className="nh-card"><img src={img} alt="" /><span>{label}</span></Link>
          ))}
        </section>

        {/* CONSULTANCY: prominent, straight after the hero */}
        <section className="sec nh-consult" aria-labelledby="consult-title">
          <div className="wrap">
            <div className="nh-consult-head">
              <div>
                <span className="nh-eyebrow">Consultancy</span>
                <h2 className="h-l" id="consult-title">Expert help for your kitchen.</h2>
              </div>
              <div>
                <p className="lede">Aspire helps you plan and ready your kitchen, build food safety systems that pass audits and accreditation, improve day-to-day operations, and design food service for hospitals.</p>
                <div className="row" style={{ marginTop: 22 }}>
                  <Link className="btn btn--go btn--lg" href="/consultancy#enquire">Book a consultation</Link>
                  <Link className="link" href="/consultancy">All consultancy services <Icon name="arrow" /></Link>
                </div>
              </div>
            </div>
            <div className="nh-ctiles">
              {CONSULTANCY.map((c, i) => (
                <Link key={c.id} href={`/consultancy#${c.id}`} className="nh-ctile">
                  <span className="nh-num">{String(i + 1).padStart(2, "0")}</span>
                  <b>{c.title}</b>
                  <small>{c.points.slice(0, 2).join(" · ")}</small>
                  <i aria-hidden="true">↗</i>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 01 VALUE */}
        <section className="sec" aria-labelledby="value-title">
          <div className="wrap nh-value">
            <span className="nh-eyebrow">Who we train</span>
            <h2 className="h-l" id="value-title">Training grounded in the reality<br />of the kitchen floor.</h2>
            <div className="nh-two">
              <p>We train the people who cook, serve, clean and care, so that every plate leaves the kitchen safe and every worker goes home safe too. Courses run on any phone, with short slide lessons and a knowledge check after every module.</p>
              <p>For businesses we add group training at your premises, hygiene audits and HACCP support, and a company account that shows exactly who has passed. Every certificate carries a unique number and a QR code.</p>
            </div>
          </div>
        </section>

        {/* 02 COURSES */}
        <section className="sec sec--bone" aria-labelledby="courses-title">
          <div className="wrap">
            <span className="nh-eyebrow">Online courses</span>
            <h2 className="h-l" id="courses-title">Explore our courses.</h2>
            <p className="lede" style={{ marginTop: 18 }}>Free to study. A final assessment at {SITE.passMark}% and a certificate when you pass.</p>
            {count === 0 ? (
              <div className="empty-card" style={{ marginTop: 40 }}><p>Courses are being prepared. <a className="text-link" href="#contact">Contact us</a> in the meantime.</p></div>
            ) : (
              <div className="nh-tiles">
                {courses.map((c) => (
                  <Link key={c.slug} href={`/courses/${c.slug}`} className="nh-tile" data-pic={coursePhoto(c.slug, c.category)}>
                    <span><b>{c.title}</b><small>{cats(c)} · {plural(n(c.modules), "module")}</small></span>
                    <i aria-hidden="true">↗</i>
                  </Link>
                ))}
              </div>
            )}
            <HoverPics />
            <Link className="link" href="/courses" style={{ marginTop: 32 }}>Full catalogue with details <Icon name="arrow" /></Link>
          </div>
        </section>

        {/* 03 THERMO */}
        <section className="sec sec--navy" aria-label="Interactive temperature scale">
          <div className="wrap"><Thermo /></div>
        </section>

        {/* 04 HOW */}
        <section className="sec sec--night nh-how" aria-labelledby="how-title">
          <div className="wrap">
            <div className="sec-head">
              <span className="nh-eyebrow">How it works</span>
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
              <span className="pin" style={{ left: "26%", bottom: "2%" }}>A</span>
              <span className="pin" style={{ left: "17%", top: "47%" }}>B</span>
              <span className="pin" style={{ left: "5%", bottom: "16%" }}>C</span>
              <span className="pin" style={{ right: "1.5%", bottom: "18%" }}>D</span>
              <CertificateView model={sample} />
            </div>
            <div className="certshow-side">
              <span className="nh-eyebrow">The certificate</span>
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
                <span className="nh-eyebrow">For employers</span>
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
              <span className="nh-eyebrow">Our services</span>
              <h2 className="h-l" id="services-title">From first lesson to inspection day.</h2>
            </div>
            <div className="nh-grid">
              {[
                ["Food safety training", "Practical courses that stop food poisoning before it starts.", ["Food hygiene for food handlers", "HACCP principles", "Food allergen awareness"], "/courses?c=food-safety"],
                ["Health & safety", "Safer kitchens, hotels and food plants for the people who work in them.", ["Occupational safety & health", "Fire safety & fire marshal", "Slips, trips, lifting and PPE"], "/courses?c=health-safety"],
                ["Audits & consultancy", "Independent checks of your premises, systems and records.", ["Hygiene audits", "HACCP plan development", "Pest control and cleaning reviews"], "/consultancy"],
                ["Hospitality solutions", "Standards and people development for hospitality businesses.", ["Standards and induction programmes", "Company accounts for staff training", "On-site group training"], "/business"],
              ].map(([t, d, list, href], i) => (
                <div className="nh-cell" key={t as string}>
                  <span className="nh-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{t as string}</h3>
                  <p>{d as string}</p>
                  <ul>{(list as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
                  <Link className="nh-more" href={href as string}>Find out more</Link>
                </div>
              ))}
            </div>
            <aside className="nh-award">
              <div className="nh-award-pics">
                <img src="/brand/hygiene-certificate.jpg" alt="Aspire Annual Food Hygiene Certificate, compliant to public health" loading="lazy" width={1200} height={848} />
                <img src="/brand/hygiene-certificate-2.jpg" alt="Aspire Certificate of Food Hygiene, compliant to public health" loading="lazy" width={1200} height={848} />
              </div>
              <div>
                <span className="nh-eyebrow">Credentials and assurance</span>
                <h3>A certificate of hygiene for your business</h3>
                <p>The business will have a certificate of hygiene to prove compliance with public health regulations.</p>
              </div>
            </aside>
          </div>
        </section>

        {/* 08 FAQ */}
        <section className="sec" aria-labelledby="faq-title">
          <div className="wrap faq">
            <header>
              <span className="nh-eyebrow">Questions</span>
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
              <span className="nh-eyebrow">Contact</span>
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
