import { AppShell, PageHead } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminNav } from "../admin-nav";
import { setRole } from "../actions";

export default async function Learners({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { user } = await requireAdmin();
  const { q } = await searchParams;
  const db = supabaseAdmin();
  let query = db.from("profiles").select("id,full_name,email,phone,role,created_at,companies(name)").order("created_at", { ascending: false }).limit(300);
  if (q) query = query.or(`full_name.ilike.%${q.replace(/[%,()]/g, "")}%,email.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [{ data }, { data: enr }, { data: certs }] = await Promise.all([query, db.from("enrollments").select("user_id"), db.from("certificates").select("user_id")]);
  const count = (rows: { user_id: string }[] | null) => { const m = new Map<string, number>(); for (const r of rows ?? []) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1); return m; };
  const e = count(enr), c = count(certs);
  return (
    <AppShell active="admin" wide>
      <PageHead eyebrow="Admin" title="Learners" />
      <AdminNav active="learners" />
      <form className="inline-form"><input name="q" defaultValue={q ?? ""} placeholder="Search name or email" /><button className="btn btn--outline btn--sm">Search</button></form>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Courses</th><th>Certificates</th><th>Joined</th><th>Role</th></tr></thead>
        <tbody>{(data ?? []).map((p) => (
          <tr key={p.id}>
            <td>{p.full_name || "—"}</td><td>{p.email}</td><td>{p.phone || "—"}</td>
            <td>{(p.companies as unknown as { name: string } | null)?.name ?? "—"}</td>
            <td>{e.get(p.id) ?? 0}</td><td>{c.get(p.id) ?? 0}</td>
            <td>{new Date(p.created_at).toLocaleDateString("en-GB")}</td>
            <td>{p.id === user.id ? <span className="chip chip--sm">You (admin)</span> : (
              <form action={setRole}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="role" value={p.role === "admin" ? "learner" : "admin"} />
                <button className="link-btn">{p.role === "admin" ? "Admin · remove" : "Make admin"}</button></form>)}</td>
          </tr>))}</tbody>
      </table></div>
    </AppShell>
  );
}
