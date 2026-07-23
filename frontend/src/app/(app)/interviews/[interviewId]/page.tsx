import type { Metadata } from "next";

import { InterviewWorkspace } from "@/components/interview-workspace";

export const metadata: Metadata = { title: "Interview" };

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  return <InterviewWorkspace interviewId={interviewId} />;
}
