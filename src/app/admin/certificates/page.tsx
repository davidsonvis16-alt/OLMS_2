import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import Link from "@/components/link";
import { AppShell, PageHead } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminNav } from "../admin-nav";

export async function loader(_: LoaderFunctionArgs) {
  await requireAdmin();
  const { data } = await supabaseAdmin().from("certificates").select("id,serial,full_name,id_number,course_title,score,issued_at,revoked,company_name,payment_id").order("issued_at", { ascending: false }).limit(500);
  return { data };
}

export default function AdminCerts() {
  const { data } = useLoaderData<typeof loader>();
  return (
    <AppShell active="admin" wide>
      <PageHead eyebrow="Admin" title="Certificates" />
      <AdminNav active="certificates" />
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Serial</th><th>Name</th><th>ID</th><th>Course</th><th>Mark</th><th>Paid by</th><th>Issued</th><th /></tr></thead>
        <tbody>{(data ?? []).map((c) => (
          <tr key={c.id} className={c.revoked ? "is-muted" : ""}>
            <td><Link href={`/verify/${c.serial}`} target="_blank">{c.serial}</Link></td><td>{c.full_name}</td><td>{c.id_number}</td><td>{c.course_title}</td><td>{c.score}%</td>
            <td>{c.payment_id ? "Learner" : c.company_name ? c.company_name : "Free"}</td>
            <td>{new Date(c.issued_at).toLocaleDateString("en-GB")}</td>
            <td className="row-btns">
              <a className="link-btn" href={`/api/certificate/${c.serial}`} target="_blank" rel="noopener">PDF</a>
              <form method="post" action="/do/setRevoked"><input type="hidden" name="id" value={c.id} /><input type="hidden" name="revoked" value={c.revoked ? "0" : "1"} /><button className={`link-btn${c.revoked ? "" : " danger"}`}>{c.revoked ? "Restore" : "Revoke"}</button></form>
            </td>
          </tr>))}</tbody>
      </table></div>
    </AppShell>
  );
}
