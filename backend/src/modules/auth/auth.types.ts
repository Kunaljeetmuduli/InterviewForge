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
