"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { BriefcaseBusiness, ChevronDown, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import {
  jobDescriptionApi,
  resumeApi,
  type JobDescription,
  type JobDescriptionAnalysis,
  type Resume,
} from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function Tags({ values, tone = "primary" }: { values: string[]; tone?: "primary" | "success" | "missing" }) {
  const classes = tone === "success" ? "bg-success-soft text-success-foreground" : tone === "missing" ? "bg-destructive-soft text-destructive" : "bg-primary-soft text-primary";
  return values.length ? <ul className="flex flex-wrap gap-2">{values.map((value) => <li key={value} className={`rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>{value}</li>)}</ul> : <p className="text-sm text-muted-foreground">None identified.</p>;
}

function Result({ value }: { value: JobDescriptionAnalysis }) {
  return (
    <div className="mt-5 grid gap-6 border-t border-border pt-5 lg:grid-cols-[12rem_1fr_1fr]">
      <div>
        <p className="text-sm font-semibold">Preparation alignment</p>
        <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-primary">{value.alignment_score}%</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Deterministic preparation guidance, not a hiring probability.</p>
      </div>
      <div><h4 className="mb-3 text-sm font-semibold">Matching skills</h4><Tags values={value.matching_skills} tone="success" /></div>
      <div><h4 className="mb-3 text-sm font-semibold">Skills to strengthen</h4><Tags values={value.missing_skills} tone="missing" /></div>
      <div className="lg:col-span-2"><h4 className="mb-3 text-sm font-semibold">Required skills</h4><Tags values={value.required_skills} /></div>
      <div><h4 className="text-sm font-semibold">Minimum experience</h4><p className="mt-2 text-sm text-muted-foreground">{value.minimum_experience || "Not specified"}</p></div>
      {value.responsibilities.length ? <div className="lg:col-span-3"><h4 className="text-sm font-semibold">Key responsibilities</h4><ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{value.responsibilities.map((item) => <li key={item} className="rounded-md bg-surface-subtle px-3 py-2">{item}</li>)}</ul></div> : null}
      <p className="text-xs text-muted-foreground lg:col-span-3">{value.alignment_algorithm_version} · {value.prompt_version}</p>
    </div>
  );
}

export function JobDescriptionManager() {
  const channel = useRef<RealtimeChannel | null>(null);
  const realtimeReady = useRef<Promise<void> | null>(null);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, JobDescriptionAnalysis>>({});
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [rawText, setRawText] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const upsertJob = useCallback((updated: JobDescription) => {
    setJobs((current) => {
      const exists = current.some((item) => item.id === updated.id);
      return exists ? current.map((item) => item.id === updated.id ? { ...item, ...updated } : item) : [updated, ...current];
    });
  }, []);

  const patchJob = useCallback(
    (updated: Partial<JobDescription> & Pick<JobDescription, "id">) => {
      setJobs((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
    },
    [],
  );

  const ensureRealtime = useCallback(() => {
    if (realtimeReady.current) return realtimeReady.current;
    const client = getSupabaseBrowserClient();
    realtimeReady.current = new Promise<void>((resolve, reject) => {
      const fail = () => {
        const failedChannel = channel.current;
        channel.current = null;
        if (failedChannel) void client.removeChannel(failedChannel);
        realtimeReady.current = null;
        reject(new Error("Live analysis updates could not be started."));
      };
      void client.auth.getUser().then(({ data, error: authError }) => {
        if (authError || !data.user) { fail(); return; }
        channel.current = client.channel(`job-description-status-${data.user.id}`)
          .on("postgres_changes", {
            event: "UPDATE", schema: "public", table: "job_descriptions", filter: `user_id=eq.${data.user.id}`,
            select: ["id", "user_id", "title", "company", "status", "error_code", "error_message", "created_at", "updated_at"],
          }, (payload) => patchJob(payload.new as Partial<JobDescription> & Pick<JobDescription, "id">))
          .subscribe((status) => {
            if (status === "SUBSCRIBED") resolve();
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") fail();
          });
      }, fail);
    });
    return realtimeReady.current;
  }, [patchJob]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [loadedJobs, loadedResumes] = await Promise.all([jobDescriptionApi.list(), resumeApi.list()]);
      const completed = loadedResumes.filter((item) => item.status === "completed");
      setJobs(loadedJobs); setResumes(completed);
      setResumeId((current) => current || completed.find((item) => item.is_primary)?.id || completed[0]?.id || "");
    } catch (loadError) { setError(message(loadError, "Your job descriptions could not be loaded.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    void ensureRealtime().catch(() => undefined);
    void Promise.all([jobDescriptionApi.list(), resumeApi.list()]).then(
      ([loadedJobs, loadedResumes]) => {
        if (!active) return;
        const completed = loadedResumes.filter((item) => item.status === "completed");
        setJobs(loadedJobs);
        setResumes(completed);
        setResumeId(completed.find((item) => item.is_primary)?.id || completed[0]?.id || "");
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!active) return;
        setError(message(loadError, "Your job descriptions could not be loaded."));
        setLoading(false);
      },
    );
    return () => {
      active = false;
      if (channel.current) void getSupabaseBrowserClient().removeChannel(channel.current);
    };
  }, [ensureRealtime]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!title.trim()) { setError("Enter a job title."); return; }
    if (rawText.trim().length < 200) { setError("Paste at least 200 characters of job-description text."); return; }
    if (!resumeId) { setError("Complete a resume analysis before comparing a job description."); return; }
    if (!acknowledged) { setError("Confirm the AI-processing notice before continuing."); return; }
    setWorking("create");
    try {
      await ensureRealtime();
      const result = await jobDescriptionApi.create({ title: title.trim(), ...(company.trim() ? { company: company.trim() } : {}), raw_text: rawText.trim(), resume_id: resumeId });
      upsertJob(result.jobDescription);
      if (result.analysis) setAnalyses((current) => ({ ...current, [result.jobDescription.id]: result.analysis! }));
      setExpanded(result.jobDescription.id); setTitle(""); setCompany(""); setRawText(""); setAcknowledged(false); setNotice("Job description analyzed.");
    } catch (createError) {
      setError(message(createError, "The job description could not be analyzed."));
      await load();
    } finally { setWorking(null); }
  };

  const retry = async (job: JobDescription) => {
    if (!resumeId) { setError("Select a completed resume analysis first."); return; }
    setWorking(job.id); setError("");
    try {
      await ensureRealtime();
      const current = await jobDescriptionApi.get(job.id); upsertJob(current.jobDescription);
      const result = await jobDescriptionApi.retry(job.id, resumeId); upsertJob(result.jobDescription);
      if (result.analysis) setAnalyses((items) => ({ ...items, [job.id]: result.analysis! }));
      setExpanded(job.id);
    } catch (retryError) { setError(message(retryError, "The analysis could not be retried.")); await load(); }
    finally { setWorking(null); }
  };

  const show = async (job: JobDescription) => {
    if (expanded === job.id) { setExpanded(null); return; }
    setExpanded(job.id);
    if (!analyses[job.id]) {
      try { const detail = await jobDescriptionApi.get(job.id); if (detail.analysis) setAnalyses((items) => ({ ...items, [job.id]: detail.analysis! })); }
      catch (loadError) { setError(message(loadError, "The analysis could not be loaded.")); }
    }
  };

  const remove = async (job: JobDescription) => {
    if (!window.confirm(`Delete ${job.title}?`)) return;
    setWorking(job.id); setError("");
    try { await jobDescriptionApi.delete(job.id); setJobs((items) => items.filter((item) => item.id !== job.id)); }
    catch (deleteError) { setError(message(deleteError, "The job description could not be deleted.")); }
    finally { setWorking(null); }
  };

  return (
    <div className="mt-10 space-y-12">
      <form onSubmit={submit} aria-busy={working !== null} className="rounded-lg border border-border bg-surface p-6 surface-shadow sm:p-8">
        <div className="flex items-start gap-4"><span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary"><BriefcaseBusiness aria-hidden="true" className="size-5" /></span><div><h2 className="text-xl font-semibold">Analyze a job description</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Paste the text directly. PDF or document upload is not part of InterviewForge.</p></div></div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <div><label htmlFor="job-title" className="text-sm font-semibold">Job title</label><input id="job-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className="mt-2 min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm" /></div>
          <div><label htmlFor="company" className="text-sm font-semibold">Company <span className="font-normal text-muted-foreground">(optional)</span></label><input id="company" value={company} onChange={(event) => setCompany(event.target.value)} maxLength={180} className="mt-2 min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm" /></div>
        </div>
        <label htmlFor="resume-context" className="mt-5 block text-sm font-semibold">Compare with resume</label>
        <select id="resume-context" value={resumeId} onChange={(event) => setResumeId(event.target.value)} className="mt-2 min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm"><option value="">Select a completed resume</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.file_name}{resume.is_primary ? " (Primary)" : ""}</option>)}</select>
        {resumes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Complete a resume analysis first.{" "}
            <Link href="/resumes" className="font-semibold text-primary hover:underline">
              Open Resume Analysis
            </Link>
          </p>
        ) : null}
        <div className="mt-5 flex items-baseline justify-between gap-4"><label htmlFor="job-text" className="text-sm font-semibold">Job-description text</label><span className="text-xs text-muted-foreground">{rawText.length.toLocaleString()} / 30,000</span></div>
        <textarea id="job-text" value={rawText} onChange={(event) => setRawText(event.target.value)} minLength={200} maxLength={30000} rows={12} placeholder="Paste the complete job description here..." className="mt-2 w-full resize-y rounded-sm border border-border bg-surface px-3 py-3 text-sm leading-6" />
        <label className="mt-5 flex items-start gap-3 rounded-md border border-border bg-surface-subtle p-4 text-sm leading-5"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" /><span>I understand that the pasted text is minimized and common direct identifiers are redacted before an AI provider extracts preparation context.</span></label>
        <button type="submit" disabled={working !== null || resumes.length === 0} className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">{working === "create" ? "Analyzing..." : "Analyze job description"}</button>
      </form>

      <section aria-labelledby="job-list-heading">
        <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Saved context</p><h2 id="job-list-heading" className="mt-1 text-2xl font-semibold">Job descriptions</h2></div>{error ? <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-border px-3 text-sm font-semibold"><RefreshCw aria-hidden="true" className="size-4" />Reload</button> : null}</div>
        {error ? <p role="alert" className="mt-5 rounded-sm bg-destructive-soft px-3 py-2.5 text-sm text-destructive">{error}</p> : null}{notice ? <p role="status" className="mt-5 rounded-sm bg-success-soft px-3 py-2.5 text-sm text-success-foreground">{notice}</p> : null}
        {loading ? <div className="mt-6 h-24 rounded-md border border-border bg-surface-subtle" aria-label="Loading job descriptions" /> : null}
        {!loading && !jobs.length ? <div className="mt-6 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center"><BriefcaseBusiness aria-hidden="true" className="mx-auto size-7 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">No job descriptions analyzed</h3></div> : null}
        {!loading && jobs.length ? <ul className="mt-6 space-y-3">{jobs.map((job) => <li key={job.id} className="rounded-lg border border-border bg-surface p-5 surface-shadow"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{job.title}</p><p className="mt-1 text-xs text-muted-foreground">{job.company || "Company not specified"}</p>{job.error_message ? <p className="mt-2 text-sm text-destructive">{job.error_message}</p> : null}</div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${job.status === "completed" ? "bg-success-soft text-success-foreground" : job.status === "failed" ? "bg-destructive-soft text-destructive" : "bg-warning-soft"}`}>{job.status === "completed" ? "Analysis ready" : job.status === "failed" ? "Needs attention" : "Analyzing"}</span><div className="flex items-center gap-1">{job.status === "failed" ? <button type="button" onClick={() => void retry(job)} disabled={working === job.id} className="inline-flex min-h-10 items-center gap-2 rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-soft"><RotateCcw aria-hidden="true" className="size-4" />Retry</button> : null}{job.status === "completed" ? <button type="button" onClick={() => void show(job)} aria-expanded={expanded === job.id} className="inline-flex min-h-10 items-center gap-2 rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-soft">Details<ChevronDown aria-hidden="true" className={`size-4 ${expanded === job.id ? "rotate-180" : ""}`} /></button> : null}<button type="button" aria-label={`Delete ${job.title}`} disabled={working === job.id || job.status === "analyzing"} onClick={() => void remove(job)} className="inline-flex size-10 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive-soft hover:text-destructive disabled:opacity-60"><Trash2 aria-hidden="true" className="size-4" /></button></div></div>{expanded === job.id && analyses[job.id] ? <Result value={analyses[job.id]} /> : null}</li>)}</ul> : null}
      </section>
    </div>
  );
}
