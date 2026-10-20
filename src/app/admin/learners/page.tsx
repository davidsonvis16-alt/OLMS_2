import { AppShell, PageHead } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminNav } from "../admin-nav";
import { deleteUser, restoreUser, setRole, suspendUser } from "../actions";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.

/** Same rules as the database: phones by their last 9 digits, ID numbers without spaces, dashes or case. */
const normPhone = (t: string | null) => (t ?? "").replace(/\D/g, "").slice(-9) || null;
const normId = (t: string | null) => (t ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || null;

type Row = { id: string; full_name: string | null; email: string | null; phone: string | null; id_number: string | null; role: string; created_at: string; suspended_at: string | null; companies: unknown };

export default async function Learners({ searchParams }: { searchParams: Promise<{ q?: string; done?: string; error?: string }> }) {
  const { user } = await requireAdmin();
  const { q, done, error } = await searchParams;
  const db = supabaseAdmin();
  let query = db.from("profiles").select("id,full_name,email,phone,id_number,role,created_at,suspended_at,companies(name)").order("created_at", { ascending: false }).limit(300);
  if (q) query = query.or(`full_name.ilike.%${q.replace(/[%,()]/g, "")}%,email.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [{ data, error: loadError }, { data: enr }, { data: certs }, { data: everyone }] = await Promise.all([
    query, db.from("enrollments").select("user_id"), db.from("certificates").select("user_id"), db.from("profiles").select("phone,id_number"),
  ]);
  const count = (rows: { user_id: string }[] | null) => { const m = new Map<string, number>(); for (const r of rows ?? []) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1); return m; };
  const e = count(enr), c = count(certs);
  const tally = (vals: (string | null)[]) => { const m = new Map<string, number>(); for (const v of vals) if (v) m.set(v, (m.get(v) ?? 0) + 1); return m; };
  const phones = tally((everyone ?? []).map((p) => normPhone(p.phone)));
  const ids = tally((everyone ?? []).map((p) => normId(p.id_number)));
  const shared = (m: Map<string, number>, v: string | null) => !!v && (m.get(v) ?? 0) > 1;
  const rows = (data ?? []) as Row[];
  const dupes = rows.filter((p) => shared(phones, normPhone(p.phone)) || shared(ids, normId(p.id_number))).length;

  return (
    <AppShell active="admin" wide>
      <PageHead eyebrow="Admin" title="Learners" />
      <AdminNav active="learners" />
      {loadError && <p className="alert alert--error" role="alert">Couldn&apos;t load accounts ({loadError.message}). If this mentions &ldquo;suspended_at&rdquo;, run <code>supabase/schema.sql</code> again in Supabase&apos;s SQL Editor.</p>}
      {done && <p className="alert alert--ok" role="status">{done}</p>}
      {error && <p className="alert alert--error" role="alert">{error}</p>}
      {dupes > 0 && <p className="alert alert--warn">{dupes} accounts share a phone or ID number with another account (marked <b>Shared</b>). One person should have one account: check them, then suspend or delete the extra one.</p>}
      <form className="inline-form"><input name="q" defaultValue={q ?? ""} placeholder="Search name or email" /><button className="btn btn--outline btn--sm">Search</button></form>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>ID / passport</th><th>Company</th><th>Courses</th><th>Certificates</th><th>Joined</th><th>Status</th><th>Role</th><th>Account</th></tr></thead>
        <tbody>{rows.map((p) => {
          const self = p.id === user.id, isAdmin = p.role === "admin";
          return (
            <tr key={p.id} className={p.suspended_at ? "is-suspended" : ""}>
              <td>{p.full_name || "—"}</td><td>{p.email}</td>
              <td>{p.phone || "—"}{shared(phones, normPhone(p.phone)) && <> <span className="chip chip--sm chip--warn">Shared</span></>}</td>
              <td className="mono">{p.id_number || "—"}{shared(ids, normId(p.id_number)) && <> <span className="chip chip--sm chip--warn">Shared</span></>}</td>
              <td>{(p.companies as { name: string } | null)?.name ?? "—"}</td>
              <td>{e.get(p.id) ?? 0}</td><td>{c.get(p.id) ?? 0}</td>
              <td>{new Date(p.created_at).toLocaleDateString("en-GB")}</td>
              <td>{p.suspended_at ? <span className="chip chip--sm chip--warn">Suspended</span> : "Active"}</td>
              <td>{self ? <span className="chip chip--sm">You (admin)</span> : (
                <form action={setRole}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="role" value={isAdmin ? "learner" : "admin"} />
                  <button className="link-btn">{isAdmin ? "Admin · remove" : "Make admin"}</button></form>)}</td>
              <td>{self || isAdmin ? <small className="muted">{self ? "—" : "Remove admin role first"}</small> : (
                <div className="acct-actions">
                  {p.suspended_at
                    ? <form action={restoreUser}><input type="hidden" name="id" value={p.id} /><button className="link-btn">Restore</button></form>
                    : <form action={suspendUser}><input type="hidden" name="id" value={p.id} /><button className="link-btn">Suspend</button></form>}
                  <details className="acct-delete">
                    <summary>Delete…</summary>
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={p.id} />
                      <p>Permanently deletes <b>{p.email}</b>: their sign-in, details, progress and answers. Issued certificates stay verifiable. This can&apos;t be undone.</p>
                      <label className="sr-only" htmlFor={`del-${p.id}`}>Type DELETE to confirm</label>
                      <input id={`del-${p.id}`} name="confirm" placeholder="Type DELETE" autoComplete="off" required pattern="DELETE" />
                      <button className="btn btn--sm btn--danger">Delete account</button>
                    </form>
                  </details>
                </div>)}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
    </AppShell>
  );
}
