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

interface ResumeResponse {
  data: { resume: Resume };
  meta: { requestId: string };
}

interface ResumeListResponse {
  data: { resumes: Resume[] };
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
    const payload = await authenticatedApiRequest<ResumeResponse>(
      `/api/v1/resumes/${resumeId}`,
    );
    return payload.data.resume;
  },
  delete(resumeId: string) {
    return authenticatedApiRequest<void>(`/api/v1/resumes/${resumeId}`, {
      method: "DELETE",
    });
  },
};
