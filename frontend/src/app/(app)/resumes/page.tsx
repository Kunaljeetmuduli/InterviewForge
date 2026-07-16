import type { Metadata } from "next";

import { ResumeAnalysisManager } from "@/components/resume-analysis-manager";

export const metadata: Metadata = { title: "Resume Analysis" };

export default function ResumesPage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">Preparation context</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
        Resume Analysis
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
        Upload a text-based PDF resume to keep your interview preparation
        grounded in your actual experience.
      </p>
      <ResumeAnalysisManager />
    </>
  );
}
