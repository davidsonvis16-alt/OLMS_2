"use client";
import Link from "next/link";
import { useState } from "react";
import type { PublicQuestion } from "@/lib/grading";
import { Quiz } from "./quiz";
import { Icon } from "./icons";

export function ExamClient({ courseId, slug, questions, passMark }: { courseId: string; slug: string; questions: PublicQuestion[]; passMark: number }) {
  const [passed, setPassed] = useState(false);
  return (
    <>
      <Quiz questions={questions} mode="exam" passMark={passMark} endpointBody={{ type: "exam", courseId }} onDone={(r) => setPassed("passed" in r && r.passed)} />
      {passed && (
        <div className="next-card next-card--win">
          <div><small>Assessment passed</small><b>Claim your Aspire certificate</b></div>
          <Link className="cta" href={`/learn/${slug}/certificate`}><span>Claim certificate</span><i><Icon name="arrow" /></i></Link>
        </div>
      )}
    </>
  );
}
