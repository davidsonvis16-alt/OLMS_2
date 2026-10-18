import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { catLabel, companyActive, coursePhoto } from "@/lib/site";

export const metadata: Metadata = { title: "My learning" };

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Nairobi" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Dashboard() {
  const { user, profile } = await requireUser();
  const db = supabaseAdmin();
  const [enr, prog, passed, certs, all, company] = await Promise.all([
    db.from("enrollments").select("created_at, courses(id,slug,title,category, modules(id))").eq("user_id", user.id).order("created_at", { ascending: false }),
    db.from("module_progress").select("course_id,completed_at").eq("user_id", user.id),
    db.from("exam_attempts").select("course_id").eq("user_id", user.id).eq("passed", true),
    db.from("certificates").select("course_id,serial").eq("user_id", user.id),
    db.from("courses").select("id,slug,title,category,summary").eq("published", true).order("sort"),
    profile.company_id ? db.from("companies").select("name,paid_until").eq("id", profile.company_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  type E = { courses: { id: string; slug: string; title: string; category: string; modules: { id: string }[] } };
  const enrolled = ((enr.data ?? []) as unknown as E[]).map((e) => e.courses).filter(Boolean);
  const doneBy = new Map<string, number>();
  for (const p of prog.data ?? []) if (p.completed_at) doneBy.set(p.course_id, (doneBy.get(p.course_id) ?? 0) + 1);
  const passedSet = new Set((passed.data ?? []).map((p) => p.course_id));
  const certBy = new Map((certs.data ?? []).map((c) => [c.course_id, c.serial]));
  const others = (all.data ?? []).filter((c) => !enrolled.some((e) => e.id === c.id)).slice(0, 3);
  const firstName = (profile.full_name || "").split(" ")[0];

  return (
    <AppShell active="dashboard">
      <div className="page-head">
        <div>
          <span className="eyebrow">My learning · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
          <h1 className="greet">{greeting()}{firstName ? <>,<br /><span className="gtext">{firstName}.</span></> : "."}</h1>
        </div>
        <div className="page-head-actions"><Link className="btn btn--line btn--sm" href="/courses">Browse courses <Icon name="arrow" /></Link></div>
      </div>

      {(!profile.full_name || !profile.id_number) && (
        <div className="alert alert--info row-alert">
          <Icon name="id" />
          <span>Add your <b>full name</b> and <b>ID or passport number</b> exactly as they should appear on your certificates.</span>
          <Link className="btn btn--sm btn--ink" href="/account?next=/dashboard">Complete profile</Link>
        </div>
      )}
      {company.data && (
        <div className={`alert ${companyActive(company.data) ? "alert--ok" : "alert--warn"} row-alert`}>
          <Icon name="users" />
          <span>You&apos;re training with <b>{company.data.name}</b>. {companyActive(company.data) ? "Your certificates are covered by your company." : "Your company account has expired, so certificates are paid individually until it is renewed."}</span>
        </div>
      )}

      <div className="stat-row">
        <div className="stat"><b>{enrolled.length}</b><span>Courses started</span></div>
        <div className="stat"><b>{passedSet.size}</b><span>Assessments passed</span></div>
        <div className="stat"><b>{certBy.size}</b><span>Certificates</span></div>
      </div>

      <h2 className="section-title"><span>Your courses</span><span>{enrolled.length}</span></h2>
      {enrolled.length === 0 ? (
        <div className="empty-card">
          <Icon name="book" />
          <h3>Nothing started yet.</h3>
          <p>Every course is free to study. Pick one and finish your first module before your next shift.</p>
          <Link className="btn btn--go" href="/courses">Find a course <Icon name="arrow" /></Link>
        </div>
      ) : (
        <div className="mycourses">
          {enrolled.map((c) => {
            const total = c.modules.length;
            const done = doneBy.get(c.id) ?? 0;
            const pass = passedSet.has(c.id);
            const pct = total ? Math.round(((done + (pass ? 1 : 0)) / (total + 1)) * 100) : 0;
            const state = certBy.has(c.id) ? "Certified" : pass ? "Passed · claim your certificate" : done === total && total > 0 ? "Ready for the final assessment" : `${done} of ${total} modules · ${pct}%`;
            return (
              <Link className="mc" href={`/learn/${c.slug}`} key={c.id}>
                <div className="mc-pic"><img src={coursePhoto(c.slug, c.category)} alt="" loading="lazy" /></div>
                <div>
                  <span className="micro">{catLabel(c.category)}</span>
                  <h3>{c.title}</h3>
                </div>
                <div className="mc-state">
                  <div className="meter" role="progressbar" aria-label={`${c.title} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></div>
                  <small className={certBy.has(c.id) || pass ? "ok" : ""}>{state}</small>
                </div>
                <Icon name="arrow" />
              </Link>
            );
          })}
        </div>
      )}

      {others.length > 0 && (
        <>
          <h2 className="section-title"><span>Start something new</span><Link href="/courses" className="text-link" style={{ font: "inherit" }}>All courses</Link></h2>
          <div className="more-list">
            {others.map((c) => (
              <Link href={`/courses/${c.slug}`} key={c.id}>
                <span className="micro">{catLabel(c.category)}</span>
                <h3>{c.title}</h3>
                <p>{c.summary}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
