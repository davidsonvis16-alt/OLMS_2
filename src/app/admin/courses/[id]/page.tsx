import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHead } from "@/components/app-shell";
import { SlideUploader } from "@/components/slide-uploader";
import { Icon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin, slideUrl } from "@/lib/supabase";
import { CATEGORIES, pagesOf } from "@/lib/site";
import { AdminNav } from "../../admin-nav";
import { deleteCourse, deleteModule, deleteQuestion, saveCourse, saveModule, saveQuestion } from "../../actions";

type Q = { id: string; module_id: string | null; position: number; prompt: string; options: string[]; answer: number[]; review_note: string | null; source: string | null; in_final: boolean };
type M = { id: string; position: number; title: string; page_from: number; page_to: number; extra_pages: number[]; video_url: string | null };

export default async function EditCourse({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const db = supabaseAdmin();
  const { data: c } = await db.from("courses").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: mods }, { data: qs }] = await Promise.all([
    db.from("modules").select("*").eq("course_id", id).order("position"),
    db.from("questions").select("*").eq("course_id", id).order("position"),
  ]);
  const modules = (mods ?? []) as M[];
  const questions = (qs ?? []) as Q[];
  const flagged = questions.filter((q) => q.review_note);

  return (
    <AppShell active="admin" wide>
      <PageHead eyebrow="Edit course" title={c.title}>
        {c.published && <Link className="btn btn--outline btn--sm" href={`/courses/${c.slug}`} target="_blank">View live</Link>}
      </PageHead>
      <AdminNav active="courses" />
      {sp.saved && <p className="alert alert--ok">Saved.</p>}
      {sp.error && <p className="alert alert--error">{sp.error}</p>}

      <nav className="jump"><a href="#details">Details</a><a href="#slides">Slides</a><a href="#modules">Modules</a><a href="#questions">Questions{flagged.length ? ` (${flagged.length} to review)` : ""}</a></nav>

      {/* DETAILS */}
      <form action={saveCourse} className="form-card" id="details">
        <input type="hidden" name="id" value={c.id} />
        <h3>Details</h3>
        <div className="form-grid">
          <div className="field field--full"><label>Title</label><input name="title" defaultValue={c.title} required /></div>
          <div className="field"><label>URL slug</label><input name="slug" defaultValue={c.slug} /></div>
          <div className="field"><label>Sort order</label><input name="sort" type="number" defaultValue={c.sort} /></div>
          <div className="field"><label>Main category</label>
            <select name="category" defaultValue={c.category}>{CATEGORIES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
          </div>
          <div className="field"><label>Also show under</label>
            <div className="checks">{CATEGORIES.map((x) => <label key={x.id} className="check"><input type="checkbox" name="categories" value={x.id} defaultChecked={c.categories?.includes(x.id)} /><span>{x.label}</span></label>)}</div>
          </div>
          <div className="field field--full"><label>Short description</label><textarea name="summary" rows={3} defaultValue={c.summary ?? ""} /></div>
          <div className="field field--full"><label>Key topics (one per line; first 3 show on the course card)</label><textarea name="topics" rows={4} defaultValue={(c.topics ?? []).join("\n")} /></div>
          <div className="field field--full"><label>Course assignment (optional, shown to learners)</label><textarea name="assignment" rows={3} defaultValue={c.assignment ?? ""} /></div>
          <div className="field"><label>Certificate fee (USD)</label><input name="certificate_price_usd" type="number" min={0} step="0.01" defaultValue={c.certificate_price_usd ?? ""} placeholder="Not set" /><small className="muted">Empty = learners are asked to contact you. 0 = free.</small></div>
          <div className="field"><label>&nbsp;</label><label className="check"><input type="checkbox" name="published" defaultChecked={c.published} /><span>Published (visible to learners)</span></label></div>
        </div>
        <div className="form-actions"><button className="btn btn--green">Save details</button></div>
      </form>

      {/* SLIDES */}
      <section className="form-card" id="slides">
        <h3>Slides</h3>
        <SlideUploader courseId={c.id} version={c.slides_version} count={c.slide_count} />
        {c.slide_count > 0 && (
          <div className="thumbs">
            {Array.from({ length: c.slide_count }, (_, i) => i + 1).map((n) => {
              const mod = modules.find((m) => pagesOf(m).includes(n));
              return (
                <a key={n} href={slideUrl(c.id, c.slides_version, n)} target="_blank" rel="noopener" className={`thumb${mod ? "" : " is-unused"}`} title={mod ? `Module ${mod.position}: ${mod.title}` : "Not in any module (e.g. a quiz slide)"}>
                  <img src={slideUrl(c.id, c.slides_version, n)} alt={`Slide ${n}`} loading="lazy" />
                  <span>{n}{mod ? ` · M${mod.position}` : ""}</span>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* MODULES */}
      <section className="form-card" id="modules">
        <h3>Modules</h3>
        <p>Each module shows a range of slides, then its knowledge check. Leave quiz slides out of the ranges; the quiz is interactive. Video: paste a Bunny Stream (or YouTube) embed URL.</p>
        <div className="mod-rows">
          {[...modules, null].map((m, i) => (
            <form action={saveModule} className={`mod-row${m ? "" : " mod-row--new"}`} key={m?.id ?? "new"}>
              <input type="hidden" name="course_id" value={c.id} />
              <input type="hidden" name="id" value={m?.id ?? ""} />
              <span className="mnum">{m ? m.position : "+"}</span>
              <input name="title" defaultValue={m?.title ?? ""} placeholder={m ? "" : "New module title"} aria-label="Module title" required={!m} />
              <label className="tiny">Slides<input name="page_from" type="number" min={1} defaultValue={m?.page_from ?? 1} />–<input name="page_to" type="number" min={1} defaultValue={m?.page_to ?? 1} /></label>
              <input name="extra_pages" defaultValue={m?.extra_pages?.join(", ") ?? ""} placeholder="extra slides e.g. 73" aria-label="Extra slides" className="w-sm" />
              <input name="video_url" defaultValue={m?.video_url ?? ""} placeholder="Video embed URL (optional)" aria-label="Video URL" className="w-md" />
              <button className="btn btn--sm btn--green">{m ? "Save" : "Add"}</button>
              {m && <button className="link-btn danger" formAction={deleteModule} formNoValidate>Delete</button>}
              {i === 0 && null}
            </form>
          ))}
        </div>
      </section>

      {/* QUESTIONS */}
      <section className="form-card" id="questions">
        <h3>Questions</h3>
        <p>Options one per line. &ldquo;Correct&rdquo; is the option number(s), e.g. <code>2</code> or <code>1,3</code> for select-all-that-apply. Questions ticked &ldquo;final&rdquo; are used in the final assessment.</p>
        {flagged.length > 0 && <p className="alert alert--warn">{flagged.length} question{flagged.length > 1 ? "s need" : " needs"} review. Check the note, fix the answer if needed, then tick &ldquo;Reviewed&rdquo; and save.</p>}
        {[...modules.map((m) => ({ m, list: questions.filter((q) => q.module_id === m.id) })), { m: null as M | null, list: questions.filter((q) => !q.module_id) }].map(({ m, list }) => (
          (m || list.length > 0) && (
            <div key={m?.id ?? "none"} className="q-group">
              <h4>{m ? `Module ${m.position}: ${m.title}` : "Final assessment only"}</h4>
              {list.map((q) => <QuestionForm key={q.id} q={q} courseId={c.id} modules={modules} />)}
              <details className="q-add"><summary><Icon name="arrow" width={14} />Add a question{m ? ` to ${m.title}` : ""}</summary><QuestionForm courseId={c.id} modules={modules} moduleId={m?.id ?? ""} /></details>
            </div>
          )
        ))}
      </section>

      <form action={deleteCourse} className="danger-zone">
        <input type="hidden" name="id" value={c.id} />
        <span>Delete this course and all its modules and questions. Courses with issued certificates can only be unpublished.</span>
        <button className="btn btn--sm btn--outline danger">Delete course</button>
      </form>
    </AppShell>
  );
}

function QuestionForm({ q, courseId, modules, moduleId }: { q?: Q; courseId: string; modules: M[]; moduleId?: string }) {
  return (
    <form action={saveQuestion} className={`q-edit${q?.review_note ? " q-edit--flag" : ""}`} id={`q-${q?.id ?? "new"}`}>
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="id" value={q?.id ?? ""} />
      {q?.review_note && <p className="review-note"><b>Review:</b> {q.review_note}<input type="hidden" name="review_note" value={q.review_note} /></p>}
      <div className="field"><label>Question</label><textarea name="prompt" rows={2} defaultValue={q?.prompt ?? ""} required /></div>
      <div className="q-edit-grid">
        <div className="field"><label>Options (one per line)</label><textarea name="options" rows={Math.max(3, q?.options.length ?? 3)} defaultValue={q?.options.join("\n") ?? ""} required /></div>
        <div className="q-edit-side">
          <div className="field"><label>Correct option number(s)</label><input name="answer" defaultValue={q ? q.answer.map((a) => a + 1).join(",") : ""} required /></div>
          <div className="field"><label>Module</label>
            <select name="module_id" defaultValue={q?.module_id ?? moduleId ?? ""}>
              <option value="">Final assessment only</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.position}. {m.title}</option>)}
            </select>
          </div>
          <label className="check"><input type="checkbox" name="in_final" defaultChecked={q?.in_final ?? true} /><span>Use in final assessment</span></label>
          {q?.review_note && <label className="check"><input type="checkbox" name="clear_review" /><span>Reviewed, clear the flag</span></label>}
          <div className="row-btns">
            <button className="btn btn--sm btn--green">{q ? "Save" : "Add question"}</button>
            {q && <button className="link-btn danger" formAction={deleteQuestion} formNoValidate>Delete</button>}
          </div>
        </div>
      </div>
    </form>
  );
}
