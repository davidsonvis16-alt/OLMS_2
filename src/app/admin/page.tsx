import Link from "next/link";
import type { Metadata } from "next";
import { AppShell, PageHead } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { usd } from "@/lib/site";
import { AdminNav } from "./admin-nav";
import { saveSettings } from "./actions";
import { seatPrice } from "@/app/company-actions";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = supabaseAdmin();
  const c = (t: string) => db.from(t).select("*", { count: "exact", head: true });
  const [learners, enrol, certs, companies, flagged, pays, price] = await Promise.all([
    c("profiles"), c("enrollments"), db.from("certificates").select("*", { count: "exact", head: true }).eq("revoked", false), c("companies"),
    db.from("questions").select("id", { count: "exact", head: true }).not("review_note", "is", null),
    db.from("payments").select("amount_usd,status,purpose,created_at,reference,currency,amount").order("created_at", { ascending: false }).limit(200),
    seatPrice(),
  ]);
  const ok = (pays.data ?? []).filter((p) => p.status === "success");
  const revenue = ok.reduce((n, p) => n + Number(p.amount_usd), 0);
  return (
    <AppShell active="admin" wide>
      <PageHead eyebrow="Admin" title="Overview"><Link className="btn btn--green btn--sm" href="/admin/courses">Manage courses</Link></PageHead>
      <AdminNav active="" />
      {sp.saved && <p className="alert alert--ok">Saved.</p>}
      <div className="stat-row stat-row--5">
        <div className="stat"><b>{learners.count ?? 0}</b><span>Learners</span></div>
        <div className="stat"><b>{enrol.count ?? 0}</b><span>Enrolments</span></div>
        <div className="stat"><b>{certs.count ?? 0}</b><span>Certificates</span></div>
        <div className="stat"><b>{companies.count ?? 0}</b><span>Companies</span></div>
        <div className="stat"><b>{usd(revenue)}</b><span>Paid (last 200)</span></div>
      </div>
      {(flagged.count ?? 0) > 0 && (
        <div className="alert alert--warn row-alert"><span><b>{flagged.count} quiz questions are flagged for review</b> (answer keys that look wrong in the decks, or questions drafted where a deck's quiz slide was empty). Open each course to check them.</span><Link className="btn btn--sm btn--outline" href="/admin/courses">Review</Link></div>
      )}
      <div className="two-col">
        <form action={saveSettings} className="form-card">
          <h3>Company seat price</h3>
          <p>Price per staff seat for 12 months, in USD. Leave empty to show &ldquo;price on request&rdquo;.</p>
          <div className="field"><label htmlFor="seat">USD per seat / year</label><input id="seat" name="seat_price_usd" type="number" min={0} step="0.01" defaultValue={price ?? ""} /></div>
          <button className="btn btn--green" style={{ marginTop: 14 }}>Save</button>
          <p className="form-note">Certificate fees are set per course. The M-Pesa KES amount uses the USD_TO_KES rate in the environment settings.</p>
        </form>
        <div className="form-card">
          <h3>Recent payments</h3>
          <ul className="mini-list">
            {(pays.data ?? []).slice(0, 8).map((p) => (
              <li key={p.reference}><span className={`dot dot--${p.status}`} />{p.purpose === "certificate" ? "Certificate" : "Company seats"}<b>{p.currency} {Number(p.amount).toLocaleString()}</b><small>{new Date(p.created_at).toLocaleDateString("en-GB")}</small></li>
            ))}
            {!pays.data?.length && <li className="muted">No payments yet.</li>}
          </ul>
          <Link href="/admin/payments" className="more">All payments</Link>
        </div>
      </div>
    </AppShell>
  );
}
