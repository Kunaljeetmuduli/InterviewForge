import type { Metadata } from "next";

import { InterviewSetup } from "@/components/interview-setup";

export const metadata: Metadata = { title: "Interviews" };

export default function NewInterviewPage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">Adaptive practice</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Interviews</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Run a focused text interview that adjusts topic and difficulty from your submitted answers.</p>
      <InterviewSetup />
    </>
  );
}
