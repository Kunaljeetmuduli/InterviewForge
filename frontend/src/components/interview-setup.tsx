"use client";

import {
  ArrowRight,
  Clock3,
  MessageSquareText,
  Play,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  interviewApi,
  jobDescriptionApi,
  resumeApi,
  type Interview,
  type InterviewType,
  type JobDescription,
  type Resume,
} from "@/lib/api-client";

const interviewTypes: Array<{
  value: InterviewType;
  label: string;
  description: string;
}> = [
  { value: "hr", label: "HR", description: "Motivation, goals, and work habits" },
  { value: "technical", label: "Technical", description: "Core concepts and system reasoning" },
  { value: "behavioral", label: "Behavioral", description: "Evidence-led STAR practice" },
  { value: "dsa", label: "DSA verbal", description: "Explain algorithms without a code editor" },
];

export function InterviewSetup() {
  const router = useRouter();
  const [type, setType] = useState<InterviewType>("technical");
  const [questionLimit, setQuestionLimit] = useState<5 | 10>(5);
  const [resumeId, setResumeId] = useState("");
  const [jobDescriptionId, setJobDescriptionId] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "creating">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([resumeApi.list(), jobDescriptionApi.list(), interviewApi.list()])
      .then(([loadedResumes, loadedJobs, loadedInterviews]) => {
        if (!active) return;
        setResumes(loadedResumes.filter((resume) => resume.status === "completed"));
        setJobs(loadedJobs.filter((job) => job.status === "completed"));
        setInterviews(loadedInterviews);
        setState("ready");
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Interview setup could not be loaded.");
        setState("ready");
      });
    return () => {
      active = false;
    };
  }, []);

  async function createInterview() {
    setState("creating");
    setError("");
    try {
      const interview = await interviewApi.create({
        type,
        question_limit: questionLimit,
        resume_id: resumeId || null,
        job_description_id: jobDescriptionId || null,
      });
      await interviewApi.start(interview.id);
      router.push(`/interviews/${interview.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "The interview could not be created.");
      setState("ready");
    }
  }

  if (state === "loading") {
    return (
      <div className="mt-8 animate-pulse space-y-4" aria-label="Loading interview setup">
        <div className="h-48 rounded-lg bg-surface-subtle" />
        <div className="h-28 rounded-lg bg-surface-subtle" />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      <section aria-labelledby="setup-heading" className="rounded-lg border border-border bg-surface p-6 shadow-sm lg:p-8">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <MessageSquareText aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="setup-heading" className="text-xl font-semibold">Set up your interview</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Choose one format and optional preparation context. Quick practice is the default.
            </p>
          </div>
        </div>

        <fieldset className="mt-7">
          <legend className="text-sm font-semibold">Interview type</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {interviewTypes.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-md border p-4 transition-colors ${
                  type === option.value
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:bg-surface-subtle"
                }`}
              >
                <input
                  type="radio"
                  name="interview-type"
                  value={option.value}
                  checked={type === option.value}
                  onChange={() => setType(option.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="text-sm font-semibold">Format</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([5, 10] as const).map((limit) => (
              <label
                key={limit}
                className={`cursor-pointer rounded-md border p-4 transition-colors ${
                  questionLimit === limit
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:bg-surface-subtle"
                }`}
              >
                <input
                  type="radio"
                  name="question-limit"
                  checked={questionLimit === limit}
                  onChange={() => setQuestionLimit(limit)}
                  className="sr-only"
                />
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Clock3 aria-hidden="true" className="size-4" />
                  {limit === 5 ? "Quick practice" : "Full interview"}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{limit} questions</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Resume context <span className="font-normal text-muted-foreground">(optional)</span>
            <select
              value={resumeId}
              onChange={(event) => setResumeId(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base font-normal outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No resume context</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>{resume.file_name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Job description <span className="font-normal text-muted-foreground">(optional)</span>
            <select
              value={jobDescriptionId}
              onChange={(event) => setJobDescriptionId(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base font-normal outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No job-description context</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}{job.company ? ` at ${job.company}` : ""}</option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p role="alert" className="mt-5 rounded-sm bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            onClick={() => void createInterview()}
            disabled={state === "creating"}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play aria-hidden="true" className="size-4" />
            {state === "creating" ? "Preparing interview..." : "Start interview"}
          </button>
        </div>
      </section>

      <section aria-labelledby="recent-interviews-heading">
        <p className="text-sm font-semibold text-primary">Practice history</p>
        <h2 id="recent-interviews-heading" className="mt-1 text-2xl font-semibold">Recent interviews</h2>
        {interviews.length === 0 ? (
          <p className="mt-4 rounded-md border border-border bg-surface px-5 py-6 text-sm text-muted-foreground">
            Your completed and in-progress interviews will appear here.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-border bg-surface">
            <ul className="divide-y divide-border">
              {interviews.slice(0, 8).map((interview) => (
                <li key={interview.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold capitalize">{interview.type === "dsa" ? "DSA verbal" : interview.type}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {interview.question_limit === 5
                        ? "Quick 5 format"
                        : "Full 10 format"}{" "}
                      · {interview.status.replace("_", " ")}
                      {interview.overall_score !== null ? ` · ${interview.overall_score}%` : ""}
                    </p>
                  </div>
                  <Link
                    href={interview.status === "completed" ? `/reports/${interview.id}` : `/interviews/${interview.id}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-soft"
                  >
                    {interview.status === "completed" ? "View report" : "Continue"}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
