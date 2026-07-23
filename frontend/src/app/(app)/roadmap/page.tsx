import type { Metadata } from "next";

import { RoadmapManager } from "@/components/roadmap-manager";

export const metadata: Metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  return <><p className="text-sm font-semibold text-primary">Personalized practice</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Roadmap</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Focus on the topics where recent evaluated answers show the greatest opportunity to improve.</p><RoadmapManager /></>;
}
