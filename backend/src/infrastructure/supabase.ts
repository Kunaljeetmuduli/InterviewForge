import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { AppEnvironment } from "../config/env.js";
import type { AuthVerifier } from "../modules/auth/auth.types.js";
import {
  jobDescriptionAnalysisSchema,
  jobDescriptionSchema,
  type JobDescriptionRepository,
} from "../modules/job-description/job-description.types.js";
import {
  profileSchema,
  type ProfileInput,
  type ProfileRepository,
} from "../modules/profile/profile.types.js";
import {
  resumeAnalysisSchema,
  resumeSchema,
  type ResumeRepository,
} from "../modules/resume/resume.types.js";

type SupabaseEnvironment = Pick<
  AppEnvironment,
  "supabaseUrl" | "supabasePublishableKey"
>;

const resumeSelect =
  "id, user_id, file_name, storage_path, mime_type, file_size, status, processing_stage, processing_attempt, error_code, error_message, is_primary, created_at, updated_at";
const resumeAnalysisSelect =
  "id, user_id, resume_id, extracted_text, summary, skills, projects, education, experience, certifications, technologies, strengths, provider, model, prompt_version, schema_version, created_at, updated_at";
const jobDescriptionSelect =
  "id, user_id, title, company, raw_text, status, error_code, error_message, created_at, updated_at";
const jobDescriptionAnalysisSelect =
  "id, user_id, job_description_id, required_skills, preferred_skills, minimum_experience, responsibilities, keywords, matching_skills, missing_skills, alignment_score, alignment_algorithm_version, provider, model, prompt_version, schema_version, created_at, updated_at";

function createRequestClient(
  environment: SupabaseEnvironment,
  accessToken: string,
) {
  return createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      accessToken: () => Promise.resolve(accessToken),
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

export function createSupabaseAuthVerifier(
  environment: Pick<
    AppEnvironment,
    "supabaseUrl" | "supabasePublishableKey"
  >,
): AuthVerifier {
  const client = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );

  return {
    async verify(accessToken) {
      const { data, error } = await client.auth.getClaims(accessToken);

      if (error || !data?.claims.sub) {
        return null;
      }

      const id = z.uuid().safeParse(data.claims.sub);

      if (!id.success) {
        return null;
      }

      return {
        id: id.data,
        ...(typeof data.claims.email === "string"
          ? { email: data.claims.email }
          : {}),
      };
    },
  };
}

export function createSupabaseProfileRepository(
  environment: SupabaseEnvironment,
): ProfileRepository {
  return {
    async findByUserId(userId, accessToken) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("profiles")
        .select(
          "id, full_name, target_role, experience_level, created_at, updated_at",
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? profileSchema.parse(data) : null;
    },

    async upsertForUser(userId, accessToken, input: ProfileInput) {
      const now = new Date().toISOString();
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("profiles")
        .upsert(
          {
            id: userId,
            ...input,
            updated_at: now,
          },
          { onConflict: "id" },
        )
        .select(
          "id, full_name, target_role, experience_level, created_at, updated_at",
        )
        .single();

      if (error) {
        throw error;
      }

      return profileSchema.parse(data);
    },
  };
}

