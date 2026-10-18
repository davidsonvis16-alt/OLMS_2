import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VerifyForm } from "@/components/forms";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Verify a certificate" };

export default function VerifyIndex() {
  return (
    <>
      <SiteHeader current="verify" />
      <main id="main" className="verify-page">
        <div className="wrap ptop-grid" style={{ alignItems: "start" }}>
          <span className="micro">Certificate verification</span>
          <h1 className="h-xl">Is it<br /><span className="blue">genuine?</span></h1>
          <div className="ptop-aside">
            <p className="lede">Scan the QR code on any {SITE.short} certificate, or type its number below. We check it against our records and show who it was issued to.</p>
          </div>
          <div style={{ gridColumn: "1 / -1", marginTop: 48, maxWidth: 720 }}><VerifyForm /></div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
