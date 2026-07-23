import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  full_name: string;
  target_role: string;
  experience_level: string;
  created_at: string;
  updated_at: string;
}

export type ProfileInput = Pick<
  Profile,
  "full_name" | "target_role" | "experience_level"
>;

interface ProfileResponse {
  data: { profile: Profile | null };
  meta: { requestId: string };
}

interface ApiErrorResponse {
  error?: { message?: string };
}

async function authenticatedApiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as T & ApiErrorResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "The request failed.");
  }

  return payload;
}

async function profileRequest(
  method: "GET" | "PUT",
  input?: ProfileInput,
): Promise<Profile | null> {
  const payload = await authenticatedApiRequest<ProfileResponse>(
    "/api/v1/profile",
    {
      method,
      headers: {
        ...(input ? { "content-type": "application/json" } : {}),
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    },
  );

  return payload.data.profile;
}

export const profileApi = {
  get: () => profileRequest("GET"),
  update: (input: ProfileInput) => profileRequest("PUT", input),
};

export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  mime_type: "application/pdf";
  file_size: number;
  status: "pending" | "processing" | "completed" | "failed";
  processing_stage:
    | "uploaded"
    | "parsing"
    | "redacting"
    | "analyzing"
    | null;
  processing_attempt: number;
  error_code: string | null;
  error_message: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResumeCreateInput {
  file_name: string;
  mime_type: "application/pdf";
  file_size: number;
}

export interface ResumeAnalysis {
  id: string;
  user_id: string;
  resume_id: string;
  extracted_text: string;
  summary: string;
  skills: string[];
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    evidence: string;
  }>;
  education: Array<{
    qualification: string;
    institution: string;
    details: string;
  }>;
  experience: Array<{
    role: string;
    organization: string;
    duration: string;
    duration_years: number | null;
    highlights: string[];
  }>;
  certifications: string[];
  technologies: string[];
  strengths: string[];
  provider: string;
  model: string;
  prompt_version: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
}

interface ResumeResponse {
  data: { resume: Resume };
  meta: { requestId: string };
}

interface ResumeListResponse {
  data: { resumes: Resume[] };
  meta: { requestId: string };
}

interface ResumeDetailResponse {
  data: { resume: Resume; analysis: ResumeAnalysis | null };
  meta: { requestId: string };
}

export const resumeApi = {
  async create(input: ResumeCreateInput) {
    const payload = await authenticatedApiRequest<ResumeResponse>(
      "/api/v1/resumes",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    return payload.data.resume;
  },
  async list() {
    const payload = await authenticatedApiRequest<ResumeListResponse>(
      "/api/v1/resumes",
    );
    return payload.data.resumes;
  },
  async get(resumeId: string) {
    const payload = await authenticatedApiRequest<ResumeDetailResponse>(
      `/api/v1/resumes/${resumeId}`,
    );
    return payload.data;
  },
  async process(resumeId: string) {
    const payload = await authenticatedApiRequest<ResumeDetailResponse>(
      `/api/v1/resumes/${resumeId}/process`,
      { method: "POST" },
    );
    return payload.data;
  },
  async retry(resumeId: string) {
    const payload = await authenticatedApiRequest<ResumeDetailResponse>(
      `/api/v1/resumes/${resumeId}/retry`,
      { method: "POST" },
    );
    return payload.data;
  },
  delete(resumeId: string) {
    return authenticatedApiRequest<void>(`/api/v1/resumes/${resumeId}`, {
      method: "DELETE",
    });
  },
};

export interface JobDescription {
  id: string;
  user_id: string;
  title: string;
  company: string | null;
  raw_text: string;
  status: "pending" | "analyzing" | "completed" | "failed";
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobDescriptionAnalysis {
  id: string;
  user_id: string;
  job_description_id: string;
  required_skills: string[];
  preferred_skills: string[];
  minimum_experience: string;
  responsibilities: string[];
  keywords: string[];
  matching_skills: string[];
  missing_skills: string[];
  alignment_score: number;
  alignment_algorithm_version: string;
  provider: string;
  model: string;
  prompt_version: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
}

interface JobDescriptionListResponse {
  data: { job_descriptions: JobDescription[] };
  meta: { requestId: string };
}

interface JobDescriptionDetailResponse {
  data: {
    jobDescription: JobDescription;
    analysis: JobDescriptionAnalysis | null;
  };
  meta: { requestId: string };
}

export interface JobDescriptionCreateInput {
  title: string;
  company?: string;
  raw_text: string;
  resume_id: string;
}

export const jobDescriptionApi = {
  async create(input: JobDescriptionCreateInput) {
    const payload = await authenticatedApiRequest<JobDescriptionDetailResponse>(
      "/api/v1/job-descriptions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    return payload.data;
  },
  async list() {
    const payload = await authenticatedApiRequest<JobDescriptionListResponse>(
      "/api/v1/job-descriptions",
    );
    return payload.data.job_descriptions;
  },
  async get(jobDescriptionId: string) {
    const payload = await authenticatedApiRequest<JobDescriptionDetailResponse>(
      `/api/v1/job-descriptions/${jobDescriptionId}`,
    );
    return payload.data;
  },
  async retry(jobDescriptionId: string, resumeId: string) {
    const payload = await authenticatedApiRequest<JobDescriptionDetailResponse>(
      `/api/v1/job-descriptions/${jobDescriptionId}/retry`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resume_id: resumeId }),
      },
    );
    return payload.data;
  },
  delete(jobDescriptionId: string) {
    return authenticatedApiRequest<void>(
      `/api/v1/job-descriptions/${jobDescriptionId}`,
      { method: "DELETE" },
    );
  },
};

