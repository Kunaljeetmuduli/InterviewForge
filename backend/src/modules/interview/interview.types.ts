import { z } from "zod";

import type { AuthContext } from "../auth/auth.types.js";
import {
  ADAPTIVE_ENGINE_VERSION,
  type AdaptationStrategy,
  type Difficulty,
} from "./adaptive-engine.js";

export const interviewTypeSchema = z.enum([
  "hr",
  "technical",
  "behavioral",
  "dsa",
]);
export const interviewStatusSchema = z.enum([
  "created",
  "in_progress",
  "completed",
  "abandoned",
]);
export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const questionLimitSchema = z.union([z.literal(5), z.literal(10)]);

export const interviewCreateInputSchema = z
  .object({
    type: interviewTypeSchema,
    question_limit: questionLimitSchema.default(5),
    resume_id: z.uuid().nullable().optional(),
    job_description_id: z.uuid().nullable().optional(),
  })
  .strict();

export const interviewParamsSchema = z.object({ interviewId: z.uuid() });
export const answerParamsSchema = interviewParamsSchema.extend({
  answerId: z.uuid(),
});
export const answerInputSchema = z
  .object({
    questionId: z.uuid(),
    transcript: z.string().trim().min(1).max(20_000),
    inputMode: z.enum(["text", "voice"]),
    speakingDurationSeconds: z.number().positive().max(3_600).nullable().optional(),
    clientRequestId: z.uuid(),
  })
  .superRefine((value, context) => {
    if (value.inputMode === "voice" && !value.speakingDurationSeconds) {
      context.addIssue({
        code: "custom",
        path: ["speakingDurationSeconds"],
        message: "Voice answers require a speaking duration.",
      });
    }
    if (value.inputMode === "text" && value.speakingDurationSeconds) {
      context.addIssue({
        code: "custom",
        path: ["speakingDurationSeconds"],
        message: "Text answers cannot include a speaking duration.",
      });
    }
  })
  .strict();

export const interviewSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  resume_id: z.uuid().nullable(),
  job_description_id: z.uuid().nullable(),
  type: interviewTypeSchema,
  status: interviewStatusSchema,
  current_difficulty: difficultySchema,
  question_limit: questionLimitSchema,
  target_topics: z.array(z.string()),
  adaptive_engine_version: z.literal(ADAPTIVE_ENGINE_VERSION),
  overall_score: z.number().int().min(0).max(100).nullable(),
  started_at: z.iso.datetime({ offset: true }).nullable(),
  completed_at: z.iso.datetime({ offset: true }).nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export const questionSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  interview_id: z.uuid(),
  sequence_number: z.number().int().positive(),
  text: z.string().min(1),
  type: interviewTypeSchema,
  topic: z.string().min(1),
  difficulty: difficultySchema,
  expected_concepts: z.array(z.string()),
  follow_up_topics: z.array(z.string()),
  estimated_seconds: z.number().int().positive(),
  source: z.enum([
    "question_bank",
    "resume_generated",
    "jd_generated",
    "adaptive_follow_up",
  ]),
  question_bank_id: z.string().nullable(),
  adaptation_strategy: z
    .enum([
      "easier_follow_up",
      "same_depth",
      "deeper_follow_up",
      "new_topic",
    ])
    .nullable(),
  adaptation_reason: z.string().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  prompt_version: z.string().nullable(),
  schema_version: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});

