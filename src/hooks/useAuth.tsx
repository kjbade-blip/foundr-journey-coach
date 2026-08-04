import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  provider: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, "full_name" | "avatar_url">>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadOrCreateProfile(user: User): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && data) return data as Profile;

  // Safety net: the signup trigger normally creates this row, but never leave a
  // signed-in user without a profile.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fallback: Profile = {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (meta["full_name"] as string) ?? (meta["name"] as string) ?? null,
    avatar_url:
      (meta["avatar_url"] as string) ?? (meta["picture"] as string) ?? null,
  };

  const { data: inserted } = await supabase
    .from("profiles")
    .upsert(fallback, { onConflict: "id" })
    .select("id, email, full_name, avatar_url")
    .maybeSingle();

  return (inserted as Profile) ?? fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const apply = (next: Session | null) => {
      if (!active) return;
      setSession(next);
      setLoading(false);
      if (next?.user) {
        void loadOrCreateProfile(next.user).then((p) => {
          if (active) setProfile(p);
        });
      } else {
        setProfile(null);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      apply(next);
    });

    supabase.auth.getSession().then(({ data }) => apply(data.session));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    return {
      user,
      session,
      profile,
      loading,
      provider: (user?.app_metadata?.provider as string) ?? null,
      refreshProfile: async () => {
        if (!user) return;
        setProfile(await loadOrCreateProfile(user));
      },
      updateProfile: async (patch) => {
        if (!user) return;
        const { data, error } = await supabase
          .from("profiles")
          .update(patch)
          .eq("id", user.id)
          .select("id, email, full_name, avatar_url")
          .maybeSingle();
        if (error) throw error;
        if (data) setProfile(data as Profile);
      },
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
      },
    };
  }, [session, profile, loading, queryClient, navigate]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function initialsFor(profile: Profile | null, email?: string | null) {
  const name = profile?.full_name?.trim();
  if (name) {
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
  }
  const source = profile?.email ?? email ?? "";
  return source.slice(0, 2).toUpperCase() || "U";
}