export type InterviewType = "hr" | "technical" | "behavioral" | "dsa";
export type InterviewStatus =
  | "created"
  | "in_progress"
  | "completed"
  | "abandoned";
export type Difficulty = "easy" | "medium" | "hard";

export interface Interview {
  id: string;
  user_id: string;
  resume_id: string | null;
  job_description_id: string | null;
  type: InterviewType;
  status: InterviewStatus;
  current_difficulty: Difficulty;
  question_limit: 5 | 10;
  target_topics: string[];
  adaptive_engine_version: "adaptive-v1";
  overall_score: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: string;
  interview_id: string;
  sequence_number: number;
  text: string;
  type: InterviewType;
  topic: string;
  difficulty: Difficulty;
  estimated_seconds: number;
  source: "question_bank" | "resume_generated" | "jd_generated" | "adaptive_follow_up";
  adaptation_strategy:
    | "easier_follow_up"
    | "same_depth"
    | "deeper_follow_up"
    | "new_topic"
    | null;
  adaptation_reason: string | null;
}

export interface InterviewAnswer {
  id: string;
  interview_id: string;
  question_id: string;
  client_request_id: string;
  transcript: string;
  input_mode: "text" | "voice";
  processing_status: "pending" | "evaluated" | "failed";
  speaking_duration_seconds: number | null;
  word_count: number;
  filler_words: Array<{ word: string; count: number }>;
  filler_rate: number | null;
  words_per_minute: number | null;
  submitted_at: string;
}

export interface InterviewEvaluation {
  id: string;
  interview_id: string;
  question_id: string;
  answer_id: string;
  overall_score: number;
  technical_score: number | null;
  communication_score: number;
  completeness_score: number;
  relevance_score: number;
  delivery_score: number | null;
  strengths: string[];
  weaknesses: string[];
  detected_concepts: string[];
  missing_concepts: string[];
  improvement_tip: string;
  example_answer: string;
  provider: string;
  model: string;
  prompt_version: string;
  schema_version: string;
  rubric_version: string;
  created_at: string;
}

export interface InterviewDetail {
  interview: Interview;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  evaluations: InterviewEvaluation[];
  currentQuestion: InterviewQuestion | null;
}

interface InterviewResponse {
  data: { interview: Interview };
  meta: { requestId: string };
}

interface InterviewListResponse {
  data: { interviews: Interview[] };
  meta: { requestId: string };
}

interface InterviewDetailResponse {
  data: InterviewDetail;
  meta: { requestId: string };
}

interface InterviewStartResponse {
  data: { interview: Interview; currentQuestion: InterviewQuestion };
  meta: { requestId: string };
}

export interface AnswerResult {
  answer: InterviewAnswer;
  evaluation: InterviewEvaluation | null;
  adaptation: {
    engineVersion: "adaptive-v1";
    difficulty: Difficulty;
    topic: string;
    strategy: string | null;
    focusConcepts: string[];
    reason: string | null;
    complete: boolean;
  } | null;
  nextQuestion: InterviewQuestion | null;
  interview: Interview;
  interviewComplete: boolean;
}

interface AnswerResponse {
  data: AnswerResult;
  meta: { requestId: string };
}

interface ReportResponse {
  data: { report: InterviewDetail };
  meta: { requestId: string };
}

