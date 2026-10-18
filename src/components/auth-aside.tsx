import Link from "next/link";

/** Shared frame for the sign-in pages: the form on the left, a photograph and the motto on the right. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="auth">
      <div className="auth-main">
        <Link className="brand" href="/" aria-label="Aspire Safety & Hygiene Solutions, home">
          <img src="/brand/logo-light.png" alt="" width={466} height={640} />
          <span className="brand-word">ASPIRE</span>
          <span className="brand-sub">Safety &amp; Hygiene Solutions</span>
        </Link>
        {children}
        <span className="micro">© {new Date().getFullYear()} Aspire Safety &amp; Hygiene Solutions</span>
      </div>
      <aside className="auth-side" aria-hidden="true">
        <img src="/photos/pass.jpg" alt="" />
        <span className="micro">Food safety · Hygiene · Health &amp; safety</span>
        <p>Clean hands.<br />Safe food.<br />Proud kitchens.<span className="motto">Value, Quality &amp; Service.</span></p>
      </aside>
    </main>
  );
}
