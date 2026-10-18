import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/forms";
import { SITE, usd, wa } from "@/lib/site";
import { seatPrice } from "@/app/company-actions";

export const metadata: Metadata = { title: "Company accounts" };
export const dynamic = "force-dynamic"; // the header is per-user, so these pages are never cached

export default async function Business() {
  const price = await seatPrice().catch(() => null);
  return (
    <>
      <SiteHeader current="business" />
      <main id="main">
        <section className="wrap ptop">
          <div className="ptop-grid">
            <span className="micro">For hotels, restaurants, caterers &amp; food businesses</span>
            <h1 className="h-xl">Train the team.<br /><span className="blue">Show the inspector.</span></h1>
            <div className="ptop-aside">
              <p className="lede">One company account gives your staff every Aspire course, certificates included while the account is active, and a table showing exactly who has passed.</p>
              <div className="row" style={{ marginTop: 28 }}>
                <Link className="cta" href="/company"><span>Open a company account</span><i><Icon name="arrow" /></i></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap" aria-label="Photograph">
          <figure className="split-pic" style={{ margin: 0, minHeight: "min(64vh, 620px)" }}>
            <img src="/photos/hero.jpg" alt="A chef working at a clean stainless-steel pass" />
            <figcaption className="micro">Kitchen &amp; service teams</figcaption>
          </figure>
        </section>

        <section className="sec" aria-labelledby="how-biz">
          <div className="wrap">
            <div className="sec-head">
              <span className="micro">(01) How it works</span>
              <h2 className="h-l" id="how-biz">Four steps, one link.</h2>
            </div>
            <ol className="ruler-steps">
              <li className="rv"><span className="n">01</span><h3>Create your company</h3><p>Sign in and name your business. You become the account owner.</p></li>
              <li className="rv rv-d1"><span className="n">02</span><h3>Buy staff seats</h3><p>Seats last 12 months. Pay by card in USD or M-Pesa in KES.</p></li>
              <li className="rv rv-d2"><span className="n">03</span><h3>Share the invite link</h3><p>Staff create a free account and join your company in one tap.</p></li>
              <li className="rv rv-d3"><span className="n">04</span><h3>Track every result</h3><p>Modules completed and certificates earned, person by person.</p></li>
            </ol>
          </div>
        </section>

        <section className="sec sec--bone" aria-labelledby="price-title">
          <div className="wrap">
            <div className="sec-head">
              <span className="micro">(02) Pricing</span>
              <h2 className="h-l" id="price-title">Per seat, per year.</h2>
            </div>
            <div className="plans">
              <div className="plan plan--hi">
                <span className="micro">Online</span>
                <h3>Company account</h3>
                <p className="plan-price">{price != null ? <>{usd(price)}<small>per seat, per year</small></> : <>On request<small>Contact us for a quote</small></>}</p>
                <ul className="ticks">
                  <li><b>Every course, every member of staff</b></li>
                  <li><b>Certificates included</b><span>While the account is active</span></li>
                  <li><b>Team progress table</b></li>
                  <li><b>Card in USD or M-Pesa in KES</b></li>
                </ul>
                <Link className="btn btn--go btn--lg btn--block" href="/company">Get started <Icon name="arrow" /></Link>
              </div>
              <div className="plan">
                <span className="micro">On-site</span>
                <h3>Group training at your premises</h3>
                <p className="plan-price">Custom<small>Quoted per group</small></p>
                <ul className="ticks">
                  <li><b>A trainer at your kitchen or hotel</b></li>
                  <li><b>Hygiene audits and HACCP support</b></li>
                  <li><b>Scheduled around your shifts</b></li>
                </ul>
                <div className="row">
                  <a className="btn btn--ink btn--lg" href={SITE.phoneHref}><Icon name="phone" />Call {SITE.phone}</a>
                  <a className="btn btn--line btn--lg" href={wa("Hello Aspire, I'd like a quote for on-site training.")} target="_blank" rel="noopener"><Icon name="whatsapp" />WhatsApp</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <Reveal />
    </>
  );
}
