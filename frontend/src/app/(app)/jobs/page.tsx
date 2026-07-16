import type { Metadata } from "next";

import { JobDescriptionManager } from "@/components/job-description-manager";

export const metadata: Metadata = { title: "Job Descriptions" };

export default function JobDescriptionsPage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">Preparation context</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Job Descriptions</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Extract role requirements from pasted text and compare them with a completed resume analysis.</p>
      <JobDescriptionManager />
    </>
  );
}
