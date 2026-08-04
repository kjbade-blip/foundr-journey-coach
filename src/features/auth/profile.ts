import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./types";

const PROFILE_COLUMNS = "id, email, full_name, avatar_url";

function profileFromUser(user: User): Profile {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (meta["full_name"] as string | undefined) ??
      (meta["name"] as string | undefined) ??
      null,
    avatar_url:
      (meta["avatar_url"] as string | undefined) ??
      (meta["picture"] as string | undefined) ??
      null,
  };
}

/**
 * Reads the signed-in user's profile row. A database trigger creates the row on
 * sign-up; this upserts as a safety net so a signed-in user is never profile-less.
 */
export async function fetchProfile(user: User): Promise<Profile> {
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data as Profile;

  const fallback = profileFromUser(user);
  const { data: inserted } = await supabase
    .from("profiles")
    .upsert(fallback, { onConflict: "id" })
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  return (inserted as Profile | null) ?? fallback;
}

export async function saveProfile(
  userId: string,
  patch: Partial<Pick<Profile, "full_name" | "avatar_url">>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data as Profile;
}

export function initialsFor(profile: Profile | null, email?: string | null) {
  const name = profile?.full_name?.trim();
  if (name) {
    return (
      name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "U"
    );
  }
  const source = profile?.email ?? email ?? "";
  return source.slice(0, 2).toUpperCase() || "U";
}
