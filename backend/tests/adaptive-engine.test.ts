import { describe, expect, it } from "vitest";

import {
  ADAPTIVE_ENGINE_VERSION,
  runAdaptiveEngine,
  type AdaptiveInput,
} from "../src/modules/interview/adaptive-engine.js";
import { selectQuestion } from "../src/modules/interview/question-bank.js";

const baseInput: AdaptiveInput = {
  currentDifficulty: "medium",
  currentTopic: "Databases",
  latestEvaluation: {
    topic: "Databases",
    overallScore: 50,
    missingConcepts: ["indexes"],
  },
  recentEvaluations: [],
  topicsAlreadyCovered: ["Databases"],
  targetTopics: ["Databases", "APIs", "Security"],
  questionCount: 1,
  questionLimit: 5,
};

describe("adaptive-v1", () => {
  it("uses the locked version and exact score boundaries", () => {
    expect(
      runAdaptiveEngine({
        ...baseInput,
        latestEvaluation: { ...baseInput.latestEvaluation, overallScore: 39 },
      }),
    ).toMatchObject({
      engineVersion: ADAPTIVE_ENGINE_VERSION,
      strategy: "easier_follow_up",
      difficulty: "easy",
    });
    expect(
      runAdaptiveEngine({
        ...baseInput,
        latestEvaluation: { ...baseInput.latestEvaluation, overallScore: 40 },
      }).strategy,
    ).toBe("same_depth");
    expect(
      runAdaptiveEngine({
        ...baseInput,
        latestEvaluation: { ...baseInput.latestEvaluation, overallScore: 70 },
      }),
    ).toMatchObject({ strategy: "deeper_follow_up", difficulty: "hard" });
  });

  it("never moves difficulty outside easy and hard", () => {
    expect(
      runAdaptiveEngine({
        ...baseInput,
        currentDifficulty: "easy",
        latestEvaluation: { ...baseInput.latestEvaluation, overallScore: 10 },
      }).difficulty,
    ).toBe("easy");
    expect(
      runAdaptiveEngine({
        ...baseInput,
        currentDifficulty: "hard",
        latestEvaluation: { ...baseInput.latestEvaluation, overallScore: 90 },
      }).difficulty,
    ).toBe("hard");
  });

  it("escapes a topic after two very weak answers", () => {
    expect(
      runAdaptiveEngine({
        ...baseInput,
        latestEvaluation: { ...baseInput.latestEvaluation, overallScore: 20 },
        recentEvaluations: [
          {
            topic: "Databases",
            overallScore: 30,
            missingConcepts: ["normalization"],
          },
        ],
      }),
    ).toMatchObject({ strategy: "new_topic", topic: "APIs" });
  });

  it.each([5, 10] as const)(
    "ends exactly at the selected %i-question limit",
    (questionLimit) => {
      expect(
        runAdaptiveEngine({
          ...baseInput,
          questionLimit,
          questionCount: questionLimit,
        }).complete,
      ).toBe(true);
      expect(
        runAdaptiveEngine({
          ...baseInput,
          questionLimit,
          questionCount: questionLimit - 1,
        }).complete,
      ).toBe(false);
    },
  );

  it("does not select an already used bank question", () => {
    const first = selectQuestion({
      type: "technical",
      difficulty: "easy",
      usedQuestionBankIds: [],
    });
    const second = selectQuestion({
      type: "technical",
      difficulty: "easy",
      usedQuestionBankIds: [first.id],
    });
    expect(second.id).not.toBe(first.id);
  });
});
