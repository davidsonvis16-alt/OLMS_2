import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { AppShell, PageHead } from "@/components/app-shell";
import { CompanyHistory } from "@/components/company-history";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { companyActive } from "@/lib/site";
import { companyHistory, deletedCompanyHistory } from "@/lib/server/company-history";
import { AdminNav } from "../admin-nav";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin();
  const sp = new URL(request.url).searchParams;
  const { data } = await supabaseAdmin().from("companies").select("id,name,contact_name,email,phone,seats,paid_until,join_code,profiles(count)").order("created_at", { ascending: false });
  const [history, deleted] = await Promise.all([Promise.all((data ?? []).map((c) => companyHistory(c.id, 30))), deletedCompanyHistory(50)]);
  return { data, history, deleted, error: sp.get("error"), done: sp.get("done") };
}

export default function Companies() {
  const { data, history, deleted, error, done } = useLoaderData<typeof loader>();
  return (
    <AppShell active="admin" wide>
      <PageHead eyebrow="Admin" title="Companies" />
      <AdminNav active="companies" />
      {error && <p className="alert alert--error">{error}</p>}
      {done && <p className="alert alert--ok">{done}</p>}
      <p className="muted">Paid online seats update automatically. Use this to record an offline payment or give a company more time. Every change is recorded in the company&apos;s history, which its owner sees too.</p>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Company</th><th>Contact</th><th>Staff</th><th>Seats / valid until</th><th>Status</th><th /></tr></thead>
        <tbody>{(data ?? []).map((c, i) => (
          <tr key={c.id}>
            <td><b>{c.name}</b><br /><small className="mono">{c.join_code}</small>
              <details className="history-box"><summary>History</summary><CompanyHistory events={history[i]} /></details>
            </td>
            <td>{c.contact_name || "—"}<br /><small>{c.email} {c.phone}</small></td>
            <td>{(c.profiles as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
            <td>
              <form method="post" action="/do/adjustCompany" className="inline-form inline-form--tight">
                <input type="hidden" name="id" value={c.id} />
                <input name="seats" type="number" min={0} defaultValue={c.seats} aria-label="Seats" className="w-xs" />
                <input name="paid_until" type="date" defaultValue={c.paid_until ?? ""} aria-label="Valid until" />
                <button className="btn btn--outline btn--sm">Save</button>
              </form>
            </td>
            <td>{companyActive(c) ? <span className="chip chip--green chip--sm">Active</span> : <span className="chip chip--sm">Inactive</span>}</td>
            <td>
              <details className="acct-delete">
                <summary>Delete…</summary>
                <form method="post" action="/do/deleteCompany">
                  <input type="hidden" name="id" value={c.id} />
                  <p>Deletes the <b>{c.name}</b> company account. Its staff keep their own accounts, progress and certificates; they are just no longer linked to the company. Payments and history are kept. This can&apos;t be undone.</p>
                  <label className="sr-only" htmlFor={`delc-${c.id}`}>Type the company name to confirm</label>
                  <input id={`delc-${c.id}`} name="confirm" placeholder={`Type ${c.name}`} autoComplete="off" required />
                  <button className="btn btn--sm btn--danger">Delete company</button>
                </form>
              </details>
            </td>
          </tr>))}</tbody>
      </table></div>
      {!!deleted?.length && (
        <>
          <h2 className="h3 section-title">Deleted companies</h2>
          <CompanyHistory events={deleted} />
        </>
      )}
    </AppShell>
  );
}
