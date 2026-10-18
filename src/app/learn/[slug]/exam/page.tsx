import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ExamClient } from "@/components/exam-client";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { courseState, PASS } from "@/lib/learning";
import { loadQuestions, toPublic } from "@/lib/grading";

type Props = { params: Promise<{ slug: string }> };

export default async function ExamPage({ params }: Props) {
  const { slug } = await params;
  const { user } = await requireUser(`/learn/${slug}/exam`);
  const s = await courseState(user.id, slug);
  if (!s) notFound();
  if (!s.enrolled || !s.allDone) redirect(`/learn/${slug}`);
  const qs = (await loadQuestions({ courseId: s.course.id, finalOnly: true })).map(toPublic);
  return (
    <AppShell active="dashboard">
      <div className="learn-head learn-head--exam">
        <Link href={`/learn/${slug}`} className="crumb crumb--dark"><Icon name="back" />{s.course.title}</Link>
        <span className="eyebrow">Final assessment</span>
        <h1>{s.course.title}</h1>
        <ul className="facts">
          <li><Icon name="clipboard" />{qs.length} questions from every module</li>
          <li><Icon name="award" />{PASS}% to pass</li>
          <li><Icon name="check" />Unlimited retakes{s.bestScore != null ? ` · your best so far: ${s.bestScore}%` : ""}</li>
        </ul>
      </div>
      <ExamClient courseId={s.course.id} slug={slug} questions={qs} passMark={PASS} />
    </AppShell>
  );
}
