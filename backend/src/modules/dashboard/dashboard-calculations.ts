import type { Evaluation, Interview, Question } from "../interview/interview.types.js";

export const MASTERY_ALGORITHM_VERSION = "topic-mastery-v1";

export interface InterviewEvidence {
  interview: Interview;
  questions: Question[];
  evaluations: Evaluation[];
}

export type MasteryClassification =
  | "Critical weakness"
  | "Needs improvement"
  | "Developing"
  | "Strong"
  | "Excellent";

export function classifyMastery(score: number): MasteryClassification {
  if (score < 40) return "Critical weakness";
  if (score < 60) return "Needs improvement";
  if (score < 75) return "Developing";
  if (score < 90) return "Strong";
  return "Excellent";
}

export function weightedTopicScore(scoresNewestFirst: number[]) {
  if (scoresNewestFirst.length < 4) {
    return Math.round(
      scoresNewestFirst.reduce((sum, score) => sum + score, 0) /
        scoresNewestFirst.length,
    );
  }
  const older = scoresNewestFirst.slice(3);
  const olderAverage = older.reduce((sum, score) => sum + score, 0) / older.length;
  return Math.round(
    scoresNewestFirst[0]! * 0.4 +
      scoresNewestFirst[1]! * 0.25 +
      scoresNewestFirst[2]! * 0.15 +
      olderAverage * 0.2,
  );
}

export function calculateTopicMastery(evidence: InterviewEvidence[]) {
  const grouped = new Map<string, Array<{ score: number; createdAt: string }>>();
  for (const item of evidence) {
    const questions = new Map(item.questions.map((question) => [question.id, question]));
    for (const evaluation of item.evaluations) {
      const topic = questions.get(evaluation.question_id)?.topic;
      if (!topic) continue;
      const entries = grouped.get(topic) ?? [];
      entries.push({ score: evaluation.overall_score, createdAt: evaluation.created_at });
      grouped.set(topic, entries);
    }
  }

  return [...grouped.entries()]
    .map(([topic, entries]) => {
      const scores = entries
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((entry) => entry.score);
      const score = weightedTopicScore(scores);
      return {
        topic,
        score,
        classification: classifyMastery(score),
        answerCount: scores.length,
      };
    })
    .sort((a, b) => a.score - b.score || a.topic.localeCompare(b.topic));
}

export function calculateDashboard(evidence: InterviewEvidence[]) {
  const completed = evidence
    .filter((item) => item.interview.status === "completed")
    .sort((a, b) =>
      (a.interview.completed_at ?? "").localeCompare(b.interview.completed_at ?? ""),
    );
  const scores = completed.flatMap((item) =>
    item.interview.overall_score === null ? [] : [item.interview.overall_score],
  );
  const mastery = calculateTopicMastery(completed);

  return {
    summary: {
      interviewsTaken: completed.length,
      averageScore:
        scores.length === 0
          ? null
          : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      strongAreas: mastery.filter((item) => item.score >= 75).length,
      areasToImprove: mastery.filter((item) => item.score < 60).length,
    },
    progress: completed.map((item) => ({
      interviewId: item.interview.id,
      completedAt: item.interview.completed_at!,
      score: item.interview.overall_score!,
      type: item.interview.type,
    })),
    mastery,
    algorithmVersion: MASTERY_ALGORITHM_VERSION,
  };
}
