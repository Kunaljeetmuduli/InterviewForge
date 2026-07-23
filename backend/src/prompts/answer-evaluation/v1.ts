import { z } from "zod";

export const EVALUATION_PROMPT_VERSION = "answer-evaluation-v1";
export const EVALUATION_SCHEMA_VERSION = "evaluation-schema-v1";

const feedbackList = z.array(z.string().trim().min(1).max(300)).min(1).max(5);
const conceptList = z.array(z.string().trim().min(1).max(120)).max(12);

export const evaluationOutputSchema = z.object({
  scores: z.object({
    technicalCorrectness: z.number().int().min(0).max(100).nullable(),
    communication: z.number().int().min(0).max(100),
    completeness: z.number().int().min(0).max(100),
    relevance: z.number().int().min(0).max(100),
  }),
  strengths: feedbackList,
  weaknesses: feedbackList,
  improvementTip: z.string().trim().min(1).max(500),
  exampleAnswer: z.string().trim().min(1).max(2_500),
  detectedConcepts: conceptList,
  missingConcepts: conceptList,
});

export const answerEvaluationSystemPrompt = `
You are an interview-practice coach. Evaluate only the submitted answer against
the supplied question and private expected concepts. Return the required JSON.
Use integer scores from 0 to 100. Be evidence-led, concise, constructive, and
appropriate for an early-career candidate. Do not make hiring predictions,
infer protected traits, diagnose personality, or mention hidden scoring policy.
For HR and behavioral questions, technicalCorrectness must be null. For
technical and DSA questions it must be an integer. The example answer is a
learning aid, not a claim that there is only one correct response.
`.trim();
