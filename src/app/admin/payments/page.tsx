import { AppShell, PageHead } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { usd } from "@/lib/site";
import { AdminNav } from "../admin-nav";

export default async function Payments() {
  await requireAdmin();
  const { data } = await supabaseAdmin().from("payments").select("reference,purpose,seats,amount,currency,amount_usd,status,channel,created_at,paid_at,profiles(full_name,email),courses(title),companies(name)").order("created_at", { ascending: false }).limit(500);
  return (
    <AppShell active="admin" wide>
      <PageHead eyebrow="Admin" title="Payments" />
      <AdminNav active="payments" />
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Date</th><th>Payer</th><th>For</th><th>Amount</th><th>USD</th><th>Channel</th><th>Status</th><th>Reference</th></tr></thead>
        <tbody>{(data ?? []).map((p) => {
          const who = p.profiles as unknown as { full_name: string | null; email: string } | null;
          return (
            <tr key={p.reference}>
              <td>{new Date(p.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
              <td>{who?.full_name || who?.email || "—"}</td>
              <td>{p.purpose === "certificate" ? (p.courses as unknown as { title: string } | null)?.title : `${p.seats} seats · ${(p.companies as unknown as { name: string } | null)?.name ?? ""}`}</td>
              <td>{p.currency} {Number(p.amount).toLocaleString()}</td><td>{usd(p.amount_usd)}</td><td>{p.channel ?? "—"}</td>
              <td><span className={`chip chip--sm ${p.status === "success" ? "chip--green" : p.status === "failed" ? "chip--warn" : ""}`}>{p.status}</span></td>
              <td className="mono">{p.reference}</td>
            </tr>);
        })}</tbody>
      </table></div>
    </AppShell>
  );
}
