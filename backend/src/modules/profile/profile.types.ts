import { z } from "zod";

export const profileInputSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120),
    target_role: z.string().trim().min(1).max(120),
    experience_level: z.string().trim().min(1).max(80),
  })
  .strict();

export const profileSchema = profileInputSchema.extend({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type Profile = z.infer<typeof profileSchema>;

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export interface AuthContext {
  accessToken: string;
  user: AuthenticatedUser;
}

export interface AuthVerifier {
  verify(accessToken: string): Promise<AuthenticatedUser | null>;
}

export interface ProfileRepository {
  findByUserId(userId: string, accessToken: string): Promise<Profile | null>;
  upsertForUser(
    userId: string,
    accessToken: string,
    input: ProfileInput,
  ): Promise<Profile>;
}
