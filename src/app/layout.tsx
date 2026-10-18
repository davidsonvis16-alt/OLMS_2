import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE } from "@/lib/site";
import "./globals.css";

/* One family per job: Archivo (grotesque, with a width axis) for everything you read,
   IBM Plex Mono for labels and serials, EB Garamond only for the motto and the certificate.
   The same files are embedded in the certificate PDF, so screen and paper match. */
const sans = localFont({
  src: "../assets/fonts/archivo-normal-100-900.woff2",
  variable: "--f-sans", weight: "100 900", display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});
const mono = localFont({
  src: [
    { path: "../assets/fonts/ibmplexmono-normal-400.woff2", weight: "400" },
    { path: "../assets/fonts/ibmplexmono-normal-500.woff2", weight: "500" },
  ],
  variable: "--f-mono", display: "swap",
});
const serif = localFont({
  src: [
    { path: "../assets/fonts/ebgaramond-normal-400-700.woff2", weight: "400 700", style: "normal" },
    { path: "../assets/fonts/ebgaramond-italic-400-700.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--f-serif", display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: "Online food safety, hygiene and workplace health & safety training for the hospitality and food industry. Learn free, pass the assessment and earn a verifiable Aspire certificate.",
  icons: { icon: "/brand/logo-light.png" },
  openGraph: { title: SITE.name, description: SITE.tagline, images: ["/brand/logo-light.png"] },
};
/** Every page is rendered per request so it can carry that request's CSP nonce (see middleware.ts). */
export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#0b0b1f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
