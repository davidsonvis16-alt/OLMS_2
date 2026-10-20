import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import Link from "@/components/link";
import { AppShell, PageHead } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { catLabel, usd } from "@/lib/site";
import { AdminNav } from "../admin-nav";

export async function loader({ request }: LoaderFunctionArgs) {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams) as Record<string, string | undefined>;
  await requireAdmin();
  const { error } = searchParams;
  const { data } = await supabaseAdmin().from("courses").select("id,title,slug,category,published,slide_count,certificate_price_usd,sort,modules(count),questions(id,review_note)").order("sort");
  return { error, data };
}

export default function AdminCourses() {
  const { error, data } = useLoaderData<typeof loader>();
  return (
    <AppShell active="admin" wide>
      <PageHead eyebrow="Admin" title="Courses" />
      <AdminNav active="courses" />
      {error && <p className="alert alert--error">{error}</p>}
      <form method="post" action="/do/createCourse" className="inline-form">
        <input name="title" placeholder="New course title" required />
        <button className="btn btn--green btn--sm">Create course</button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>#</th><th>Course</th><th>Category</th><th>Slides</th><th>Modules</th><th>Questions</th><th>Certificate</th><th>Status</th></tr></thead>
          <tbody>
            {(data ?? []).map((c) => {
              const qs = (c.questions ?? []) as { id: string; review_note: string | null }[];
              const flagged = qs.filter((q) => q.review_note).length;
              return (
                <tr key={c.id}>
                  <td>{c.sort}</td>
                  <td><Link href={`/admin/courses/${c.id}`}><b>{c.title}</b></Link></td>
                  <td>{catLabel(c.category)}</td>
                  <td>{c.slide_count || <span className="warn-text">Upload</span>}</td>
                  <td>{(c.modules as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
                  <td>{qs.length}{flagged > 0 && <span className="chip chip--warn chip--sm">{flagged} to review</span>}</td>
                  <td>{c.certificate_price_usd != null ? usd(c.certificate_price_usd) : <span className="warn-text">Set price</span>}</td>
                  <td>{c.published ? <span className="chip chip--green chip--sm">Live</span> : <span className="chip chip--sm">Draft</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
