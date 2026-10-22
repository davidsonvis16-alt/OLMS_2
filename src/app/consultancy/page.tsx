import Link from "@/components/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icons";
import { EnquiryForm, Reveal } from "@/components/forms";
import { CONSULTANCY, CONSULT_STEPS, FOOD_SAFETY } from "@/lib/consultancy";
import { SITE, pageTitle, wa } from "@/lib/site";

export const meta = () => [
  ...pageTitle("Consultancy"),
  { name: "description", content: "Aspire consultancy in Kenya: hospital food-service strategy, kitchen planning and readiness, food safety and accreditation, and operational improvement." },
];

export default function Consultancy() {
  return (
    <>
      <SiteHeader current="consultancy" />
      <main id="main">
        <section className="nh-hero nh-hero--short" aria-labelledby="c-title">
          <div className="nh-hero-pic" aria-hidden="true"><img src="/photos/hero.jpg" alt="" /></div>
          <div className="wrap nh-hero-in">
            <span className="nh-eyebrow">Aspire consultancy · Kenya</span>
            <h1 id="c-title" className="nh-title" style={{ maxWidth: "14ch" }}>Expert help for your kitchen.</h1>
            <p className="nh-lede">Aspire helps you plan and ready your kitchen, build food safety systems that pass audits and accreditation, improve day-to-day operations, and design food service for hospitals. <span className="motto">Value, Quality &amp; Service.</span></p>
            <div className="row nh-actions">
              <a className="btn btn--go btn--lg" href="#enquire">Book a consultation</a>
              <a className="btn btn--ghost btn--lg" href={wa("Hello Aspire, I'd like to discuss a consultancy project.")} target="_blank" rel="noopener"><Icon name="whatsapp" />WhatsApp us</a>
            </div>
          </div>
          <div className="wrap" style={{ paddingBottom: 48 }} />
        </section>

        <section className="sec sec--bone" aria-labelledby="c-services">
          <div className="wrap">
            <span className="nh-eyebrow">Our consultancy services</span>
            <h2 className="h-l" id="c-services">What we can do for your business.</h2>
            <p className="lede" style={{ marginTop: 18 }}>Tell us what you need and we&apos;ll plan the work around your business.</p>
            <div className="nh-grid" style={{ marginTop: 40 }}>
              {CONSULTANCY.map((c, i) => (
                <div className="nh-cell" key={c.id} id={c.id}>
                  <span className="nh-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{c.title}</h3>
                  <p>{c.intro}</p>
                  <ul>{c.points.map((x) => <li key={x}>{x}</li>)}</ul>
                  <a className="nh-more" href="#enquire">Discuss this</a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" id="food-safety-solutions" aria-labelledby="c-fs">
          <div className="wrap">
            <div className="band">
              <div className="band-l">
                <span className="nh-eyebrow">Food safety solutions</span>
                <h2 className="h-l" id="c-fs">Food safety compliance made easy.</h2>
                <p className="lede" style={{ marginTop: 18 }}>{FOOD_SAFETY.intro}</p>
              </div>
              <div className="band-r">
                {FOOD_SAFETY.body.map((t) => <p key={t} className="lede" style={{ fontSize: 17, marginBottom: 16 }}>{t}</p>)}
              </div>
            </div>
            <div className="nh-grid" style={{ marginTop: 40 }}>
              {FOOD_SAFETY.services.map((c, i) => (
                <div className="nh-cell" key={c.title}>
                  <span className="nh-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                  <a className="nh-more" href="#enquire">Discuss this</a>
                </div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 32 }}>
              <Link className="btn btn--ink btn--lg" href="/accredited">Accredited food safety training <Icon name="arrow" /></Link>
            </div>
          </div>
        </section>

        <section className="sec sec--night nh-how" aria-labelledby="c-how">
          <div className="wrap">
            <span className="nh-eyebrow">How it works</span>
            <h2 className="h-l" id="c-how">Four simple steps.</h2>
                        <ol className="ruler-steps" style={{ marginTop: 48 }}>
              {CONSULT_STEPS.map(([t, d], i) => (
                <li key={t} className={`rv${i ? ` rv-d${i}` : ""}`}><span className="n">{String(i + 1).padStart(2, "0")}</span><h3>{t}</h3><p>{d}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="sec" aria-labelledby="c-train">
          <div className="wrap band">
            <div className="band-l">
              <span className="nh-eyebrow">Training that sticks</span>
              <h2 className="h-l" id="c-train">Your team learns online, for free.</h2>
            </div>
            <div className="band-r">
              <p className="lede">Every consultancy project can include our online courses: staff study on their phones, pass an assessment and earn a QR-verified certificate, and you see who is ready for inspection day.</p>
              <div className="row" style={{ marginTop: 24 }}>
                <Link className="btn btn--ink btn--lg" href="/courses">See the free courses <Icon name="arrow" /></Link>
                <Link className="btn btn--line btn--lg" href="/business">Company accounts</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="sec sec--bone" id="enquire" aria-labelledby="c-enquire">
          <div className="wrap contact">
            <div className="contact-copy">
              <span className="nh-eyebrow">Book a consultation</span>
              <h2 className="h-l" id="c-enquire">Let&apos;s talk about your operation.</h2>
              <p className="lede" style={{ marginTop: 20 }}>Tell us about your business and what you need, and we&apos;ll get back to you.</p>
              <div className="contact-lines">
                <a href={SITE.phoneHref}><span className="micro">Call</span><b>{SITE.phone}</b></a>
                <a href={wa("Hello Aspire, I'd like to discuss a consultancy project.")} target="_blank" rel="noopener"><span className="micro">WhatsApp</span><b>{SITE.phone}</b></a>
                <a href={`mailto:${SITE.email}?subject=${encodeURIComponent("Consultancy enquiry")}`}><span className="micro">Email</span><b>{SITE.email}</b></a>
              </div>
            </div>
            <div className="contact-form form-card">
              <h3>Send a consultancy enquiry</h3>
              <p>Fill this in, then send it by WhatsApp or email, whichever suits you.</p>
              <EnquiryForm kind="consultancy" courses={[...CONSULTANCY.map((c) => c.title), ...FOOD_SAFETY.services.map((c) => c.title)]} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <Reveal />
    </>
  );
}
