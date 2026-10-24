import Link from "@/components/link";
import { useViewer } from "@/lib/viewer";
import { SITE } from "@/lib/site";
import { HeaderShell } from "./header-client";

/** `stage` = the header sits on the dark homepage stage until the visitor scrolls past it. */
export function SiteHeader({ current, stage }: { current?: "home" | "courses" | "accredited" | "tools" | "verify" | "business" | "consultancy"; stage?: boolean }) {
  const viewer = useViewer();
  const brand = (
    <Link className="brand" href="/" aria-label={`${SITE.name}, home`}>
      <img src="/brand/logo-light.png" alt="" width={466} height={640} />
      <span className="brand-word">ASPIRE</span>
      <span className="brand-sub">Safety &amp; Hygiene Solutions</span>
    </Link>
  );
  const cur = (k: string) => (current === k ? { "aria-current": "page" as const } : {});
  const home = viewer?.role === "admin" ? "/admin" : viewer?.companyRole === "owner" ? "/company" : "/dashboard";
  return (
    <HeaderShell brand={brand} stage={stage}>
      <Link href="/courses" {...cur("courses")}>Free courses</Link>
      <Link href="/accredited" {...cur("accredited")}>Accredited courses</Link>
      <Link href="/tools" {...cur("tools")}>Compliance tools</Link>
      <Link href="/consultancy" {...cur("consultancy")}>Consultancy</Link>
      <Link href="/business" {...cur("business")}>For companies</Link>
      <Link href="/verify" {...cur("verify")}>Verify</Link>
      <Link href="/#contact">Contact</Link>
      {viewer ? (
        <Link className="nav-cta" href={home}>My account</Link>
      ) : (
        <>
          <Link href="/login">Sign in</Link>
          <Link className="nav-cta" href="/signup">Start free</Link>
        </>
      )}
    </HeaderShell>
  );
}
