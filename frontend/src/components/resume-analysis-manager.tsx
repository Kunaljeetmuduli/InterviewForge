"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { ChevronDown, FileText, RefreshCw, RotateCcw, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { resumeApi, type Resume, type ResumeAnalysis } from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const statusClass: Record<Resume["status"], string> = {
  pending: "bg-primary-soft text-primary",
  processing: "bg-warning-soft text-foreground",
  completed: "bg-success-soft text-success-foreground",
  failed: "bg-destructive-soft text-destructive",
};
const stageLabel = {
  uploaded: "Uploaded",
  parsing: "Reading PDF",
  redacting: "Removing identifiers",
  analyzing: "Structuring experience",
} as const;

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function validate(file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) return "Choose a PDF file.";
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return "The PDF must be no more than 5 MB.";
  return "";
}

function Tags({ values }: { values: string[] }) {
  return values.length ? (
    <ul className="flex flex-wrap gap-2">
      {values.map((value) => <li key={value} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">{value}</li>)}
    </ul>
  ) : <p className="text-sm text-muted-foreground">None identified.</p>;
}

function Analysis({ value }: { value: ResumeAnalysis }) {
  return (
    <div className="mt-5 grid gap-6 border-t border-border pt-5 lg:grid-cols-2">
      <div className="lg:col-span-2"><h4 className="text-sm font-semibold">Professional summary</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">{value.summary}</p></div>
      <div><h4 className="mb-3 text-sm font-semibold">Skills</h4><Tags values={value.skills} /></div>
      <div><h4 className="mb-3 text-sm font-semibold">Strengths</h4><Tags values={value.strengths} /></div>
      {value.experience.length ? <div><h4 className="text-sm font-semibold">Experience</h4><ul className="mt-3 space-y-3">{value.experience.map((item, index) => <li key={`${item.role}-${index}`} className="text-sm"><p className="font-medium">{item.role}{item.organization ? ` · ${item.organization}` : ""}</p>{item.duration ? <p className="mt-1 text-xs text-muted-foreground">{item.duration}</p> : null}</li>)}</ul></div> : null}
      {value.projects.length ? <div><h4 className="text-sm font-semibold">Projects</h4><ul className="mt-3 space-y-3">{value.projects.map((item, index) => <li key={`${item.name}-${index}`} className="text-sm"><p className="font-medium">{item.name}</p><p className="mt-1 leading-5 text-muted-foreground">{item.description}</p></li>)}</ul></div> : null}
      <p className="text-xs text-muted-foreground lg:col-span-2">Generated with {value.model} · {value.prompt_version}</p>
    </div>
  );
}

export function ResumeAnalysisManager() {
  const fileInput = useRef<HTMLInputElement>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const realtimeReady = useRef<Promise<void> | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, ResumeAnalysis>>({});
  const [file, setFile] = useState<File | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const patchResume = useCallback((updated: Partial<Resume> & Pick<Resume, "id">) => {
    setResumes((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
  }, []);

  const ensureRealtime = useCallback(() => {
    if (realtimeReady.current) return realtimeReady.current;
    const client = getSupabaseBrowserClient();
    realtimeReady.current = new Promise<void>((resolve, reject) => {
      const fail = () => {
        const failedChannel = channel.current;
        channel.current = null;
        if (failedChannel) void client.removeChannel(failedChannel);
        realtimeReady.current = null;
        reject(new Error("Live processing updates could not be started."));
      };
      void client.auth.getUser().then(({ data, error: authError }) => {
        if (authError || !data.user) { fail(); return; }
        channel.current = client.channel(`resume-status-${data.user.id}`)
          .on("postgres_changes", {
            event: "UPDATE", schema: "public", table: "resumes", filter: `user_id=eq.${data.user.id}`,
            select: ["id", "user_id", "status", "processing_stage", "processing_attempt", "error_code", "error_message", "updated_at"],
          }, (payload) => patchResume(payload.new as Partial<Resume> & Pick<Resume, "id">))
          .subscribe((status) => {
            if (status === "SUBSCRIBED") resolve();
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") fail();
          });
      }, fail);
    });
    return realtimeReady.current;
  }, [patchResume]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setResumes(await resumeApi.list()); }
    catch (loadError) { setError(message(loadError, "Your resumes could not be loaded.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    void ensureRealtime().catch(() => undefined);
    void resumeApi.list().then(
      (items) => { if (active) { setResumes(items); setLoading(false); } },
      (loadError: unknown) => { if (active) { setError(message(loadError, "Your resumes could not be loaded.")); setLoading(false); } },
    );
    return () => { active = false; if (channel.current) void getSupabaseBrowserClient().removeChannel(channel.current); };
  }, [ensureRealtime]);

  const processResume = async (resume: Resume, retry: boolean) => {
    setWorking(resume.id); setError("");
    try {
      await ensureRealtime();
      patchResume((await resumeApi.get(resume.id)).resume);
      const result = retry ? await resumeApi.retry(resume.id) : await resumeApi.process(resume.id);
      patchResume(result.resume);
      if (result.analysis) setAnalyses((current) => ({ ...current, [resume.id]: result.analysis! }));
      setExpanded(resume.id);
      return true;
    } catch (processError) {
      setError(message(processError, "The resume could not be analyzed."));
      const latest = await resumeApi.get(resume.id).catch(() => null);
      if (latest) patchResume(latest.resume);
      return false;
    } finally { setWorking(null); }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!file) { setError("Choose a resume PDF before continuing."); return; }
    const fileError = validate(file); if (fileError) { setError(fileError); return; }
    if (!acknowledged) { setError("Confirm the AI-processing notice before continuing."); return; }
    setWorking("upload");
    let created: Resume | null = null;
    try {
      created = await resumeApi.create({ file_name: file.name, mime_type: "application/pdf", file_size: file.size });
      const { error: storageError } = await getSupabaseBrowserClient().storage.from("resumes").upload(created.storage_path, file, { contentType: "application/pdf", upsert: false });
      if (storageError) throw storageError;
      setResumes((current) => [created!, ...current]);
      setWorking(null);
      const completed = await processResume(created, false);
      if (completed) {
        setFile(null); setAcknowledged(false); setNotice("Resume analysis is ready.");
        if (fileInput.current) fileInput.current.value = "";
      }
    } catch (uploadError) {
      setError(message(uploadError, "The resume could not be uploaded."));
      if (created) await resumeApi.delete(created.id).catch(() => undefined);
      setWorking(null);
    }
  };

  const showDetails = async (resume: Resume) => {
    if (expanded === resume.id) { setExpanded(null); return; }
    setExpanded(resume.id);
    if (!analyses[resume.id]) {
      try {
        const detail = await resumeApi.get(resume.id);
        if (detail.analysis) setAnalyses((current) => ({ ...current, [resume.id]: detail.analysis! }));
      } catch (loadError) { setError(message(loadError, "The analysis could not be loaded.")); }
    }
  };

  const remove = async (resume: Resume) => {
    if (!window.confirm(`Delete ${resume.file_name}? This removes the private file and its analysis.`)) return;
    setWorking(resume.id); setError("");
    try { await resumeApi.delete(resume.id); setResumes((current) => current.filter((item) => item.id !== resume.id)); }
    catch (deleteError) { setError(message(deleteError, "The resume could not be deleted.")); }
    finally { setWorking(null); }
  };

  return (
    <div className="mt-10 space-y-12">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-12">
        <form onSubmit={submit} aria-busy={working !== null} className="rounded-lg border border-border bg-surface p-6 surface-shadow sm:p-8">
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary"><UploadCloud aria-hidden="true" className="size-5" /></span>
          <h2 className="mt-5 text-xl font-semibold">Upload and analyze</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Use a selectable-text PDF. Scanned or image-only resumes are not supported.</p>
          <label htmlFor="resume-file" className="mt-6 block text-sm font-semibold">Resume PDF</label>
          <input ref={fileInput} id="resume-file" type="file" accept=".pdf,application/pdf" disabled={working !== null} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); setNotice(""); }} className="mt-2 block min-h-11 w-full rounded-sm border border-border bg-surface text-sm text-muted-foreground file:mr-4 file:min-h-11 file:border-0 file:border-r file:border-border file:bg-surface-subtle file:px-4 file:text-sm file:font-semibold" />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">PDF only, maximum 5 MB. Remove identifiers you do not need analyzed.</p>
          <label className="mt-5 flex items-start gap-3 rounded-md border border-border bg-surface-subtle p-4 text-sm leading-5">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} disabled={working !== null} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>I understand that extracted text is minimized and common email addresses and phone numbers are redacted before an AI provider processes it. The original PDF is not sent to the AI provider.</span>
          </label>
          <button type="submit" disabled={working !== null} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"><UploadCloud aria-hidden="true" className="size-4" />{working === "upload" ? "Uploading..." : working ? "Analyzing..." : "Upload and analyze"}</button>
        </form>
        <div className="border-y border-border py-7 lg:self-center">
          <ShieldCheck aria-hidden="true" className="size-6 text-primary" /><h2 className="mt-4 text-lg font-semibold">Private by design</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Your PDF stays in private storage. Processing validates the file and sends only minimized, redacted text for structured analysis.</p>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground"><li>Private ownership policies</li><li>PDF signature, size, page, and text checks</li><li>Versioned AI prompt and output schema</li></ul>
        </div>
      </section>

      <section aria-labelledby="resume-list-heading">
        <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Your documents</p><h2 id="resume-list-heading" className="mt-1 text-2xl font-semibold">Resume analyses</h2></div>{error ? <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-border px-3 text-sm font-semibold"><RefreshCw aria-hidden="true" className="size-4" />Reload</button> : null}</div>
        {error ? <p role="alert" className="mt-5 rounded-sm bg-destructive-soft px-3 py-2.5 text-sm text-destructive">{error}</p> : null}
        {notice ? <p role="status" className="mt-5 rounded-sm bg-success-soft px-3 py-2.5 text-sm text-success-foreground">{notice}</p> : null}
        {loading ? <div className="mt-6 h-24 rounded-md border border-border bg-surface-subtle" aria-label="Loading resumes" /> : null}
        {!loading && resumes.length === 0 ? <div className="mt-6 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center"><FileText aria-hidden="true" className="mx-auto size-7 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">No resume analyses yet</h3></div> : null}
        {!loading && resumes.length ? <ul className="mt-6 space-y-3">{resumes.map((resume) => {
          const label = resume.status === "processing" && resume.processing_stage ? stageLabel[resume.processing_stage] : { pending: "Ready to analyze", processing: "Processing", completed: "Analysis ready", failed: "Needs attention" }[resume.status];
          return <li key={resume.id} className="rounded-lg border border-border bg-surface p-5 surface-shadow"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="inline-flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary"><FileText aria-hidden="true" className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{resume.file_name}</p><p className="mt-1 text-xs text-muted-foreground">Attempt {resume.processing_attempt}{resume.is_primary ? " · Primary" : ""}</p>{resume.error_message ? <p className="mt-2 text-sm text-destructive">{resume.error_message}</p> : null}</div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[resume.status]}`}>{label}</span><div className="flex items-center gap-1">{resume.status === "failed" ? <button type="button" disabled={working === resume.id} onClick={() => void processResume(resume, true)} className="inline-flex min-h-10 items-center gap-2 rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-soft"><RotateCcw aria-hidden="true" className="size-4" />Retry</button> : null}{resume.status === "completed" ? <button type="button" aria-expanded={expanded === resume.id} onClick={() => void showDetails(resume)} className="inline-flex min-h-10 items-center gap-2 rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-soft">Details<ChevronDown aria-hidden="true" className={`size-4 ${expanded === resume.id ? "rotate-180" : ""}`} /></button> : null}<button type="button" aria-label={`Delete ${resume.file_name}`} disabled={working === resume.id || resume.status === "processing"} onClick={() => void remove(resume)} className="inline-flex size-10 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive-soft hover:text-destructive disabled:opacity-60"><Trash2 aria-hidden="true" className="size-4" /></button></div></div>{expanded === resume.id && analyses[resume.id] ? <Analysis value={analyses[resume.id]} /> : null}</li>;
        })}</ul> : null}
      </section>
    </div>
  );
}