export const interviewApi = {
  async create(input: {
    type: InterviewType;
    question_limit: 5 | 10;
    resume_id?: string | null;
    job_description_id?: string | null;
  }) {
    const payload = await authenticatedApiRequest<InterviewResponse>(
      "/api/v1/interviews",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    return payload.data.interview;
  },
  async list() {
    const payload = await authenticatedApiRequest<InterviewListResponse>(
      "/api/v1/interviews",
    );
    return payload.data.interviews;
  },
  async get(interviewId: string) {
    const payload = await authenticatedApiRequest<InterviewDetailResponse>(
      `/api/v1/interviews/${interviewId}`,
    );
    return payload.data;
  },
  async start(interviewId: string) {
    const payload = await authenticatedApiRequest<InterviewStartResponse>(
      `/api/v1/interviews/${interviewId}/start`,
      { method: "POST" },
    );
    return payload.data;
  },
  async answer(
    interviewId: string,
    input: {
      questionId: string;
      transcript: string;
      inputMode: "text" | "voice";
      speakingDurationSeconds?: number | null;
      clientRequestId: string;
    },
  ) {
    const payload = await authenticatedApiRequest<AnswerResponse>(
      `/api/v1/interviews/${interviewId}/answers`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    return payload.data;
  },
  async retryEvaluation(interviewId: string, answerId: string) {
    const payload = await authenticatedApiRequest<AnswerResponse>(
      `/api/v1/interviews/${interviewId}/answers/${answerId}/retry-evaluation`,
      { method: "POST" },
    );
    return payload.data;
  },
  async complete(interviewId: string) {
    const payload = await authenticatedApiRequest<InterviewResponse>(
      `/api/v1/interviews/${interviewId}/complete`,
      { method: "POST" },
    );
    return payload.data.interview;
  },
  async abandon(interviewId: string) {
    const payload = await authenticatedApiRequest<InterviewResponse>(
      `/api/v1/interviews/${interviewId}/abandon`,
      { method: "POST" },
    );
    return payload.data.interview;
  },
  async report(interviewId: string) {
    const payload = await authenticatedApiRequest<ReportResponse>(
      `/api/v1/interviews/${interviewId}/report`,
    );
    return payload.data.report;
  },
  async delete(interviewId: string) {
    await authenticatedApiRequest<void>(`/api/v1/interviews/${interviewId}`, {
      method: "DELETE",
    });
  },
};

export interface DashboardSummary {
  interviewsTaken: number;
  averageScore: number | null;
  strongAreas: number;
  areasToImprove: number;
}
export interface TopicMastery {
  topic: string;
  score: number;
  classification:
    | "Critical weakness"
    | "Needs improvement"
    | "Developing"
    | "Strong"
    | "Excellent";
  answerCount: number;
}
export interface ProgressPoint {
  interviewId: string;
  completedAt: string;
  score: number;
  type: InterviewType;
}

export const dashboardApi = {
  async summary() {
    const payload = await authenticatedApiRequest<{
      data: { summary: DashboardSummary };
    }>("/api/v1/dashboard/summary");
    return payload.data.summary;
  },
  async mastery() {
    const payload = await authenticatedApiRequest<{
      data: { topics: TopicMastery[]; algorithmVersion: string };
    }>("/api/v1/dashboard/topic-mastery");
    return payload.data;
  },
  async progress() {
    const payload = await authenticatedApiRequest<{
      data: { points: ProgressPoint[] };
    }>("/api/v1/dashboard/progress");
    return payload.data.points;
  },
};

export interface RoadmapResult {
  roadmap: {
    id: string;
    focus_topics: Array<{
      topic: string;
      score: number;
      reason: string;
      suggestedHours: number;
    }>;
    plan: Array<{
      topic: string;
      action: string;
      resourceId: string;
      completed: boolean;
    }>;
    algorithm_version: "roadmap-v1";
    updated_at: string;
  };
  resources: Array<{
    id: string;
    title: string;
    url: string;
    topics: string[];
    kind: string;
  }>;
}

export const roadmapApi = {
  async latest() {
    const payload = await authenticatedApiRequest<{
      data: { result: RoadmapResult | null };
    }>("/api/v1/roadmaps/latest");
    return payload.data.result;
  },
  async generate(completedResourceIds: string[] = []) {
    const payload = await authenticatedApiRequest<{
      data: { result: RoadmapResult };
    }>("/api/v1/roadmaps/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completedResourceIds }),
    });
    return payload.data.result;
  },
};
