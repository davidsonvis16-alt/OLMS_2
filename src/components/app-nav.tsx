import Link from "@/components/link";
import { usePathname } from "@/lib/navigation";

export type NavLink = { href: string; label: string };
export type NavGroup = { title: string; links: NavLink[] };

/** Highlights the link whose path best matches the current page. */
function useActive(groups: NavGroup[]) {
  const path = usePathname() ?? "";
  const all = groups.flatMap((g) => g.links);
  return all.filter((l) => path === l.href || path.startsWith(l.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function AppNav({ groups }: { groups: NavGroup[] }) {
  const active = useActive(groups);
  let i = 0;
  return (
    <nav className="app-nav" aria-label="Workspace">
      {groups.map((g) => (
        <div key={g.title} style={{ display: "contents" }}>
          <span className="k">{g.title}</span>
          {g.links.map((l) => (
            <Link key={l.href} href={l.href} className={active === l.href ? "is-active" : ""} aria-current={active === l.href ? "page" : undefined}>
              <span className="n">{String(++i).padStart(2, "0")}</span>{l.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function AppTabs({ groups }: { groups: NavGroup[] }) {
  const active = useActive(groups);
  return (
    <nav className="app-tabs" aria-label="Workspace">
      {groups.flatMap((g) => g.links).map((l) => (
        <Link key={l.href} href={l.href} className={active === l.href ? "is-active" : ""} aria-current={active === l.href ? "page" : undefined}>{l.label}</Link>
      ))}
    </nav>
  );
}
