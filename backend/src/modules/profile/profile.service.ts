import type {
  AuthContext,
  Profile,
  ProfileInput,
  ProfileRepository,
} from "./profile.types.js";

export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  getProfile(context: AuthContext): Promise<Profile | null> {
    return this.repository.findByUserId(
      context.user.id,
      context.accessToken,
    );
  }

  updateProfile(context: AuthContext, input: ProfileInput): Promise<Profile> {
    return this.repository.upsertForUser(
      context.user.id,
      context.accessToken,
      input,
    );
  }
}
