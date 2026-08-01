import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CoreProfile, DeepProfile, PlaceDetails, PlaceSummary, Competitor } from "./business-profile";
import {
  searchBusinesses,
  fetchPlaceDetails,
  fetchCompetitors,
  generateCoreProfile,
  generateDeepProfile,
} from "./business-discovery.server";

export const searchBusiness = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ query: z.string().min(2).max(160) }).parse(d))
  .handler(async ({ data }): Promise<PlaceSummary[]> => searchBusinesses(data.query).catch(() => []));

export const discoverCore = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ placeId: z.string().min(3).max(300) }).parse(d))
  .handler(
    async ({ data }): Promise<{ place: PlaceDetails; core: CoreProfile; competitors: Competitor[] } | null> => {
      const place = await fetchPlaceDetails(data.placeId);
      if (!place) return null;
      const [core, competitors] = await Promise.all([
        generateCoreProfile(place),
        fetchCompetitors(place.lat, place.lng, "").catch(() => []),
      ]);
      return { place, core, competitors: competitors.filter((c) => c.id !== place.id) };
    },
  );

export const discoverDeep = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        place: z.any(),
        core: z.any(),
        competitors: z.array(z.any()).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<DeepProfile> =>
    generateDeepProfile(data.place as PlaceDetails, data.core as CoreProfile, data.competitors as Competitor[]),
  );
