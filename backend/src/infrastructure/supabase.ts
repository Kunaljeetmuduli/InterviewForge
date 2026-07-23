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
  answerSchema,
  evaluationSchema,
  interviewSchema,
  questionSchema,
  type InterviewRepository,
} from "../modules/interview/interview.types.js";
import {
  roadmapSchema,
  type RoadmapRepository,
} from "../modules/roadmap/roadmap.types.js";
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
const interviewSelect =
  "id, user_id, resume_id, job_description_id, type, status, current_difficulty, question_limit, target_topics, adaptive_engine_version, overall_score, started_at, completed_at, created_at, updated_at";
const questionSelect =
  "id, user_id, interview_id, sequence_number, text, type, topic, difficulty, expected_concepts, follow_up_topics, estimated_seconds, source, question_bank_id, adaptation_strategy, adaptation_reason, provider, model, prompt_version, schema_version, created_at";
const answerSelect =
  "id, user_id, interview_id, question_id, client_request_id, transcript, input_mode, processing_status, speaking_duration_seconds, word_count, filler_words, filler_rate, words_per_minute, submitted_at, updated_at";
const evaluationSelect =
  "id, user_id, interview_id, question_id, answer_id, overall_score, technical_score, communication_score, completeness_score, relevance_score, delivery_score, strengths, weaknesses, detected_concepts, missing_concepts, improvement_tip, example_answer, provider, model, prompt_version, schema_version, rubric_version, created_at";
const roadmapSelect =
  "id, user_id, source_interview_id, focus_topics, plan, resource_ids, algorithm_version, provider, model, prompt_version, schema_version, created_at, updated_at";

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

export function createSupabaseInterviewRepository(
  environment: SupabaseEnvironment,
): InterviewRepository {
  return {
    async createInterview(userId, accessToken, record) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("interviews")
        .insert({ ...record, user_id: userId })
        .select(interviewSelect)
        .single();
      if (error) throw error;
      return interviewSchema.parse(data);
    },

    async listInterviews(userId, accessToken) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("interviews")
        .select(interviewSelect)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return interviewSchema.array().parse(data);
    },

    async findInterview(userId, accessToken, interviewId) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("interviews")
        .select(interviewSelect)
        .eq("id", interviewId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? interviewSchema.parse(data) : null;
    },

    async updateInterview(userId, accessToken, interviewId, changes) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("interviews")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", interviewId)
        .eq("user_id", userId)
        .select(interviewSelect)
        .single();
      if (error) throw error;
      return interviewSchema.parse(data);
    },

    async transitionInterview(
      userId,
      accessToken,
      interviewId,
      expectedStatus,
      changes,
    ) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("interviews")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", interviewId)
        .eq("user_id", userId)
        .eq("status", expectedStatus)
        .select(interviewSelect)
        .maybeSingle();
      if (error) throw error;
      return data ? interviewSchema.parse(data) : null;
    },

    async insertQuestion(userId, accessToken, question) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("questions")
        .insert({ ...question, user_id: userId })
        .select(questionSelect)
        .single();
      if (error) throw error;
      return questionSchema.parse(data);
    },

    async listQuestions(userId, accessToken, interviewId) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("questions")
        .select(questionSelect)
        .eq("user_id", userId)
        .eq("interview_id", interviewId)
        .order("sequence_number", { ascending: true });
      if (error) throw error;
      return questionSchema.array().parse(data);
    },

    async insertAnswer(userId, accessToken, answer) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("answers")
        .insert({ ...answer, user_id: userId })
        .select(answerSelect)
        .single();
      if (error) throw error;
      return answerSchema.parse(data);
    },

    async listAnswers(userId, accessToken, interviewId) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("answers")
        .select(answerSelect)
        .eq("user_id", userId)
        .eq("interview_id", interviewId)
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return answerSchema.array().parse(data);
    },

    async findAnswerByRequestId(
      userId,
      accessToken,
      interviewId,
      clientRequestId,
    ) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("answers")
        .select(answerSelect)
        .eq("user_id", userId)
        .eq("interview_id", interviewId)
        .eq("client_request_id", clientRequestId)
        .maybeSingle();
      if (error) throw error;
      return data ? answerSchema.parse(data) : null;
    },

    async findAnswer(userId, accessToken, answerId) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("answers")
        .select(answerSelect)
        .eq("user_id", userId)
        .eq("id", answerId)
        .maybeSingle();
      if (error) throw error;
      return data ? answerSchema.parse(data) : null;
    },

    async updateAnswer(userId, accessToken, answerId, changes) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("answers")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("id", answerId)
        .select(answerSelect)
        .single();
      if (error) throw error;
      return answerSchema.parse(data);
    },

    async listEvaluations(userId, accessToken, interviewId) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("evaluations")
        .select(evaluationSelect)
        .eq("user_id", userId)
        .eq("interview_id", interviewId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return evaluationSchema.array().parse(data);
    },

    async findEvaluationByAnswer(userId, accessToken, answerId) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("evaluations")
        .select(evaluationSelect)
        .eq("user_id", userId)
        .eq("answer_id", answerId)
        .maybeSingle();
      if (error) throw error;
      return data ? evaluationSchema.parse(data) : null;
    },

    async upsertEvaluation(userId, accessToken, evaluation) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("evaluations")
        .upsert({ ...evaluation, user_id: userId }, { onConflict: "answer_id" })
        .select(evaluationSelect)
        .single();
      if (error) throw error;
      return evaluationSchema.parse(data);
    },

    async deleteInterview(userId, accessToken, interviewId) {
      const { error } = await createRequestClient(environment, accessToken)
        .from("interviews")
        .delete()
        .eq("user_id", userId)
        .eq("id", interviewId);
      if (error) throw error;
    },
  };
}

export function createSupabaseRoadmapRepository(
  environment: SupabaseEnvironment,
): RoadmapRepository {
  return {
    async latest(userId, accessToken) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("roadmaps")
        .select(roadmapSelect)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? roadmapSchema.parse(data) : null;
    },
    async create(userId, accessToken, record) {
      const { data, error } = await createRequestClient(environment, accessToken)
        .from("roadmaps")
        .insert({ ...record, user_id: userId })
        .select(roadmapSelect)
        .single();
      if (error) throw error;
      return roadmapSchema.parse(data);
    },
  };
}
