import { AppShell, PageHead } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { companyActive } from "@/lib/site";
import { AdminNav } from "../admin-nav";
import { adjustCompany } from "../actions";

export default async function Companies() {
  await requireAdmin();
  const { data } = await supabaseAdmin().from("companies").select("id,name,contact_name,email,phone,seats,paid_until,join_code,profiles(count)").order("created_at", { ascending: false });
  return (
    <AppShell active="admin" wide>
      <PageHead eyebrow="Admin" title="Companies" />
      <AdminNav active="companies" />
      <p className="muted">Paid online seats update automatically. Use this to record an offline payment or give a company more time.</p>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Company</th><th>Contact</th><th>Staff</th><th>Seats / valid until</th><th>Status</th></tr></thead>
        <tbody>{(data ?? []).map((c) => (
          <tr key={c.id}>
            <td><b>{c.name}</b><br /><small className="mono">{c.join_code}</small></td>
            <td>{c.contact_name || "—"}<br /><small>{c.email} {c.phone}</small></td>
            <td>{(c.profiles as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
            <td>
              <form action={adjustCompany} className="inline-form inline-form--tight">
                <input type="hidden" name="id" value={c.id} />
                <input name="seats" type="number" min={0} defaultValue={c.seats} aria-label="Seats" className="w-xs" />
                <input name="paid_until" type="date" defaultValue={c.paid_until ?? ""} aria-label="Valid until" />
                <button className="btn btn--outline btn--sm">Save</button>
              </form>
            </td>
            <td>{companyActive(c) ? <span className="chip chip--green chip--sm">Active</span> : <span className="chip chip--sm">Inactive</span>}</td>
          </tr>))}</tbody>
      </table></div>
    </AppShell>
  );
}
