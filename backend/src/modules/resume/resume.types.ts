import { z } from "zod";

import type { AuthContext } from "../auth/auth.types.js";
import { resumeAnalysisOutputSchema } from "../../prompts/resume-analysis/v1.js";

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

export const resumeCreateInputSchema = z
  .object({
    file_name: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(
        (fileName) =>
          !fileName.includes("/") &&
          !fileName.includes("\\") &&
          fileName.toLowerCase().endsWith(".pdf"),
        {
          message: "The file name must be a PDF without path characters.",
        },
      ),
    mime_type: z.literal("application/pdf"),
    file_size: z.number().int().positive().max(MAX_RESUME_SIZE_BYTES),
  })
  .strict();

export const resumeStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const resumeProcessingStageSchema = z
  .enum(["uploaded", "parsing", "redacting", "analyzing"])
  .nullable();

export const resumeSchema = resumeCreateInputSchema.extend({
  id: z.uuid(),
  user_id: z.uuid(),
  storage_path: z.string().min(1),
  status: resumeStatusSchema,
  processing_stage: resumeProcessingStageSchema,
  processing_attempt: z.number().int().nonnegative(),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
  is_primary: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export const resumeAnalysisSchema = resumeAnalysisOutputSchema.extend({
  id: z.uuid(),
  user_id: z.uuid(),
  resume_id: z.uuid(),
  extracted_text: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  prompt_version: z.string().min(1),
  schema_version: z.string().min(1),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export const resumeParamsSchema = z.object({
  resumeId: z.uuid(),
});

export type ResumeCreateInput = z.infer<typeof resumeCreateInputSchema>;
export type Resume = z.infer<typeof resumeSchema>;
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;

export type NewResumeRecord = Pick<
  Resume,
  | "id"
  | "file_name"
  | "storage_path"
  | "mime_type"
  | "file_size"
  | "status"
  | "processing_stage"
  | "processing_attempt"
  | "error_code"
  | "error_message"
  | "is_primary"
>;

export type ResumeUpdate = Pick<
  Resume,
  | "status"
  | "processing_stage"
  | "processing_attempt"
  | "error_code"
  | "error_message"
>;

export type NewResumeAnalysis = Omit<
  ResumeAnalysis,
  "id" | "created_at" | "updated_at"
>;

export interface ResumeRepository {
  hasPrimaryForUser(userId: string, accessToken: string): Promise<boolean>;
  createForUser(
    userId: string,
    accessToken: string,
    record: NewResumeRecord,
  ): Promise<Resume>;
  listForUser(userId: string, accessToken: string): Promise<Resume[]>;
  findByIdForUser(
    userId: string,
    accessToken: string,
    resumeId: string,
  ): Promise<Resume | null>;
  updateForUser(
    userId: string,
    accessToken: string,
    resumeId: string,
    changes: ResumeUpdate,
  ): Promise<Resume>;
  transitionForUser(
    userId: string,
    accessToken: string,
    resumeId: string,
    expectedStatus: Resume["status"],
    changes: ResumeUpdate,
  ): Promise<Resume | null>;
  downloadStorageObject(
    accessToken: string,
    storagePath: string,
  ): Promise<Uint8Array>;
  findAnalysisForResume(
    userId: string,
    accessToken: string,
    resumeId: string,
  ): Promise<ResumeAnalysis | null>;
  upsertAnalysis(
    userId: string,
    accessToken: string,
    analysis: NewResumeAnalysis,
  ): Promise<ResumeAnalysis>;
  removeStorageObject(accessToken: string, storagePath: string): Promise<void>;
  deleteForUser(
    userId: string,
    accessToken: string,
    resumeId: string,
  ): Promise<void>;
}

export type ResumeAuthContext = AuthContext;
