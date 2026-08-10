import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const locationInput = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  label: z.string().trim().max(160).optional(),
  forceRefresh: z.boolean().optional(),
});

export const getLocationProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => locationInput.parse(d))
  .handler(async ({ data }) => {
    const { buildLocationProfile } = await import("./ons/profile.server");
    return buildLocationProfile(data);
  });

export const analyseLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    locationInput
      .extend({
        businessType: z.string().trim().min(1).max(80),
        radiusMiles: z.number().min(0.25).max(10).optional(),
        save: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { analyseLocationForBusiness } = await import("./ons/analysis.server");
    const result = await analyseLocationForBusiness(data);

    if (data.save !== false && result.score.overall !== null) {
      const { error } = await context.supabase.from("location_analyses").insert({
        user_id: context.userId,
        display_name: result.profile.displayName,
        business_type: result.businessType,
        overall_score: result.score.overall,
        score_breakdown: result.score as never,
        evidence: result.profile.evidence as never,
      });
      if (error) console.error("[ONS] failed to save analysis:", error.message);
    }

    return result;
  });

export const findLocationOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => locationInput.parse(d))
  .handler(async ({ data }) => {
    const { findOpportunities } = await import("./ons/analysis.server");
    return findOpportunities(data);
  });

export const compareLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        queries: z.array(z.string().trim().min(1).max(120)).min(2).max(3),
        businessType: z.string().trim().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { compareLocationProfiles } = await import("./ons/analysis.server");
    return compareLocationProfiles(data.queries, data.businessType);
  });

export const listSavedAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("location_analyses")
      .select("id, display_name, business_type, overall_score, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
