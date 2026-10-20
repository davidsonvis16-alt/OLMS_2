import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { courseState, moduleUnlocked, moduleSlides } from "@/lib/learning";
import { loadQuestions, toPublic } from "@/lib/grading";
import { slideUrl, supabaseAdmin } from "@/lib/supabase";
import { openTest, testHref } from "@/lib/test-lock";
import { ModulePlayer } from "@/components/module-player";
import { safeVideoUrl } from "@/lib/video";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.

type Props = { params: Promise<{ slug: string; position: string }> };

export default async function ModulePage({ params }: Props) {
  const { slug, position } = await params;
  const { user } = await requireUser(`/learn/${slug}/m/${position}`);
  const s = await courseState(user.id, slug);
  if (!s) notFound();
  if (!s.enrolled) redirect(`/learn/${slug}`);
  const pos = Number(position);
  const idx = s.modules.findIndex((m) => m.position === pos);
  if (idx < 0) notFound();
  if (!moduleUnlocked(s, pos)) redirect(`/learn/${slug}`);
  const m = s.modules[idx];
  // A test is open in this course: its slides stay closed until it is submitted.
  const lock = await openTest(supabaseAdmin(), user.id, s.course.id);
  if (lock && lock.module_id !== m.id) redirect(testHref(slug, lock, s.modules));
  const testing = !!lock;
  const pages = moduleSlides(m);
  const qs = (await loadQuestions({ moduleId: m.id })).map(toPublic);
  const p = s.progress.get(m.id);
  const next = s.modules[idx + 1];

  return (
    <ModulePlayer
      course={{ id: s.course.id, slug, title: s.course.title }}
      module={{ id: m.id, title: m.title, index: idx + 1, total: s.modules.length, video: safeVideoUrl(m.video_url) }}
      slides={testing ? [] : s.course.slide_count > 0 ? pages.map((n) => slideUrl(s.course.id, s.course.slides_version, n)) : []}
      startAt={p?.completed_at ? 0 : Math.min(Math.max((p?.viewed_upto ?? 1) - 1, 0), Math.max(pages.length - 1, 0))}
      questions={qs}
      completed={!!p?.completed_at}
      nextHref={next ? `/learn/${slug}/m/${next.position}` : `/learn/${slug}/exam`}
      nextLabel={next ? `Next module: ${next.title}` : "Go to the final assessment"}
      testOpen={testing}
    />
  );
}
