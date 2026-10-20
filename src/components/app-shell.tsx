import Link from "next/link";
import { getSession } from "@/lib/auth";
import { canLearn } from "@/lib/config";
import { SITE } from "@/lib/site";
import { signOut } from "@/app/actions";
import { Icon } from "./icons";
import { AppNav, AppTabs, type NavGroup } from "./app-nav";

/** The signed-in workspace. Admins get an admin-only menu; learners and company owners get their own. */
export async function AppShell({ children, wide }: { children: React.ReactNode; active?: string; wide?: boolean }) {
  const { profile } = await getSession();
  const isAdmin = profile?.role === "admin";
  const learnLinks = [
    { href: "/dashboard", label: "My learning" },
    { href: "/courses", label: "Browse courses" },
    { href: "/certificates", label: "My certificates" },
  ];
  const groups: NavGroup[] = isAdmin
    ? [
        { title: "Administration", links: [
          { href: "/admin", label: "Overview" },
          { href: "/admin/courses", label: "Courses" },
          { href: "/admin/learners", label: "Learners" },
          { href: "/admin/certificates", label: "Certificates" },
          { href: "/admin/payments", label: "Payments" },
          { href: "/admin/companies", label: "Companies" },
          { href: "/admin/submissions", label: "Assignments" },
        ] },
        ...(canLearn(profile) ? [{ title: "Learn", links: learnLinks }] : []),
        { title: "Account", links: [{ href: "/account", label: "Your details" }, { href: "/", label: "Main website" }] },
      ]
    : [
        { title: "Learn", links: learnLinks },
        { title: "Account", links: [
          { href: "/company", label: profile?.company_role === "owner" ? "My company" : "Company" },
          { href: "/account", label: "Your details" },
        ] },
      ];
  const name = (profile?.full_name || profile?.email || "?").trim();
  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <aside className="app-side">
        <Link href="/" className="app-brand">
          <img src="/brand/logo-light.png" alt="" width={466} height={640} />
          <span><b>ASPIRE</b><small>{isAdmin ? "Administration" : "Safety & Hygiene Solutions"}</small></span>
        </Link>
        <AppNav groups={groups} />
        <div className="app-user">
          <span className="avatar" aria-hidden="true">{name[0]?.toUpperCase()}</span>
          <span className="who"><b>{profile?.full_name || (isAdmin ? "Administrator" : "Learner")}</b><small>{isAdmin ? "Admin · " : ""}{profile?.email}</small></span>
          <form action={signOut}><button className="icon-btn" aria-label="Sign out" title="Sign out"><Icon name="logout" /></button></form>
        </div>
      </aside>
      <div className="app-main">
        <div className="app-topbar">
          <div className="app-topbar-row">
            <Link href="/" className="app-brand"><img src="/brand/logo-light.png" alt="" width={466} height={640} /><span><b>ASPIRE</b></span></Link>
            <form action={signOut}><button className="icon-btn" aria-label="Sign out"><Icon name="logout" /></button></form>
          </div>
          <AppTabs groups={groups} />
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
