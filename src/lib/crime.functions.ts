import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Crime & safety profile for a point, with the business-type risk read. */
export const getCrimeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        businessType: z.string().trim().max(80).optional(),
        population: z.number().int().positive().max(10_000_000).optional(),
        populationGeography: z.string().trim().max(160).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { buildCrimeProfile } = await import("./crime/profile.server");
    const { assessCrimeRisk } = await import("./crime/model");
    const { matchBusinessType } = await import("./ons/business-relevance");

    const type = matchBusinessType(data.businessType);
    const built = await buildCrimeProfile({
      latitude: data.latitude,
      longitude: data.longitude,
      businessKey: type?.key,
      population: data.population ?? null,
      populationGeography: data.populationGeography ?? null,
    });
    if (!built) return null;

    return {
      profile: built.profile,
      risk: assessCrimeRisk(built.profile, built.weights, type?.label ?? "small business"),
    };
  });

/**
 * Refresh the fixed reference areas used to benchmark crime load. Slow
 * (one police API call per area per month), so it is run deliberately.
 */
export const refreshCrimeBenchmarks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { refreshReferenceAreas } = await import("./crime/profile.server");
    return refreshReferenceAreas();
  });
