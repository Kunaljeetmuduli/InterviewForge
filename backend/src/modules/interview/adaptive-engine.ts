export const ADAPTIVE_ENGINE_VERSION = "adaptive-v1";

export type Difficulty = "easy" | "medium" | "hard";
export type AdaptationStrategy =
  | "easier_follow_up"
  | "same_depth"
  | "deeper_follow_up"
  | "new_topic";

export interface AdaptiveEvaluation {
  topic: string;
  overallScore: number;
  missingConcepts: string[];
}

export interface AdaptiveInput {
  currentDifficulty: Difficulty;
  currentTopic: string;
  latestEvaluation: AdaptiveEvaluation;
  recentEvaluations: AdaptiveEvaluation[];
  topicsAlreadyCovered: string[];
  targetTopics: string[];
  questionCount: number;
  questionLimit: 5 | 10;
}

export interface AdaptiveResult {
  engineVersion: typeof ADAPTIVE_ENGINE_VERSION;
  difficulty: Difficulty;
  topic: string;
  strategy: AdaptationStrategy;
  focusConcepts: string[];
  reason: string;
  complete: boolean;
}

const difficulties: Difficulty[] = ["easy", "medium", "hard"];

function shiftDifficulty(current: Difficulty, offset: -1 | 0 | 1) {
  const currentIndex = difficulties.indexOf(current);
  return difficulties[Math.min(2, Math.max(0, currentIndex + offset))]!;
}

function chooseNextTopic(input: AdaptiveInput) {
  const candidates = input.targetTopics.filter(
    (topic) => topic !== input.currentTopic,
  );
  if (candidates.length === 0) {
    return input.currentTopic;
  }

  const counts = new Map<string, number>();
  for (const topic of input.topicsAlreadyCovered) {
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }

  return [...candidates].sort(
    (left, right) =>
      (counts.get(left) ?? 0) - (counts.get(right) ?? 0) ||
      left.localeCompare(right),
  )[0]!;
}

export function runAdaptiveEngine(input: AdaptiveInput): AdaptiveResult {
  if (input.questionCount >= input.questionLimit) {
    return {
      engineVersion: ADAPTIVE_ENGINE_VERSION,
      difficulty: input.currentDifficulty,
      topic: input.currentTopic,
      strategy: "same_depth",
      focusConcepts: [],
      reason: `The selected ${input.questionLimit}-question limit has been reached.`,
      complete: true,
    };
  }

  const score = input.latestEvaluation.overallScore;
  const history = [...input.recentEvaluations, input.latestEvaluation];
  const sameTopicVeryWeak = history.filter(
    (evaluation) =>
      evaluation.topic === input.currentTopic && evaluation.overallScore < 40,
  ).length;
  const sameTopicStrong = history.filter(
    (evaluation) =>
      evaluation.topic === input.currentTopic && evaluation.overallScore >= 70,
  ).length;

  if (score < 40 && sameTopicVeryWeak >= 2) {
    return {
      engineVersion: ADAPTIVE_ENGINE_VERSION,
      difficulty: shiftDifficulty(input.currentDifficulty, -1),
      topic: chooseNextTopic(input),
      strategy: "new_topic",
      focusConcepts: [],
      reason:
        "Two very weak answers were recorded on this topic, so the interview is moving on without repeatedly penalizing the same gap.",
      complete: false,
    };
  }

  if (score < 40) {
    return {
      engineVersion: ADAPTIVE_ENGINE_VERSION,
      difficulty: shiftDifficulty(input.currentDifficulty, -1),
      topic: input.currentTopic,
      strategy: "easier_follow_up",
      focusConcepts: input.latestEvaluation.missingConcepts,
      reason:
        "The previous answer needs a simpler follow-up on the missing concepts.",
      complete: false,
    };
  }

  if (score < 70) {
    return {
      engineVersion: ADAPTIVE_ENGINE_VERSION,
      difficulty: input.currentDifficulty,
      topic: input.currentTopic,
      strategy: "same_depth",
      focusConcepts: input.latestEvaluation.missingConcepts,
      reason:
        "The answer showed partial understanding, so the next question stays at the same depth.",
      complete: false,
    };
  }

  if (sameTopicStrong >= 2) {
    return {
      engineVersion: ADAPTIVE_ENGINE_VERSION,
      difficulty: shiftDifficulty(input.currentDifficulty, 1),
      topic: chooseNextTopic(input),
      strategy: "new_topic",
      focusConcepts: [],
      reason:
        "Repeated strong answers support increasing difficulty and broadening topic coverage.",
      complete: false,
    };
  }

  return {
    engineVersion: ADAPTIVE_ENGINE_VERSION,
    difficulty: shiftDifficulty(input.currentDifficulty, 1),
    topic: input.currentTopic,
    strategy: "deeper_follow_up",
    focusConcepts: input.latestEvaluation.missingConcepts,
    reason: "The previous answer was strong, so the next question goes deeper.",
    complete: false,
  };
}
