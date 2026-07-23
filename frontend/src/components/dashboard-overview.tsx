"use client";

import { ArrowRight, BookOpenCheck, ChartNoAxesCombined, CircleAlert, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  dashboardApi,
  interviewApi,
  type DashboardSummary,
  type Interview,
  type ProgressPoint,
  type TopicMastery,
} from "@/lib/api-client";

export function DashboardOverview() {
  const [data, setData] = useState<{
    summary: DashboardSummary;
    mastery: TopicMastery[];
    progress: ProgressPoint[];
    recent: Interview[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      dashboardApi.summary(),
      dashboardApi.mastery(),
      dashboardApi.progress(),
      interviewApi.list(),
    ])
      .then(([summary, mastery, progress, interviews]) => {
        if (active) setData({ summary, mastery: mastery.topics, progress, recent: interviews.slice(0, 5) });
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Dashboard data could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p role="alert" className="mt-8 rounded-sm bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p>;
  if (!data) return <div aria-label="Loading dashboard" className="mt-8 grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-lg bg-surface-subtle" />)}</div>;

  const metrics = [
    { label: "Interviews taken", value: data.summary.interviewsTaken, icon: BookOpenCheck },
    { label: "Average score", value: data.summary.averageScore === null ? "—" : `${data.summary.averageScore}%`, icon: ChartNoAxesCombined },
    { label: "Strong areas", value: data.summary.strongAreas, icon: Target },
    { label: "Areas to improve", value: data.summary.areasToImprove, icon: CircleAlert },
  ];

  return (
    <div className="mt-8 space-y-6">
      <section aria-label="Preparation summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <Icon aria-hidden="true" className="size-5 text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </section>

      {data.progress.length === 0 ? (
        <section className="rounded-lg border border-border bg-surface p-8 shadow-sm">
          <h2 className="text-xl font-semibold">Your progress will appear here</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Complete an interview to build score trends, topic mastery, and a focused roadmap.</p>
          <Link href="/interviews/new" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-5 text-sm font-semibold text-primary-foreground">Start practice <ArrowRight aria-hidden="true" className="size-4" /></Link>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
          <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Overall progress</h2>
            <p className="mt-1 text-sm text-muted-foreground">Completed interview scores in chronological order.</p>
            <div className="mt-5 h-72" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.progress}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                  <XAxis dataKey="completedAt" tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip labelFormatter={(value) => new Date(String(value)).toLocaleDateString()} formatter={(value) => [`${value}%`, "Score"]} />
                  <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--surface)", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ol className="sr-only">
              {data.progress.map((point) => <li key={point.interviewId}>{new Date(point.completedAt).toLocaleDateString()}: {point.type} interview, {point.score}%</li>)}
            </ol>
          </section>
          <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Topic mastery</h2>
              <Link href="/roadmap" className="text-sm font-semibold text-primary">View roadmap</Link>
            </div>
            <ul className="mt-5 space-y-4">
              {data.mastery.slice(0, 6).map((topic) => (
                <li key={topic.topic}>
                  <div className="flex justify-between gap-3 text-sm"><span className="font-medium">{topic.topic}</span><span className="font-mono">{topic.score}%</span></div>
                  <div className="mt-2 h-2 rounded-full bg-surface-subtle"><div className="h-2 rounded-full bg-primary" style={{ width: `${topic.score}%` }} /></div>
                  <p className="mt-1 text-xs text-muted-foreground">{topic.classification} · {topic.answerCount} answer{topic.answerCount === 1 ? "" : "s"}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Recent interviews</h2><Link href="/history" className="text-sm font-semibold text-primary">View history</Link></div>
        {data.recent.length ? (
          <ul className="mt-4 divide-y divide-border">
            {data.recent.map((interview) => <li key={interview.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold capitalize">{interview.type === "dsa" ? "DSA verbal" : interview.type}</p><p className="mt-1 text-sm text-muted-foreground">{interview.question_limit}-question format · {interview.status}</p></div>{interview.status === "completed" ? <Link href={`/reports/${interview.id}`} className="text-sm font-semibold text-primary">Report</Link> : null}</li>)}
          </ul>
        ) : <p className="mt-4 text-sm text-muted-foreground">No interview history yet.</p>}
      </section>
    </div>
  );
}
