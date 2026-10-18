import Link from "next/link";

const items = [
  ["", "Overview"], ["courses", "Courses"], ["learners", "Learners"], ["certificates", "Certificates"],
  ["payments", "Payments"], ["companies", "Companies"], ["submissions", "Assignments"],
] as const;

export function AdminNav({ active }: { active: string }) {
  return (
    <nav className="admin-nav" aria-label="Admin">
      {items.map(([k, l]) => <Link key={k} href={`/admin${k ? `/${k}` : ""}`} className={active === k ? "is-active" : ""}>{l}</Link>)}
    </nav>
  );
}
