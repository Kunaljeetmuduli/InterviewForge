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

async function profileRequest(
  method: "GET" | "PUT",
  input?: ProfileInput,
): Promise<Profile | null> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/v1/profile`, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(input ? { "content-type": "application/json" } : {}),
    },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });

  const payload = (await response.json()) as ProfileResponse & ApiErrorResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "The profile request failed.");
  }

  return payload.data.profile;
}

export const profileApi = {
  get: () => profileRequest("GET"),
  update: (input: ProfileInput) => profileRequest("PUT", input),
};
