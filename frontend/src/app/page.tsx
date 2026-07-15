import { ArrowRight, CheckCircle2 } from "lucide-react";

import { ProductPreview } from "@/components/product-preview";
import { SiteHeader } from "@/components/site-header";

const principles = [
  {
    title: "Practice with context",
    detail:
      "Use a resume and pasted job description to focus each session on the role you want.",
  },
  {
    title: "Understand every score",
    detail:
      "Structured feedback points to evidence, gaps, and a concrete way to improve the answer.",
  },
  {
    title: "Adapt without guesswork",
    detail:
      "A versioned deterministic engine selects the next topic and difficulty after each evaluation.",
  },
] as const;

export default function HomePage() {
  return (
    <div id="top" className="min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="relative px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-12 lg:pb-28">
          <div
            className="preview-grid pointer-events-none absolute inset-x-0 top-0 -z-0 h-[560px] opacity-45"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary">
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Evidence-led adaptive practice
              </div>
              <h1 className="text-balance text-[2.5rem] font-bold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-[3.75rem]">
                Practice the interview you&apos;ll actually face.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                InterviewForge turns your experience, target role, and answers
                into focused practice—then shows what worked, what did not, and
                what to work on next.
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <a
                  href="#product-preview"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:translate-y-px"
                >
                  Explore the product
                  <ArrowRight aria-hidden="true" className="size-4" />
                </a>
                <a
                  href="#foundation"
                  className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground hover:border-slate-300 hover:bg-surface-subtle"
                >
                  View the foundation
                </a>
              </div>
            </div>

            <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface px-2 py-4 surface-shadow sm:mt-14">
              <div className="px-3 text-center sm:px-6">
                <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  5 / 10
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                  question formats
                </p>
              </div>
              <div className="px-3 text-center sm:px-6">
                <p className="font-mono text-lg font-semibold text-foreground">
                  adaptive-v1
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                  stable engine
                </p>
              </div>
              <div className="px-3 text-center sm:px-6">
                <p className="text-lg font-semibold text-foreground">Text first</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                  voice optional
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="product-preview"
          aria-labelledby="preview-heading"
          className="scroll-mt-24 border-y border-border bg-surface-subtle px-5 py-20 sm:px-8 lg:px-12 lg:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-primary">Product scene</p>
                <h2
                  id="preview-heading"
                  className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
                >
                  A calm place to see progress clearly.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
                The dashboard prioritizes trend, topic mastery, and the next
                practice action—without points, streak pressure, or a fake
                hiring verdict.
              </p>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section
          id="principles"
          aria-labelledby="principles-heading"
          className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <p className="text-sm font-semibold text-primary">How it helps</p>
                <h2
                  id="principles-heading"
                  className="mt-3 max-w-md text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
                >
                  Feedback that ends with a next step.
                </h2>
                <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                  Each screen supports a single task. Each evaluation separates
                  evidence from suggestion. Each weak area becomes a focused
                  practice direction.
                </p>
              </div>

              <div className="divide-y divide-border border-y border-border">
                {principles.map((principle, index) => (
                  <article
                    key={principle.title}
                    className="grid gap-3 py-7 sm:grid-cols-[3rem_1fr] sm:gap-5"
                  >
                    <span className="font-mono text-sm font-medium text-primary">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.015em]">
                        {principle.title}
                      </h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                        {principle.detail}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="foundation"
          aria-labelledby="foundation-heading"
          className="border-t border-border bg-surface px-5 py-16 sm:px-8 lg:px-12"
        >
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Foundation milestone</p>
              <h2
                id="foundation-heading"
                className="mt-2 text-2xl font-semibold tracking-[-0.025em]"
              >
                Product decisions are locked before integrations begin.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                The current build establishes architecture, design, accessibility,
                and service health. Authentication, data migrations, and AI arrive
                as separately verified vertical milestones.
              </p>
            </div>
            <ul className="flex shrink-0 flex-wrap gap-2" aria-label="MVP scope locks">
              {["Paste-only JD", "Quick 5", "Full 10", "WCAG AA"].map(
                (item) => (
                  <li
                    key={item}
                    className="rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>InterviewForge · Forge your skills. Ace every round.</p>
          <p>Preparation guidance, never a hiring verdict.</p>
        </div>
      </footer>
    </div>
  );
}
