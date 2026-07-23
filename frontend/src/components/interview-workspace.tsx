"use client";

import { ArrowRight, RotateCcw, Send, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  interviewApi,
  type InterviewDetail,
  type InterviewEvaluation,
} from "@/lib/api-client";
import { VoiceAnswerControls } from "@/components/voice-answer-controls";

export function InterviewWorkspace({ interviewId }: { interviewId: string }) {
  const [detail, setDetail] = useState<InterviewDetail | null>(null);
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "submitting" | "ending">("loading");
  const [error, setError] = useState("");
  const [adaptationReason, setAdaptationReason] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(null);

  async function load() {
    const loaded = await interviewApi.get(interviewId);
    setDetail(loaded);
    setState("ready");
  }

  useEffect(() => {
    let active = true;
    void interviewApi.get(interviewId)
      .then((loaded) => {
        if (!active) return;
        setDetail(loaded);
        setState("ready");
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "The interview could not be loaded.");
        setState("ready");
      });
    return () => {
      active = false;
    };
  }, [interviewId]);

  const latestEvaluation = useMemo<InterviewEvaluation | null>(() => {
    if (!detail?.evaluations.length) return null;
    return detail.evaluations[detail.evaluations.length - 1] ?? null;
  }, [detail]);
  const failedAnswer = detail?.answers.find((item) => item.processing_status === "failed") ?? null;

  async function submit() {
    if (!detail?.currentQuestion || !answer.trim()) return;
    setState("submitting");
    setError("");
    try {
      const result = await interviewApi.answer(interviewId, {
        questionId: detail.currentQuestion.id,
        transcript: answer.trim(),
        inputMode: voiceDuration ? "voice" : "text",
        speakingDurationSeconds: voiceDuration,
        clientRequestId: crypto.randomUUID(),
      });
      setAdaptationReason(result.adaptation?.reason ?? null);
      setAnswer("");
      setVoiceDuration(null);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The answer could not be evaluated.");
      await load().catch(() => undefined);
    }
  }

  async function retry() {
    if (!failedAnswer) return;
    setState("submitting");
    setError("");
    try {
      const result = await interviewApi.retryEvaluation(interviewId, failedAnswer.id);
      setAdaptationReason(result.adaptation?.reason ?? null);
      await load();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "The evaluation retry failed.");
      setState("ready");
    }
  }

  async function endInterview() {
    if (!detail) return;
    setState("ending");
    setError("");
    try {
      if (detail.answers.length === 0) {
        await interviewApi.abandon(interviewId);
      } else {
        await interviewApi.complete(interviewId);
      }
      await load();
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : "The interview could not be ended.");
      setState("ready");
    }
  }

  if (!detail && state === "loading") {
    return <div className="animate-pulse space-y-4" aria-label="Loading interview"><div className="h-20 rounded-lg bg-surface-subtle" /><div className="h-80 rounded-lg bg-surface-subtle" /></div>;
  }
  if (!detail) {
    return <p role="alert" className="rounded-md bg-destructive-soft px-4 py-3 text-sm text-destructive">{error || "Interview not found."}</p>;
  }

  const { interview, currentQuestion } = detail;
  const currentNumber = currentQuestion?.sequence_number ?? Math.min(detail.questions.length, interview.question_limit);
  const closed = interview.status === "completed" || interview.status === "abandoned";

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-sm font-semibold capitalize text-primary">{interview.type === "dsa" ? "DSA verbal" : interview.type} interview</p>
          <h1 className="mt-2 text-2xl font-semibold">Question {currentNumber} of {interview.question_limit}</h1>
          <p className="mt-2 font-mono text-sm text-muted-foreground">{interview.adaptive_engine_version} · {interview.current_difficulty}</p>
        </div>
        {!closed ? (
          <button
            type="button"
            onClick={() => void endInterview()}
            disabled={state !== "ready"}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-subtle disabled:opacity-60"
          >
            <Square aria-hidden="true" className="size-4" />
            {state === "ending" ? "Ending..." : "End interview"}
          </button>
        ) : null}
      </header>

      {error ? <p role="alert" className="mt-6 rounded-sm bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {closed ? (
        <section className="mt-8 rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold">
            {interview.status === "completed"
              ? "Interview complete"
              : "Interview ended"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {interview.status === "completed"
              ? "Your submitted answers and structured coaching feedback are ready to review."
              : "No answers were submitted, so this interview has no report."}
          </p>
          {interview.status === "completed" ? (
            <Link href={`/reports/${interview.id}`} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
              View report <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </section>
      ) : failedAnswer ? (
        <section className="mt-8 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold text-destructive">Evaluation needs attention</p>
          <h2 className="mt-2 text-xl font-semibold">Your answer was saved safely</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Retry the evaluation to continue. This will not create another answer or evaluation record.</p>
          <button type="button" onClick={() => void retry()} disabled={state === "submitting"} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
            <RotateCcw aria-hidden="true" className="size-4" />
            {state === "submitting" ? "Retrying..." : "Retry evaluation"}
          </button>
        </section>
      ) : currentQuestion ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <section aria-labelledby="question-heading" className="rounded-lg border border-border bg-surface p-6 shadow-sm lg:p-8">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">{currentQuestion.topic}</span>
              <span className="rounded-full bg-surface-subtle px-3 py-1 font-medium capitalize text-muted-foreground">{currentQuestion.difficulty}</span>
            </div>
            <h2 id="question-heading" className="mt-6 max-w-3xl text-xl font-semibold leading-8">{currentQuestion.text}</h2>
            <VoiceAnswerControls
              question={currentQuestion.text}
              answer={answer}
              onAnswerChange={setAnswer}
              onVoiceMetrics={setVoiceDuration}
            />
            <label htmlFor="interview-answer" className="mt-8 block text-sm font-semibold">Your answer</label>
            <textarea
              id="interview-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={9}
              maxLength={20_000}
              placeholder="Explain your reasoning clearly. A concise example can help."
              className="mt-2 w-full resize-y rounded-sm border border-border bg-surface px-4 py-3 text-base leading-7 outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="mt-2 flex justify-between gap-4 text-sm text-muted-foreground">
              <span>{voiceDuration ? `Voice transcript · ${voiceDuration}s` : "Text response"}</span>
              <span className="font-mono">{answer.length.toLocaleString()} / 20,000</span>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => void submit()} disabled={state === "submitting" || !answer.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                <Send aria-hidden="true" className="size-4" />
                {state === "submitting" ? "Evaluating..." : "Submit answer"}
              </button>
            </div>
          </section>

          <aside aria-labelledby="coaching-heading" className="lg:border-l lg:border-border lg:pl-8">
            <h2 id="coaching-heading" className="text-lg font-semibold">Latest coaching</h2>
            {latestEvaluation ? (
              <div className="mt-5 space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground">Overall score</p>
                  <p className="mt-1 font-mono text-3xl font-semibold text-primary">{latestEvaluation.overall_score}%</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-success">Strengths</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6">{latestEvaluation.strengths.map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-destructive">Improve next</h3>
                  <p className="mt-2 text-sm leading-6">{latestEvaluation.improvement_tip}</p>
                </div>
                {adaptationReason ? <p className="rounded-md bg-primary-soft px-4 py-3 text-sm leading-6 text-primary">{adaptationReason}</p> : null}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Feedback appears here after you submit an answer. Private expected concepts remain hidden during answering.</p>
            )}
          </aside>
        </div>
      ) : (
        <p className="mt-8 rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">No current question is available. Reload the page or end the interview.</p>
      )}
    </div>
  );
}
