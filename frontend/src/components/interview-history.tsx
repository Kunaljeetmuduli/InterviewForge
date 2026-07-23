"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { interviewApi, type Interview } from "@/lib/api-client";

export function InterviewHistory() {
  const [interviews, setInterviews] = useState<Interview[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void interviewApi.list().then(setInterviews).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "History could not be loaded."));
  }, []);

  async function remove(id: string) {
    setDeleting(id);
    setError("");
    try {
      await interviewApi.delete(id);
      setInterviews((current) => current?.filter((item) => item.id !== id) ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The interview could not be deleted.");
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  }

  if (!interviews && !error) return <div aria-label="Loading interview history" className="mt-8 h-52 animate-pulse rounded-lg bg-surface-subtle" />;

  return (
    <div className="mt-8">
      {error ? <p role="alert" className="mb-5 rounded-sm bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {interviews?.length ? (
        <ul className="space-y-4">
          {interviews.map((interview) => (
            <li key={interview.id} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><h2 className="font-semibold capitalize">{interview.type === "dsa" ? "DSA verbal" : interview.type} interview</h2><p className="mt-1 text-sm text-muted-foreground">{interview.question_limit}-question format · {interview.status} · {new Date(interview.created_at).toLocaleDateString()}</p></div>
                <div className="flex items-center gap-3">
                  {interview.status === "completed" ? <Link href={`/reports/${interview.id}`} className="text-sm font-semibold text-primary">View report</Link> : null}
                  {confirming === interview.id ? (
                    <div className="flex items-center gap-2"><span className="text-sm">Delete permanently?</span><button type="button" onClick={() => void remove(interview.id)} disabled={deleting === interview.id} className="min-h-10 rounded-sm bg-destructive px-3 text-sm font-semibold text-primary-foreground">{deleting === interview.id ? "Deleting..." : "Yes"}</button><button type="button" onClick={() => setConfirming(null)} className="min-h-10 rounded-sm border border-border px-3 text-sm font-semibold">Cancel</button></div>
                  ) : <button type="button" onClick={() => setConfirming(interview.id)} aria-label={`Delete ${interview.type} interview from ${new Date(interview.created_at).toLocaleDateString()}`} className="inline-flex size-10 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive-soft hover:text-destructive"><Trash2 aria-hidden="true" className="size-4" /></button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : <section className="rounded-lg border border-border bg-surface p-8 shadow-sm"><h2 className="text-xl font-semibold">No interview history yet</h2><p className="mt-2 text-sm text-muted-foreground">Started and completed interviews will appear here.</p></section>}
    </div>
  );
}
