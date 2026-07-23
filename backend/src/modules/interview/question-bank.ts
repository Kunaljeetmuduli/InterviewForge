import questionBankData from "../../data/question_bank.json" with { type: "json" };
import { z } from "zod";

import type { Difficulty } from "./adaptive-engine.js";

const bankQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["hr", "technical", "behavioral", "dsa"]),
  topic: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  text: z.string().min(1),
  expectedConcepts: z.array(z.string().min(1)).min(1),
  followUpTopics: z.array(z.string().min(1)),
  estimatedSeconds: z.number().int().positive(),
  tags: z.array(z.string().min(1)),
});

export type BankQuestion = z.infer<typeof bankQuestionSchema>;
export const questionBank = bankQuestionSchema.array().parse(questionBankData);

interface SelectQuestionInput {
  type: BankQuestion["type"];
  preferredTopic?: string;
  difficulty: Difficulty;
  usedQuestionBankIds: string[];
}

const difficultyDistance = (left: Difficulty, right: Difficulty) =>
  Math.abs(
    ["easy", "medium", "hard"].indexOf(left) -
      ["easy", "medium", "hard"].indexOf(right),
  );

export function selectQuestion(input: SelectQuestionInput): BankQuestion {
  const unused = questionBank.filter(
    (question) =>
      question.type === input.type &&
      !input.usedQuestionBankIds.includes(question.id),
  );

  if (unused.length === 0) {
    throw new Error(`No unused ${input.type} questions remain.`);
  }

  const preferredTopic = input.preferredTopic?.toLocaleLowerCase();
  return [...unused].sort((left, right) => {
    const leftTopic =
      preferredTopic && left.topic.toLocaleLowerCase() === preferredTopic
        ? 0
        : 1;
    const rightTopic =
      preferredTopic && right.topic.toLocaleLowerCase() === preferredTopic
        ? 0
        : 1;
    return (
      leftTopic - rightTopic ||
      difficultyDistance(left.difficulty, input.difficulty) -
        difficultyDistance(right.difficulty, input.difficulty) ||
      left.id.localeCompare(right.id)
    );
  })[0]!;
}

export function topicsForInterviewType(type: BankQuestion["type"]) {
  return [
    ...new Set(
      questionBank
        .filter((question) => question.type === type)
        .map((question) => question.topic),
    ),
  ];
}
