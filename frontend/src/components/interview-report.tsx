"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { interviewApi, type InterviewDetail } from "@/lib/api-client";

export function InterviewReport({ interviewId }: { interviewId: string }) {
  const [report, setReport] = useState<InterviewDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void interviewApi.report(interviewId)
      .then((loaded) => {
        if (active) setReport(loaded);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "The report could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [interviewId]);

  if (!report && !error) {
    return <div className="animate-pulse space-y-4" aria-label="Loading report"><div className="h-24 rounded-lg bg-surface-subtle" /><div className="h-64 rounded-lg bg-surface-subtle" /></div>;
  }
  if (!report) {
    return <p role="alert" className="rounded-md bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p>;
  }

  const evaluationByQuestion = new Map(report.evaluations.map((evaluation) => [evaluation.question_id, evaluation]));
  const answerByQuestion = new Map(report.answers.map((answer) => [answer.question_id, answer]));

  return (
    <div>
      <Link href="/interviews/new" className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-primary hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to interviews
      </Link>
      <header className="mt-4 border-b border-border pb-8">
        <p className="text-sm font-semibold text-success">Interview complete</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.035em]">Practice report</h1>
            <p className="mt-3 text-base capitalize text-muted-foreground">{report.interview.type === "dsa" ? "DSA verbal" : report.interview.type} · {report.interview.question_limit}-question format · {report.interview.adaptive_engine_version}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Overall score</p>
            <p className="mt-1 font-mono text-4xl font-semibold text-primary">
              {report.interview.overall_score === null
                ? "Not scored"
                : `${report.interview.overall_score}%`}
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="score-breakdown" className="mt-8">
        <h2 id="score-breakdown" className="text-xl font-semibold">Score breakdown</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Communication", report.evaluations],
            ["Completeness", report.evaluations],
            ["Relevance", report.evaluations],
            ["Technical", report.evaluations.filter((item) => item.technical_score !== null)],
            ["Delivery", report.evaluations.filter((item) => item.delivery_score !== null)],
          ].map(([label, rawEvaluations]) => {
            const evaluations = rawEvaluations as typeof report.evaluations;
            const key = `${String(label).toLowerCase()}_score` as "communication_score" | "completeness_score" | "relevance_score" | "technical_score" | "delivery_score";
            const values = evaluations.flatMap((item) => item[key] === null ? [] : [item[key] as number]);
            const score = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
            return (
              <div key={String(label)} className="rounded-md border border-border bg-surface px-5 py-4">
                <p className="text-sm text-muted-foreground">{String(label)}</p>
                <p className="mt-1 font-mono text-2xl font-semibold">{score === null ? "N/A" : `${score}%`}</p>
              </div>
            );
          })}
        </div>
        {report.answers.some((answer) => answer.input_mode === "voice") ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Delivery, pace, and filler values are limited estimates from the reviewed transcript and speaking time. They are not personality or hiring judgments.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="answer-review" className="mt-10">
        <h2 id="answer-review" className="text-xl font-semibold">Answer review</h2>
        <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {report.questions.map((question) => {
            const evaluation = evaluationByQuestion.get(question.id);
            const answer = answerByQuestion.get(question.id);
            return (
              <article key={question.id} className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-sm text-muted-foreground">Question {question.sequence_number} · {question.topic}</p>
                  {evaluation ? <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-sm font-semibold text-success"><CheckCircle2 aria-hidden="true" className="size-4" /> {evaluation.overall_score}%</span> : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold leading-7">{question.text}</h3>
                {answer ? <div className="mt-5 rounded-md bg-surface-subtle px-4 py-3"><p className="text-sm font-semibold">Your answer</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{answer.transcript}</p>{answer.input_mode === "voice" ? <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground"><span>{answer.speaking_duration_seconds}s speaking time</span><span>{answer.words_per_minute ?? 0} words/min</span><span>{answer.filler_rate ?? 0}% estimated filler rate</span></div> : null}</div> : null}
                {evaluation ? (
                  <div className="mt-5 grid gap-6 lg:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold text-success">Strengths</h4>
                      <ul className="mt-2 space-y-2 text-sm leading-6">{evaluation.strengths.map((item) => <li key={item}>• {item}</li>)}</ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-destructive">Areas to improve</h4>
                      <ul className="mt-2 space-y-2 text-sm leading-6">{evaluation.weaknesses.map((item) => <li key={item}>• {item}</li>)}</ul>
                      <p className="mt-3 text-sm leading-6"><span className="font-semibold">Next step:</span> {evaluation.improvement_tip}</p>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
