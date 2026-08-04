import type { Session, User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type SignUpInput = {
  email: string;
  password: string;
  fullName?: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until the initial session restoration has completed. */
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (
    patch: Partial<Pick<Profile, "full_name" | "avatar_url">>,
  ) => Promise<void>;
  refreshProfile: () => Promise<void>;
};
