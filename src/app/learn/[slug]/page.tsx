import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { courseState, moduleUnlocked, moduleSlides, PASS } from "@/lib/learning";
import { supabaseAdmin } from "@/lib/supabase";
import { catLabel } from "@/lib/site";
import { saveAssignment } from "@/app/actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ assignment?: string }> };

export default async function LearnCourse({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { user } = await requireUser(`/learn/${slug}`);
  let s = await courseState(user.id, slug);
  if (!s || (!s.course.published && !s.enrolled)) notFound();
  if (!s.enrolled) {
    await supabaseAdmin().from("enrollments").upsert({ user_id: user.id, course_id: s.course.id }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
    s = (await courseState(user.id, slug))!;
  }
  const next = s.modules.find((m) => !s!.progress.get(m.id)?.completed_at);

  return (
    <AppShell active="dashboard">
      <div className="learn-head">
        <Link href="/dashboard" className="crumb crumb--dark"><Icon name="back" />My learning</Link>
        <span className="eyebrow">{catLabel(s.course.category)} · {s.done} of {s.total} modules complete</span>
        <h1>{s.course.title}</h1>
        <div className="progress-line">
          <div className="meter meter--lg" role="progressbar" aria-label="Course progress" aria-valuenow={s.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${s.percent}%` }} /></div>
          <b>{s.percent}%</b>
        </div>
        <div className="learn-actions">
          {s.certificate
            ? <Link className="cta" href="/certificates"><span>View your certificate</span><i><Icon name="arrow" /></i></Link>
            : s.passed
              ? <Link className="cta" href={`/learn/${slug}/certificate`}><span>Claim your certificate</span><i><Icon name="arrow" /></i></Link>
              : next
                ? <Link className="cta" href={`/learn/${slug}/m/${next.position}`}><span>{s.done === 0 ? "Start" : "Continue"}: {next.title}</span><i><Icon name="arrow" /></i></Link>
                : <Link className="cta" href={`/learn/${slug}/exam`}><span>Take the final assessment</span><i><Icon name="arrow" /></i></Link>}
        </div>
      </div>

      <ol className="track" aria-label="Modules">
        {s.modules.map((m, i) => {
          const p = s!.progress.get(m.id);
          const open = moduleUnlocked(s!, m.position);
          const slides = moduleSlides(m).length;
          const hasSlides = s!.course.slide_count > 0;
          const status = p?.completed_at ? "done" : open ? (p ? "active" : "open") : "locked";
          return (
            <li key={m.id} className={`tr tr--${status}`}>
              <span className="tr-n" aria-hidden="true">{status === "done" ? <Icon name="check" /> : status === "locked" ? <Icon name="lock" /> : String(i + 1).padStart(2, "0")}</span>
              <div>
                <b>{m.title}</b>
                <small>
                  {status === "done" ? "Complete" : status === "locked" ? "Locked" : status === "active" ? "In progress" : "Ready"}
                  {hasSlides ? ` · ${slides} slides` : ""}{m.video_url ? " · video" : ""}
                  {p?.quiz_best != null && ` · knowledge check ${p.quiz_best}%`}
                  {status === "active" && p && hasSlides && ` · slide ${Math.min(p.viewed_upto, slides)} of ${slides}`}
                </small>
              </div>
              {open
                ? <Link className={`btn btn--sm ${status === "done" ? "btn--line" : "btn--go"}`} href={`/learn/${slug}/m/${m.position}`}>{status === "done" ? "Review" : status === "active" ? "Continue" : "Start"}<span className="sr-only"> {m.title}</span></Link>
                : <span className="muted">Finish module {i} first</span>}
            </li>
          );
        })}
        <li className={`tr tr--final ${s.passed ? "tr--done" : s.allDone ? "tr--open" : "tr--locked"}`}>
          <span className="tr-n" aria-hidden="true">{s.passed ? <Icon name="check" /> : "FA"}</span>
          <div>
            <b>Final assessment</b>
            <small>{PASS}% to pass · unlimited retakes{s.attempts > 0 && ` · ${s.attempts} attempt${s.attempts > 1 ? "s" : ""}, best ${s.bestScore}%`}</small>
          </div>
          {s.allDone
            ? <Link className={`btn btn--sm ${s.passed ? "btn--line" : "btn--go"}`} href={`/learn/${slug}/exam`}>{s.passed ? "Retake" : s.attempts ? "Try again" : "Start"}</Link>
            : <span className="muted">Finish every module first</span>}
        </li>
      </ol>

      {s.course.assignment && (
        <section className="note-card" aria-labelledby="assign-title">
          <span className="eyebrow">Course assignment</span>
          <h3 id="assign-title" style={{ marginTop: 10 }}>Put it into practice</h3>
          <p>{s.course.assignment}</p>
          {sp.assignment === "saved" && <p className="alert alert--ok" role="status">Assignment saved. Your trainer can read it.</p>}
          <form action={saveAssignment}>
            <input type="hidden" name="course_id" value={s.course.id} />
            <input type="hidden" name="slug" value={slug} />
            <div className="field"><label htmlFor="body">Your answer</label><textarea id="body" name="body" rows={8} defaultValue={s.assignment?.body ?? ""} placeholder="Write your answer here. You can save it and come back to it." /></div>
            <button className="btn btn--ink" type="submit">Save assignment</button>
          </form>
        </section>
      )}
    </AppShell>
  );
}
