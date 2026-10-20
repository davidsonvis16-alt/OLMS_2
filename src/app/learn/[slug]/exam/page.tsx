import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { notFound, redirect } from "@/lib/server/http";
import { AppShell } from "@/components/app-shell";
import { ExamClient } from "@/components/exam-client";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { courseState } from "@/lib/learning";
import { PASS } from "@/lib/learning-rules";
import { loadQuestions, toPublic } from "@/lib/grading";
import { supabaseAdmin } from "@/lib/supabase";
import { openTest, testHref } from "@/lib/test-lock";

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  const { user } = await requireUser(`/learn/${slug}/exam`);
  const s = await courseState(user.id, slug);
  if (!s) notFound();
  if (!s.enrolled || !s.allDone) redirect(`/learn/${slug}`);
  const lock = await openTest(supabaseAdmin(), user.id, s.course.id);
  if (lock?.module_id) redirect(testHref(slug, lock, s.modules)); // a knowledge check is open: finish that first
  const qs = (await loadQuestions({ courseId: s.course.id, finalOnly: true })).map(toPublic);
  return { slug, s: { course: { id: s.course.id, title: s.course.title }, bestScore: s.bestScore }, started: !!lock, qs };
}

export default function ExamPage() {
  const { slug, s, started, qs } = useLoaderData<typeof loader>();
  return (
    <AppShell active="dashboard">
      <div className="learn-head learn-head--exam">
        <span className="eyebrow">Final assessment</span>
        <h1>{s.course.title}</h1>
        <ul className="facts">
          <li><Icon name="clipboard" />{qs.length} questions from every module</li>
          <li><Icon name="award" />{PASS}% to pass</li>
          <li><Icon name="check" />Unlimited retakes{s.bestScore != null ? ` · your best so far: ${s.bestScore}%` : ""}</li>
        </ul>
      </div>
      <ExamClient courseId={s.course.id} slug={slug} questions={qs} passMark={PASS} started={started} />
    </AppShell>
  );
}
