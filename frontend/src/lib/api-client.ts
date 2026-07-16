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
