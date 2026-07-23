import { z } from "zod";

import type { InterviewAuthContext } from "../interview/interview.types.js";

export const ROADMAP_ALGORITHM_VERSION = "roadmap-v1";

export const roadmapFocusSchema = z.object({
  topic: z.string(),
  score: z.number().int().min(0).max(100),
  reason: z.string(),
  suggestedHours: z.number().positive(),
});
export const roadmapPlanItemSchema = z.object({
  topic: z.string(),
  action: z.string(),
  resourceId: z.string(),
  completed: z.boolean(),
});
export const roadmapSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  source_interview_id: z.uuid().nullable(),
  focus_topics: z.array(roadmapFocusSchema),
  plan: z.array(roadmapPlanItemSchema),
  resource_ids: z.array(z.string()),
  algorithm_version: z.literal(ROADMAP_ALGORITHM_VERSION),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  prompt_version: z.string().nullable(),
  schema_version: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export const roadmapGenerateInputSchema = z
  .object({ completedResourceIds: z.array(z.string()).max(20).default([]) })
  .strict();

export type Roadmap = z.infer<typeof roadmapSchema>;
export type NewRoadmap = Omit<Roadmap, "created_at" | "updated_at">;
export type RoadmapAuthContext = InterviewAuthContext;

export interface RoadmapRepository {
  latest(userId: string, accessToken: string): Promise<Roadmap | null>;
  create(userId: string, accessToken: string, record: NewRoadmap): Promise<Roadmap>;
}
