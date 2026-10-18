import Link from "next/link";
import { getSession } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { signOut } from "@/app/actions";
import { Icon } from "./icons";

type L = { href: string; label: string; key: string };

export async function AppShell({ children, active, wide }: { children: React.ReactNode; active?: string; wide?: boolean }) {
  const { profile } = await getSession();
  const learn: L[] = [
    { href: "/dashboard", label: "My learning", key: "dashboard" },
    { href: "/courses", label: "Browse courses", key: "browse" },
    { href: "/certificates", label: "Certificates", key: "certificates" },
  ];
  const account: L[] = [
    { href: "/company", label: profile?.company_role === "owner" ? "My company" : "Company", key: "company" },
    { href: "/account", label: "Your details", key: "account" },
  ];
  const admin: L[] = profile?.role === "admin" ? [{ href: "/admin", label: "Administration", key: "admin" }] : [];
  const groups: [string, L[]][] = [["Learn", learn], ["Account", account], ...(admin.length ? [["Aspire", admin] as [string, L[]]] : [])];
  const all = groups.flatMap(([, l]) => l);
  const name = (profile?.full_name || profile?.email || "?").trim();
  let i = 0;
  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <aside className="app-side">
        <Link href="/" className="app-brand">
          <img src="/brand/logo-light.png" alt="" width={466} height={640} />
          <span><b>ASPIRE</b><small>Safety &amp; Hygiene Solutions</small></span>
        </Link>
        <nav className="app-nav" aria-label="Account">
          {groups.map(([g, links]) => (
            <div key={g} style={{ display: "contents" }}>
              <span className="k">{g}</span>
              {links.map((l) => (
                <Link key={l.key} href={l.href} className={active === l.key ? "is-active" : ""} aria-current={active === l.key ? "page" : undefined}>
                  <span className="n">{String(++i).padStart(2, "0")}</span>{l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="app-user">
          <span className="avatar" aria-hidden="true">{name[0]?.toUpperCase()}</span>
          <span className="who"><b>{profile?.full_name || "Learner"}</b><small>{profile?.email}</small></span>
          <form action={signOut}><button className="icon-btn" aria-label="Sign out" title="Sign out"><Icon name="logout" /></button></form>
        </div>
      </aside>
      <div className="app-main">
        <div className="app-topbar">
          <div className="app-topbar-row">
            <Link href="/" className="app-brand"><img src="/brand/logo-light.png" alt="" width={466} height={640} /><span><b>ASPIRE</b></span></Link>
            <form action={signOut}><button className="icon-btn" aria-label="Sign out"><Icon name="logout" /></button></form>
          </div>
          <nav className="app-tabs" aria-label="Account">
            {all.map((l) => <Link key={l.key} href={l.href} className={active === l.key ? "is-active" : ""} aria-current={active === l.key ? "page" : undefined}>{l.label}</Link>)}
          </nav>
        </div>
        <main id="main" className={wide ? "app-content app-content--wide" : "app-content"}>{children}</main>
        <footer className="app-foot">© {new Date().getFullYear()} {SITE.name} · <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener">Help on WhatsApp</a></footer>
      </div>
    </div>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1></div>
      {children && <div className="page-head-actions">{children}</div>}
    </div>
  );
}
