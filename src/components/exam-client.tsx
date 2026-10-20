import Link from "@/components/link";
import { useState } from "react";
import type { PublicQuestion } from "@/lib/grading";
import { Quiz } from "./quiz";
import { Icon } from "./icons";

export function ExamClient({ courseId, slug, questions, passMark, started }: { courseId: string; slug: string; questions: PublicQuestion[]; passMark: number; started: boolean }) {
  const [passed, setPassed] = useState(false);
  const [open, setOpen] = useState(started);
  return (
    <>
      {!open && <Link href={`/learn/${slug}`} className="crumb"><Icon name="back" />Back to the course</Link>}
      <Quiz questions={questions} mode="exam" passMark={passMark} endpointBody={{ type: "exam", courseId }} startBody={{ type: "start", courseId }} started={started}
        onStart={() => setOpen(true)} onDone={(r) => { setOpen(false); setPassed("passed" in r && r.passed); }} />
      {passed && (
        <div className="next-card next-card--win">
          <div><small>Assessment passed</small><b>Claim your Aspire certificate</b></div>
          <Link className="cta" href={`/learn/${slug}/certificate`}><span>Claim certificate</span><i><Icon name="arrow" /></i></Link>
        </div>
      )}
    </>
  );
}
