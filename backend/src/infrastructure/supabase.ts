import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { AppEnvironment } from "../config/env.js";
import type { AuthVerifier } from "../modules/auth/auth.types.js";
import {
  profileSchema,
  type ProfileInput,
  type ProfileRepository,
} from "../modules/profile/profile.types.js";
import {
  resumeSchema,
  type ResumeRepository,
} from "../modules/resume/resume.types.js";

type SupabaseEnvironment = Pick<
  AppEnvironment,
  "supabaseUrl" | "supabasePublishableKey"
>;

const resumeSelect =
  "id, user_id, file_name, storage_path, mime_type, file_size, status, processing_stage, processing_attempt, error_code, error_message, is_primary, created_at, updated_at";

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
