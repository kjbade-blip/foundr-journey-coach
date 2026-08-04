import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, saveProfile } from "./profile";
import type { AuthContextValue, Profile, SignInInput, SignUpInput } from "./types";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const RESET_PASSWORD_PATH = "/reset-password";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const apply = (next: Session | null) => {
      if (!mounted.current) return;
      setSession(next);
      setLoading(false);
      if (!next?.user) {
        setProfile(null);
        return;
      }
      void fetchProfile(next.user).then((p) => {
        if (mounted.current) setProfile(p);
      });
    };

    // Register the listener before restoring, so no event is missed.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => apply(next));
    void supabase.auth.getSession().then(({ data }) => apply(data.session));

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;

  const signUp = useCallback(async ({ email, password, fullName }: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    if (error) throw error;
    return { needsEmailConfirmation: data.session === null };
  }, []);

  const signIn = useCallback(async ({ email, password }: SignInInput) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  }, [queryClient]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${RESET_PASSWORD_PATH}`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, "full_name" | "avatar_url">>) => {
      if (!user) return;
      setProfile(await saveProfile(user.id, patch));
    },
    [user],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setProfile(await fetchProfile(user));
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: loading ? "loading" : user ? "authenticated" : "unauthenticated",
      session,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateProfile,
      refreshProfile,
    }),
    [
      loading,
      user,
      session,
      profile,
      signUp,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateProfile,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
