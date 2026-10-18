import { AppShell, PageHead } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminNav } from "../admin-nav";

export default async function Submissions() {
  await requireAdmin();
  const { data } = await supabaseAdmin().from("assignment_submissions").select("body,updated_at,profiles(full_name,email),courses(title)").order("updated_at", { ascending: false }).limit(200);
  return (
    <AppShell active="admin" wide>
      <PageHead eyebrow="Admin" title="Course assignments" />
      <AdminNav active="submissions" />
      {!data?.length && <p className="muted">No assignments submitted yet.</p>}
      <div className="subs">
        {(data ?? []).map((s, i) => {
          const p = s.profiles as unknown as { full_name: string | null; email: string } | null;
          return (
            <details key={i} className="form-card sub">
              <summary><b>{p?.full_name || p?.email}</b> · {(s.courses as unknown as { title: string } | null)?.title} <small>{new Date(s.updated_at).toLocaleDateString("en-GB")}</small></summary>
              <p className="sub-body">{s.body}</p>
              {p?.email && <a className="btn btn--outline btn--sm" href={`mailto:${p.email}?subject=${encodeURIComponent("Your Aspire course assignment")}`}>Reply by email</a>}
            </details>
          );
        })}
      </div>
    </AppShell>
  );
}
