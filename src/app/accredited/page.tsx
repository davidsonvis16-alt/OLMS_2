import Link from "@/components/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icons";
import { EnquiryForm, Reveal } from "@/components/forms";
import { ACCREDITED, ACCREDITED_INTRO } from "@/lib/accredited";
import { SITE, pageTitle, wa } from "@/lib/site";

export const meta = () => [
  ...pageTitle("Accredited courses"),
  { name: "description", content: "Accredited food safety, HACCP, ISO 22000 internal auditor, first aid and fire safety training, delivered by a certified trainer in the classroom or on site in Kenya." },
];

export default function Accredited() {
  return (
    <>
      <SiteHeader current="accredited" />
      <main id="main">
        <section className="nh-hero nh-hero--short" aria-labelledby="a-title">
          <div className="nh-hero-pic" aria-hidden="true"><img src="/photos/training-room.jpg" alt="" /></div>
          <div className="wrap nh-hero-in">
            <span className="nh-eyebrow">Accredited courses · Classroom &amp; on site</span>
            <h1 id="a-title" className="nh-title" style={{ maxWidth: "14ch" }}>Accredited training.</h1>
            <p className="nh-lede">{ACCREDITED_INTRO} <span className="motto">We give you value, quality &amp; service.</span></p>
            <div className="row nh-actions">
              <a className="btn btn--go btn--lg" href="#enquire">Book a course</a>
              <a className="btn btn--ghost btn--lg" href={wa("Hello Aspire, I'd like to book an accredited course.")} target="_blank" rel="noopener"><Icon name="whatsapp" />WhatsApp us</a>
            </div>
          </div>
          <div className="wrap" style={{ paddingBottom: 48 }} />
        </section>

        <section className="sec sec--bone" aria-labelledby="a-list">
          <div className="wrap">
            <span className="nh-eyebrow">Food safety training courses</span>
            <h2 className="h-l" id="a-list">Choose a course for your team.</h2>
            <p className="lede" style={{ marginTop: 18 }}>Delivered by a certified trainer, in our classroom or at your premises.</p>
            <div className="nh-grid" style={{ marginTop: 40 }}>
              {ACCREDITED.map((c, i) => (
                <div className="nh-cell" key={c.id} id={c.id}>
                  <span className="nh-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                  <a className="nh-more" href="#enquire">Book this course</a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" aria-labelledby="a-free">
          <div className="wrap band">
            <div className="band-l">
              <span className="nh-eyebrow">Learn online too</span>
              <h2 className="h-l" id="a-free">Start with our free courses.</h2>
            </div>
            <div className="band-r">
              <p className="lede">Staff can also study online for free on their phones, pass an assessment and earn a QR-verified Aspire certificate.</p>
              <div className="row" style={{ marginTop: 24 }}>
                <Link className="btn btn--ink btn--lg" href="/courses">See the free courses <Icon name="arrow" /></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="sec sec--bone" id="enquire" aria-labelledby="a-enquire">
          <div className="wrap contact">
            <div className="contact-copy">
              <span className="nh-eyebrow">Book a course</span>
              <h2 className="h-l" id="a-enquire">Train your team with us.</h2>
              <p className="lede" style={{ marginTop: 20 }}>Tell us which course, how many people and where, and we&apos;ll get back to you with dates and a quote.</p>
              <div className="contact-lines">
                <a href={SITE.phoneHref}><span className="micro">Call</span><b>{SITE.phone}</b></a>
                <a href={wa("Hello Aspire, I'd like to book an accredited course.")} target="_blank" rel="noopener"><span className="micro">WhatsApp</span><b>{SITE.phone}</b></a>
                <a href={`mailto:${SITE.email}?subject=${encodeURIComponent("Accredited course booking")}`}><span className="micro">Email</span><b>{SITE.email}</b></a>
              </div>
            </div>
            <div className="contact-form form-card">
              <h3>Send a course enquiry</h3>
              <p>Fill this in, then send it by WhatsApp or email, whichever suits you.</p>
              <EnquiryForm courses={ACCREDITED.map((c) => c.title)} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <Reveal />
    </>
  );
}
