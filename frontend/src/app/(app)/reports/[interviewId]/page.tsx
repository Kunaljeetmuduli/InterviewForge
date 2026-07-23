import type { Metadata } from "next";

import { InterviewReport } from "@/components/interview-report";

export const metadata: Metadata = { title: "Interview Report" };

export default async function ReportPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  return <InterviewReport interviewId={interviewId} />;
}
