import type { Metadata } from "next";

import { InterviewHistory } from "@/components/interview-history";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return <><p className="text-sm font-semibold text-primary">Practice history</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Interview history</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Revisit completed reports or permanently remove interview records you no longer need.</p><InterviewHistory /></>;
}
