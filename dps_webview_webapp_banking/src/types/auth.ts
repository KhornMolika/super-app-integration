export interface VerifiedUser {
  userName: string;
  initial: string;
  isAuthenticated: boolean;
  claims?: Record<string, unknown>;
}
