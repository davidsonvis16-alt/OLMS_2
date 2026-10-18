import Link from "next/link";
import { getSession } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { HeaderShell } from "./header-client";

/** `stage` = the header sits on the dark homepage stage until the visitor scrolls past it. */
export async function SiteHeader({ current, stage }: { current?: "home" | "courses" | "verify" | "business"; stage?: boolean }) {
  const { user, profile } = await getSession();
  const brand = (
    <Link className="brand" href="/" aria-label={`${SITE.name}, home`}>
      <img src="/brand/logo-light.png" alt="" width={466} height={640} />
      <span className="brand-word">ASPIRE</span>
      <span className="brand-sub">Safety &amp; Hygiene Solutions</span>
    </Link>
  );
  const cur = (k: string) => (current === k ? { "aria-current": "page" as const } : {});
  const home = profile?.role === "admin" ? "/admin" : profile?.company_role === "owner" ? "/company" : "/dashboard";
  return (
    <HeaderShell brand={brand} stage={stage}>
      <Link href="/courses" {...cur("courses")}>Courses</Link>
      <Link href="/business" {...cur("business")}>For companies</Link>
      <Link href="/verify" {...cur("verify")}>Verify</Link>
      <Link href="/#about">About</Link>
      <Link href="/#contact">Contact</Link>
      {user ? (
        <Link className="nav-cta" href={home}>{profile?.role === "admin" ? "Admin" : profile?.company_role === "owner" ? "My company" : "My learning"}</Link>
      ) : (
        <>
          <Link href="/login">Sign in</Link>
          <Link className="nav-cta" href="/signup">Start free</Link>
        </>
      )}
    </HeaderShell>
  );
}
