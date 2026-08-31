import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ActiveBusiness, BusinessMatch, OnboardingState } from "./onboarding/types";

const url = z.string().trim().max(300).optional().or(z.literal(""));

const profileInput = z.object({
  path: z.enum(["open_business", "grow_business"]).optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(160).optional(),
  postcode: z.string().trim().max(16).optional(),
  roleTitle: z.string().trim().max(120).optional(),
  linkedinUrl: url,
  websiteUrl: url,
  instagramUrl: url,
  xUrl: url,
  otherUrl: url,
  complete: z.boolean().optional(),
});

const businessInput = z.object({
  name: z.string().trim().min(1).max(200),
  companyNumber: z.string().trim().max(20).nullish(),
  address: z.string().trim().max(300).nullish(),
  postcode: z.string().trim().max(16).nullish(),
  status: z.string().trim().max(80).nullish(),
  industry: z.string().trim().max(120).nullish(),
  website: z.string().trim().max(300).nullish(),
  placeId: z.string().trim().max(300).nullish(),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  source: z.enum(["companies_house", "places", "manual"]).default("manual"),
});

type ProfileRow = Record<string, unknown>;

function toState(row: ProfileRow | null, business: ProfileRow | null, email: string): OnboardingState {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    profile: {
      path: (row?.["onboarding_path"] as OnboardingState["profile"]["path"]) ?? null,
      completedAt: (row?.["onboarding_completed_at"] as string | null) ?? null,
      firstName: s(row?.["first_name"]),
      lastName: s(row?.["last_name"]),
      email: s(row?.["email"]) || email,
      phone: s(row?.["phone"]),
      location: s(row?.["location"]),
      postcode: s(row?.["postcode"]),
      roleTitle: s(row?.["role_title"]),
      linkedinUrl: s(row?.["linkedin_url"]),
      websiteUrl: s(row?.["website_url"]),
      instagramUrl: s(row?.["instagram_url"]),
      xUrl: s(row?.["x_url"]),
      otherUrl: s(row?.["other_url"]),
    },
    activeBusiness: business ? toBusiness(business) : null,
  };
}

function toBusiness(b: ProfileRow): ActiveBusiness {
  return {
    id: b["id"] as string,
    name: b["name"] as string,
    companyNumber: (b["company_number"] as string | null) ?? null,
    address: (b["address"] as string | null) ?? null,
    postcode: (b["postcode"] as string | null) ?? null,
    status: (b["status"] as string | null) ?? null,
    industry: (b["industry"] as string | null) ?? null,
    website: (b["website"] as string | null) ?? null,
    placeId: (b["place_id"] as string | null) ?? null,
    latitude: (b["latitude"] as number | null) ?? null,
    longitude: (b["longitude"] as number | null) ?? null,
    source: (b["source"] as string) ?? "manual",
  };
}

const PROFILE_COLUMNS =
  "id, email, full_name, onboarding_path, onboarding_completed_at, first_name, last_name, phone, location, postcode, role_title, linkedin_url, website_url, instagram_url, x_url, other_url, active_business_id";

/** Everything the onboarding screen and the rest of the app need about "who am I". */
export const getOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OnboardingState> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", context.userId)
      .maybeSingle();

    let business: ProfileRow | null = null;
    const activeId = (profile as ProfileRow | null)?.["active_business_id"] as string | undefined;
    if (activeId) {
      const { data } = await context.supabase.from("user_businesses").select("*").eq("id", activeId).maybeSingle();
      business = (data as ProfileRow | null) ?? null;
    }

    const email = (context.claims as { email?: string } | undefined)?.email ?? "";
    return toState(profile as ProfileRow | null, business, email);
  });

export const saveOnboardingProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileInput.parse(d))
  .handler(async ({ data, context }): Promise<OnboardingState> => {
    const patch: Record<string, unknown> = {
      onboarding_path: data.path ?? undefined,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      location: data.location,
      postcode: data.postcode,
      role_title: data.roleTitle,
      linkedin_url: data.linkedinUrl,
      website_url: data.websiteUrl,
      instagram_url: data.instagramUrl,
      x_url: data.xUrl,
      other_url: data.otherUrl,
    };
    if (data.email) patch["email"] = data.email;
    const name = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
    if (name) patch["full_name"] = name;
    if (data.complete) patch["onboarding_completed_at"] = new Date().toISOString();
    for (const key of Object.keys(patch)) if (patch[key] === undefined) delete patch[key];

    const { error } = await context.supabase.from("profiles").update(patch as never).eq("id", context.userId);
    if (error) throw new Error(error.message);

    return getOnboardingState();
  });

/** Saves the chosen business and makes it the user's active business. */
export const setActiveBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => businessInput.parse(d))
  .handler(async ({ data, context }): Promise<ActiveBusiness> => {
    const { data: row, error } = await context.supabase
      .from("user_businesses")
      .insert({
        user_id: context.userId,
        name: data.name,
        company_number: data.companyNumber ?? null,
        address: data.address ?? null,
        postcode: data.postcode ?? null,
        status: data.status ?? null,
        industry: data.industry ?? null,
        website: data.website ?? null,
        place_id: data.placeId ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        source: data.source,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { error: linkError } = await context.supabase
      .from("profiles")
      .update({ active_business_id: row.id, onboarding_path: "grow_business" })
      .eq("id", context.userId);
    if (linkError) throw new Error(linkError.message);

    return toBusiness(row as ProfileRow);
  });

export const clearActiveBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ active_business_id: null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Business finder: name, company number, website or postcode. */
export const findBusinessMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ query: z.string().trim().min(2).max(160) }).parse(d))
  .handler(async ({ data }): Promise<BusinessMatch[]> => {
    const { findBusinesses } = await import("./onboarding/search.server");
    return findBusinesses(data.query);
  });

export const enrichBusinessMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        key: z.string(),
        name: z.string(),
        address: z.string().nullable(),
        postcode: z.string().nullable(),
        companyNumber: z.string().nullable(),
        status: z.string().nullable(),
        industry: z.string().nullable(),
        website: z.string().nullable(),
        placeId: z.string().nullable(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
        source: z.enum(["companies_house", "places"]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<BusinessMatch> => {
    const { enrichMatch } = await import("./onboarding/search.server");
    return enrichMatch(data as BusinessMatch);
  });
