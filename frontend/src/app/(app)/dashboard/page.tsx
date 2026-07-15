import type { Metadata } from "next";

import { ProfileStatusCard } from "@/components/profile-status-card";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">Workspace</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Dashboard</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
        Review your preparation context and continue from the next available
        step in your workspace.
      </p>
      <ProfileStatusCard />
    </>
  );
}
