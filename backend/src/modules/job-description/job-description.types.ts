import { z } from "zod";

import type { AuthContext } from "../auth/auth.types.js";

const stringList = z.array(z.string().trim().min(1).max(160)).max(60);

export const jobDescriptionCreateInputSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    company: z.string().trim().max(180).optional(),
    raw_text: z.string().trim().min(200).max(30_000),
    resume_id: z.uuid(),
  })
  .strict();

export const jobDescriptionRetryInputSchema = z
  .object({ resume_id: z.uuid() })
  .strict();

export const jobDescriptionParamsSchema = z.object({
  jobDescriptionId: z.uuid(),
});

export const jobDescriptionStatusSchema = z.enum([
  "pending",
  "analyzing",
  "completed",
  "failed",
]);

export const jobDescriptionSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  title: z.string().min(1),
  company: z.string().nullable(),
  raw_text: z.string().min(1),
  status: jobDescriptionStatusSchema,
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export const jobDescriptionAnalysisSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  job_description_id: z.uuid(),
  required_skills: stringList,
  preferred_skills: stringList,
  minimum_experience: z.string(),
  responsibilities: z.array(z.string().min(1).max(500)).max(40),
  keywords: stringList,
  matching_skills: stringList,
  missing_skills: stringList,
  alignment_score: z.number().int().min(0).max(100),
  alignment_algorithm_version: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  prompt_version: z.string().min(1),
  schema_version: z.string().min(1),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export type JobDescriptionCreateInput = z.infer<
  typeof jobDescriptionCreateInputSchema
>;
export type JobDescription = z.infer<typeof jobDescriptionSchema>;
export type JobDescriptionAnalysis = z.infer<
  typeof jobDescriptionAnalysisSchema
>;
export type NewJobDescription = Pick<
  JobDescription,
  "id" | "title" | "company" | "raw_text" | "status" | "error_code" | "error_message"
>;
export type JobDescriptionUpdate = Pick<
  JobDescription,
  "status" | "error_code" | "error_message"
>;
export type NewJobDescriptionAnalysis = Omit<
  JobDescriptionAnalysis,
  "id" | "created_at" | "updated_at"
>;

export interface JobDescriptionRepository {
  createForUser(
    userId: string,
    accessToken: string,
    record: NewJobDescription,
  ): Promise<JobDescription>;
  listForUser(userId: string, accessToken: string): Promise<JobDescription[]>;
  findByIdForUser(
    userId: string,
    accessToken: string,
    jobDescriptionId: string,
  ): Promise<JobDescription | null>;
  updateForUser(
    userId: string,
    accessToken: string,
    jobDescriptionId: string,
    changes: JobDescriptionUpdate,
  ): Promise<JobDescription>;
  transitionForUser(
    userId: string,
    accessToken: string,
    jobDescriptionId: string,
    expectedStatus: JobDescription["status"],
    changes: JobDescriptionUpdate,
  ): Promise<JobDescription | null>;
  deleteForUser(
    userId: string,
    accessToken: string,
    jobDescriptionId: string,
  ): Promise<void>;
  findAnalysisForJobDescription(
    userId: string,
    accessToken: string,
    jobDescriptionId: string,
  ): Promise<JobDescriptionAnalysis | null>;
  upsertAnalysis(
    userId: string,
    accessToken: string,
    analysis: NewJobDescriptionAnalysis,
  ): Promise<JobDescriptionAnalysis>;
}

export type JobDescriptionAuthContext = AuthContext;
