import {
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Gauge,
  LayoutDashboard,
  MessageSquareText,
  Route,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Resume analysis", icon: FileText, active: false },
  { label: "Job description", icon: BriefcaseBusiness, active: false },
  { label: "Interviews", icon: MessageSquareText, active: false },
  { label: "Roadmap", icon: Route, active: false },
  { label: "Settings", icon: Settings, active: false },
] as const;

const metrics = [
  {
    label: "Interviews taken",
    value: "12",
    note: "3 this month",
    icon: ClipboardCheck,
    tone: "blue",
  },
  {
    label: "Average score",
    value: "72%",
    note: "Up 8%",
    icon: Gauge,
    tone: "violet",
  },
  {
    label: "Strong topics",
    value: "4",
    note: "React leads",
    icon: CheckCircle2,
    tone: "green",
  },
] as const;

const topics = [
  { label: "React", score: 84, tone: "success" },
  { label: "JavaScript", score: 76, tone: "primary" },
  { label: "System design", score: 58, tone: "warning" },
] as const;

const toneClasses = {
  blue: "bg-primary-soft text-primary",
  violet: "bg-accent-violet-soft text-accent-violet",
  green: "bg-success-soft text-success",
} as const;

const barClasses = {
  success: "bg-success",
  primary: "bg-primary",
  warning: "bg-warning",
} as const;

export function ProductPreview() {
  return (
    <div className="surface-shadow overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid min-h-[630px] lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-border bg-surface px-4 py-5 lg:flex lg:flex-col">
          <div className="px-2">
            <BrandMark />
          </div>
          <nav aria-label="Dashboard preview" className="mt-8">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.label}
                    aria-current={item.active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium ${
                      item.active
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-4.5" strokeWidth={2} />
                    {item.label}
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-auto rounded-md bg-surface-subtle p-3">
            <p className="text-xs font-semibold text-foreground">Next practice</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              System design · Quick 5
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex min-h-16 items-center justify-between border-b border-border px-4 sm:px-6">
            <div>
              <p className="text-sm font-semibold text-foreground">Dashboard</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Welcome back, Arjun
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-border bg-surface-subtle px-2.5 py-1 font-mono text-xs text-muted-foreground sm:inline">
                adaptive-v1
              </span>
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                AY
              </span>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <section
                    key={metric.label}
                    className="rounded-md border border-border bg-surface p-4"
                  >
                    <div
                      className={`inline-flex size-9 items-center justify-center rounded-sm ${toneClasses[metric.tone]}`}
                    >
                      <Icon aria-hidden="true" className="size-4.5" />
                    </div>
                    <p className="mt-4 text-xs font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <div className="mt-1 flex items-end justify-between gap-2">
                      <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                        {metric.value}
                      </p>
                      <p className="text-xs font-medium text-success-foreground">{metric.note}</p>
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <section className="rounded-md border border-border bg-surface p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">Interview progress</p>
                    <p className="mt-1 text-xs text-muted-foreground">Last 8 weeks</p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-success">
                    <TrendingUp aria-hidden="true" className="size-3.5" />
                    +18%
                  </div>
                </div>
                <div className="mt-6 h-44 rounded-sm bg-surface-subtle p-4">
                  <div
                    className="flex h-full items-end gap-2"
                    role="img"
                    aria-label="Score trend rising from 54 to 82 percent"
                  >
                    {[42, 48, 45, 56, 60, 66, 63, 72, 76, 82].map(
                      (height, index) => (
                        <div
                          key={`${height}-${index}`}
                          className="flex h-full flex-1 items-end"
                        >
                          <div
                            className={`w-full rounded-t-sm ${
                              index === 9 ? "bg-primary" : "bg-primary/25"
                            }`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-md border border-border bg-surface p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Start practice</p>
                  <Target aria-hidden="true" className="size-4 text-primary" />
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Choose the pace that fits today&apos;s session.
                </p>
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between rounded-sm border border-primary/25 bg-primary-soft p-3">
                    <div>
                      <p className="text-xs font-semibold text-primary">Quick practice</p>
                      <p className="mt-0.5 font-mono text-xs text-primary/80">5 questions</p>
                    </div>
                    <ChevronRight aria-hidden="true" className="size-4 text-primary" />
                  </div>
                  <div className="flex items-center justify-between rounded-sm border border-border p-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Full interview</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">10 questions</p>
                    </div>
                    <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </div>
                </div>
              </section>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <section className="rounded-md border border-border bg-surface p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 aria-hidden="true" className="size-4 text-primary" />
                    <p className="text-sm font-semibold">Topic mastery</p>
                  </div>
                  <span className="text-xs font-medium text-primary">View report</span>
                </div>
                <div className="mt-5 space-y-4">
                  {topics.map((topic) => (
                    <div key={topic.label}>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="font-medium text-foreground">{topic.label}</span>
                        <span className="font-mono text-muted-foreground">{topic.score}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                        <div
                          className={`h-full rounded-full ${barClasses[topic.tone]}`}
                          style={{ width: `${topic.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-border bg-surface p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles aria-hidden="true" className="size-4 text-accent-violet" />
                    <p className="text-sm font-semibold">Recommended next</p>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" />
                </div>
                <div className="mt-5 flex gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary-soft text-primary">
                    <BookOpenCheck aria-hidden="true" className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Practice system design</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Focus on trade-offs, capacity estimates, and explaining why
                      each component belongs.
                    </p>
                    <span className="mt-3 inline-flex rounded-full bg-warning-soft px-2 py-1 text-[11px] font-semibold text-amber-800">
                      Needs focused practice
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