export const answerSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  interview_id: z.uuid(),
  question_id: z.uuid(),
  client_request_id: z.uuid(),
  transcript: z.string().min(1),
  input_mode: z.enum(["text", "voice"]),
  processing_status: z.enum(["pending", "evaluated", "failed"]),
  speaking_duration_seconds: z.number().nullable(),
  word_count: z.number().int().nonnegative(),
  filler_words: z.array(z.object({ word: z.string(), count: z.number().int() })),
  filler_rate: z.number().nullable(),
  words_per_minute: z.number().nullable(),
  submitted_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export const evaluationSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  interview_id: z.uuid(),
  question_id: z.uuid(),
  answer_id: z.uuid(),
  overall_score: z.number().int().min(0).max(100),
  technical_score: z.number().int().min(0).max(100).nullable(),
  communication_score: z.number().int().min(0).max(100),
  completeness_score: z.number().int().min(0).max(100),
  relevance_score: z.number().int().min(0).max(100),
  delivery_score: z.number().int().min(0).max(100).nullable(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  detected_concepts: z.array(z.string()),
  missing_concepts: z.array(z.string()),
  improvement_tip: z.string(),
  example_answer: z.string(),
  provider: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  schema_version: z.string(),
  rubric_version: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});

export type InterviewType = z.infer<typeof interviewTypeSchema>;
export type Interview = z.infer<typeof interviewSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
export type InterviewCreateInput = z.infer<typeof interviewCreateInputSchema>;
export type AnswerInput = z.infer<typeof answerInputSchema>;

export type NewInterview = Pick<
  Interview,
  | "id"
  | "resume_id"
  | "job_description_id"
  | "type"
  | "status"
  | "current_difficulty"
  | "question_limit"
  | "target_topics"
  | "adaptive_engine_version"
  | "overall_score"
  | "started_at"
  | "completed_at"
>;
export type InterviewUpdate = Partial<
  Pick<
    Interview,
    | "status"
    | "current_difficulty"
    | "overall_score"
    | "started_at"
    | "completed_at"
  >
>;
export type NewQuestion = Omit<Question, "created_at">;
export type NewAnswer = Omit<Answer, "submitted_at" | "updated_at">;
export type NewEvaluation = Omit<Evaluation, "created_at">;

export interface InterviewRepository {
  createInterview(userId: string, accessToken: string, record: NewInterview): Promise<Interview>;
  listInterviews(userId: string, accessToken: string): Promise<Interview[]>;
  findInterview(userId: string, accessToken: string, interviewId: string): Promise<Interview | null>;
  updateInterview(userId: string, accessToken: string, interviewId: string, changes: InterviewUpdate): Promise<Interview>;
  transitionInterview(userId: string, accessToken: string, interviewId: string, expectedStatus: Interview["status"], changes: InterviewUpdate): Promise<Interview | null>;
  insertQuestion(userId: string, accessToken: string, question: NewQuestion): Promise<Question>;
  listQuestions(userId: string, accessToken: string, interviewId: string): Promise<Question[]>;
  insertAnswer(userId: string, accessToken: string, answer: NewAnswer): Promise<Answer>;
  listAnswers(userId: string, accessToken: string, interviewId: string): Promise<Answer[]>;
  findAnswerByRequestId(userId: string, accessToken: string, interviewId: string, clientRequestId: string): Promise<Answer | null>;
  findAnswer(userId: string, accessToken: string, answerId: string): Promise<Answer | null>;
  updateAnswer(userId: string, accessToken: string, answerId: string, changes: Pick<Answer, "processing_status">): Promise<Answer>;
  listEvaluations(userId: string, accessToken: string, interviewId: string): Promise<Evaluation[]>;
  findEvaluationByAnswer(userId: string, accessToken: string, answerId: string): Promise<Evaluation | null>;
  upsertEvaluation(userId: string, accessToken: string, evaluation: NewEvaluation): Promise<Evaluation>;
  deleteInterview(userId: string, accessToken: string, interviewId: string): Promise<void>;
}

export interface PublicQuestion {
  id: string;
  interview_id: string;
  sequence_number: number;
  text: string;
  type: InterviewType;
  topic: string;
  difficulty: Difficulty;
  estimated_seconds: number;
  source: Question["source"];
  adaptation_strategy: AdaptationStrategy | null;
  adaptation_reason: string | null;
}

export type InterviewAuthContext = AuthContext;
