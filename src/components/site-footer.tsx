import Link from "next/link";
import { SITE } from "@/lib/site";
import { Icon } from "./icons";

export function SiteFooter(_: { dark?: boolean }) {
  return (
    <>
      <footer className="site-footer">
        <div className="wrap foot-top">
          <div className="foot-lead">
            <span className="micro" style={{ color: "rgba(255,255,255,.5)" }}>Start today</span>
            <h2 style={{ marginTop: 18 }}>Every module is free.<br />Pay only for the certificate you earn.</h2>
            <div className="row">
              <Link className="btn btn--go btn--lg" href="/signup">Create a free account <Icon name="arrow" /></Link>
              <Link className="btn btn--ghost btn--lg" href="/courses">Browse courses</Link>
            </div>
          </div>
          <div className="foot-col">
            <h4>Learn</h4>
            <ul>
              <li><Link href="/courses">All courses</Link></li>
              <li><Link href="/signup">Create an account</Link></li>
              <li><Link href="/login">Sign in</Link></li>
              <li><Link href="/verify">Verify a certificate</Link></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Organisation</h4>
            <ul>
              <li><Link href="/business">Company accounts</Link></li>
              <li><Link href="/#about">Audits &amp; consultancy</Link></li>
              <li><Link href="/#contact">Book on-site training</Link></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Contact</h4>
            <ul>
              <li><a href={SITE.phoneHref}>{SITE.phone}</a></li>
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              {SITE.websites.map((w) => <li key={w.href}><a href={w.href} target="_blank" rel="noopener">{w.label}</a></li>)}
            </ul>
          </div>
        </div>
        <div className="wrap foot-mid">
          <span className="micro">© {new Date().getFullYear()} {SITE.name}</span>
          <span className="motto">Value, Quality &amp; Service.</span>
          <span className="foot-pay" aria-label="We accept M-Pesa, Visa and Mastercard">
            <img src="/brand/mpesa.svg" alt="" /><img src="/brand/visa.svg" alt="" /><img src="/brand/mastercard.svg" alt="" />
          </span>
          <span className="micro">Photography: Unsplash contributors</span>
        </div>
        <div className="wrap" aria-hidden="true"><div className="foot-word">ASPIRE<span>.</span></div></div>
      </footer>
      <a className="wa-float" href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener" aria-label="Chat with Aspire on WhatsApp"><Icon name="whatsapp" /></a>
    </>
  );
}
