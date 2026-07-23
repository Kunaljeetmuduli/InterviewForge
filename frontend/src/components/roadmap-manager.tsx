"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { roadmapApi, type RoadmapResult } from "@/lib/api-client";

export function RoadmapManager() {
  const [result, setResult] = useState<RoadmapResult | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "saving">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void roadmapApi.latest()
      .then((latest) => {
        if (active) {
          setResult(latest);
          setState("ready");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Your roadmap could not be loaded.");
          setState("ready");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function generate(completedResourceIds = result?.roadmap.plan.filter((item) => item.completed).map((item) => item.resourceId) ?? []) {
    setState("saving");
    setError("");
    try {
      setResult(await roadmapApi.generate(completedResourceIds));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your roadmap could not be generated.");
    } finally {
      setState("ready");
    }
  }

  async function toggle(resourceId: string) {
    if (!result) return;
    const completed = new Set(
      result.roadmap.plan.filter((item) => item.completed).map((item) => item.resourceId),
    );
    if (completed.has(resourceId)) completed.delete(resourceId);
    else completed.add(resourceId);
    await generate([...completed]);
  }

  if (state === "loading") return <div aria-label="Loading roadmap" className="mt-8 h-72 animate-pulse rounded-lg bg-surface-subtle" />;

  return (
    <div className="mt-8">
      {error ? <p role="alert" className="mb-5 rounded-sm bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {!result || result.roadmap.focus_topics.length === 0 ? (
        <section className="rounded-lg border border-border bg-surface p-8 shadow-sm">
          <h2 className="text-xl font-semibold">{result ? "More practice evidence is needed" : "Generate your practice roadmap"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">The roadmap deterministically prioritizes up to three of your weakest evaluated topics and uses only curated resources.</p>
          <button type="button" onClick={() => void generate([])} disabled={state === "saving"} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"><RefreshCw aria-hidden="true" className="size-4" />{state === "saving" ? "Generating..." : "Generate roadmap"}</button>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Based on evaluated answers · {result.roadmap.algorithm_version}</p>
            <button type="button" onClick={() => void generate()} disabled={state === "saving"} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface px-4 text-sm font-semibold disabled:opacity-60"><RefreshCw aria-hidden="true" className="size-4" /> Refresh priorities</button>
          </div>
          <div className="mt-5 space-y-4">
            {result.roadmap.focus_topics.map((focus, index) => {
              const item = result.roadmap.plan[index]!;
              const resource = result.resources.find((entry) => entry.id === item.resourceId);
              return (
                <article key={focus.topic} className="rounded-lg border border-border bg-surface p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div><p className="text-sm font-semibold text-primary">Focus {index + 1}</p><h2 className="mt-1 text-xl font-semibold">{focus.topic}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{focus.reason}</p></div>
                    <div className="text-right"><p className="font-mono text-2xl font-semibold">{focus.score}%</p><p className="text-xs text-muted-foreground">{focus.suggestedHours} suggested hours</p></div>
                  </div>
                  <p className="mt-5 rounded-md bg-surface-subtle px-4 py-3 text-sm leading-6">{item.action}</p>
                  {resource ? <a href={resource.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">{resource.title} · {resource.kind}<ExternalLink aria-hidden="true" className="size-4" /></a> : null}
                  <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 border-t border-border pt-4 text-sm font-medium"><input type="checkbox" checked={item.completed} disabled={state === "saving"} onChange={() => void toggle(item.resourceId)} className="size-4 accent-primary" /> Mark this step complete</label>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
