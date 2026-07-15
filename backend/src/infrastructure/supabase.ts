import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { AppEnvironment } from "../config/env.js";
import {
  profileSchema,
  type AuthVerifier,
  type ProfileInput,
  type ProfileRepository,
} from "../modules/profile/profile.types.js";

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
  environment: Pick<
    AppEnvironment,
    "supabaseUrl" | "supabasePublishableKey"
  >,
): ProfileRepository {
  const forRequest = (accessToken: string) =>
    createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
      accessToken: () => Promise.resolve(accessToken),
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });

  return {
    async findByUserId(userId, accessToken) {
      const { data, error } = await forRequest(accessToken)
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
      const { data, error } = await forRequest(accessToken)
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
