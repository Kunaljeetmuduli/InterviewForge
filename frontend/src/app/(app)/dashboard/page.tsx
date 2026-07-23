import type { Metadata } from "next";

import { DashboardOverview } from "@/components/dashboard-overview";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">Preparation overview</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Dashboard</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
        Track interview performance, topic mastery, and your next focused practice step.
      </p>
      <DashboardOverview />
    </>
  );
}