export function createSupabaseResumeRepository(
  environment: SupabaseEnvironment,
): ResumeRepository {
  return {
    async hasPrimaryForUser(userId, accessToken) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("resumes")
        .select("id")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return Boolean(data);
    },

    async createForUser(userId, accessToken, record) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("resumes")
        .insert({ user_id: userId, ...record })
        .select(resumeSelect)
        .single();

      if (error) {
        throw error;
      }

      return resumeSchema.parse(data);
    },

    async listForUser(userId, accessToken) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("resumes")
        .select(resumeSelect)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return resumeSchema.array().parse(data);
    },

    async findByIdForUser(userId, accessToken, resumeId) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("resumes")
        .select(resumeSelect)
        .eq("id", resumeId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? resumeSchema.parse(data) : null;
    },

    async updateForUser(userId, accessToken, resumeId, changes) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("resumes")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", resumeId)
        .eq("user_id", userId)
        .select(resumeSelect)
        .single();

      if (error) {
        throw error;
      }

      return resumeSchema.parse(data);
    },

    async transitionForUser(
      userId,
      accessToken,
      resumeId,
      expectedStatus,
      changes,
    ) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("resumes")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", resumeId)
        .eq("user_id", userId)
        .eq("status", expectedStatus)
        .select(resumeSelect)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? resumeSchema.parse(data) : null;
    },

    async downloadStorageObject(accessToken, storagePath) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .storage.from("resumes")
        .download(storagePath);

      if (error) {
        throw error;
      }

      return new Uint8Array(await data.arrayBuffer());
    },

    async findAnalysisForResume(userId, accessToken, resumeId) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("resume_analysis")
        .select(resumeAnalysisSelect)
        .eq("resume_id", resumeId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? resumeAnalysisSchema.parse(data) : null;
    },

    async upsertAnalysis(userId, accessToken, analysis) {
      const now = new Date().toISOString();
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("resume_analysis")
        .upsert(
          { ...analysis, user_id: userId, updated_at: now },
          { onConflict: "resume_id" },
        )
        .select(resumeAnalysisSelect)
        .single();

      if (error) {
        throw error;
      }

      return resumeAnalysisSchema.parse(data);
    },

    async removeStorageObject(accessToken, storagePath) {
      const { error } = await createRequestClient(environment, accessToken)
        .storage.from("resumes")
        .remove([storagePath]);

      if (error) {
        throw error;
      }
    },

    async deleteForUser(userId, accessToken, resumeId) {
      const { error } = await createRequestClient(environment, accessToken)
        .from("resumes")
        .delete()
        .eq("id", resumeId)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
    },
  };
}

export function createSupabaseJobDescriptionRepository(
  environment: SupabaseEnvironment,
): JobDescriptionRepository {
  return {
    async createForUser(userId, accessToken, record) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("job_descriptions")
        .insert({ user_id: userId, ...record })
        .select(jobDescriptionSelect)
        .single();

      if (error) {
        throw error;
      }

      return jobDescriptionSchema.parse(data);
    },

    async listForUser(userId, accessToken) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("job_descriptions")
        .select(jobDescriptionSelect)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return jobDescriptionSchema.array().parse(data);
    },

    async findByIdForUser(userId, accessToken, jobDescriptionId) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("job_descriptions")
        .select(jobDescriptionSelect)
        .eq("id", jobDescriptionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? jobDescriptionSchema.parse(data) : null;
    },

    async updateForUser(userId, accessToken, jobDescriptionId, changes) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("job_descriptions")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", jobDescriptionId)
        .eq("user_id", userId)
        .select(jobDescriptionSelect)
        .single();

      if (error) {
        throw error;
      }

      return jobDescriptionSchema.parse(data);
    },

    async transitionForUser(
      userId,
      accessToken,
      jobDescriptionId,
      expectedStatus,
      changes,
    ) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("job_descriptions")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", jobDescriptionId)
        .eq("user_id", userId)
        .eq("status", expectedStatus)
        .select(jobDescriptionSelect)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? jobDescriptionSchema.parse(data) : null;
    },

    async deleteForUser(userId, accessToken, jobDescriptionId) {
      const { error } = await createRequestClient(environment, accessToken)
        .from("job_descriptions")
        .delete()
        .eq("id", jobDescriptionId)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
    },

    async findAnalysisForJobDescription(userId, accessToken, jobDescriptionId) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("jd_analysis")
        .select(jobDescriptionAnalysisSelect)
        .eq("job_description_id", jobDescriptionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? jobDescriptionAnalysisSchema.parse(data) : null;
    },

    async upsertAnalysis(userId, accessToken, analysis) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("jd_analysis")
        .upsert(
          {
            ...analysis,
            user_id: userId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "job_description_id" },
        )
        .select(jobDescriptionAnalysisSelect)
        .single();

      if (error) {
        throw error;
      }

      return jobDescriptionAnalysisSchema.parse(data);
    },
  };
}
