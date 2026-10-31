import type { CompanyEvent } from "@/lib/server/company-history";

/** The shared company account history. The owner's page and the admin page render exactly the same entries. */
export function CompanyHistory({ events, empty = "No changes recorded yet." }: { events: CompanyEvent[] | null; empty?: string }) {
  if (events === null) return <p className="muted small">History isn&apos;t switched on yet.</p>;
  if (!events.length) return <p className="muted small">{empty}</p>;
  return (
    <ol className="history">
      {events.map((e) => (
        <li key={e.id}>
          <time dateTime={e.at}>{new Date(e.at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })}</time>
          <span>{e.detail}</span>
          {e.by_admin && <span className="chip chip--sm">Aspire</span>}
        </li>
      ))}
    </ol>
  );
}
