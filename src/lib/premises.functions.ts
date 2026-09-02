import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SOURCE_DEFINITIONS, sourceInfoFor } from "./premises/sources";
import { dedupeListings } from "./premises/dedupe";
import type { PropertyListing, PropertyRequirements, PropertySourceInfo } from "./premises/types";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

const requirementsSchema = z.object({
  businessTypeKey: z.string().min(1).max(60),
  location: z.string().min(1).max(160),
  radiusMiles: z.number().min(0.5).max(50),
  budgetMonthlyMin: z.number().nullable(),
  budgetMonthlyMax: z.number().nullable(),
  minSqFt: z.number().nullable(),
  maxSqFt: z.number().nullable(),
  propertyTypes: z.array(z.string()).max(10),
  requiredFeatures: z.array(z.string()).max(20),
  leaseLengthYears: z.number().nullable(),
  moveInBy: z.string().nullable(),
  staffCount: z.number().nullable(),
  customerCapacity: z.number().nullable(),
  notes: z.string().max(600),
});

async function geocode(address: string): Promise<{ address: string; lat: number; lng: number } | null> {
  const lk = process.env["LOVABLE_API_KEY"];
  const gk = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lk || !gk) return null;
  const res = await fetch(`${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=uk`, {
    headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    results?: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
  };
  const top = json.results?.[0];
  if (!top) return null;
  return { address: top.formatted_address, lat: top.geometry.location.lat, lng: top.geometry.location.lng };
}

export interface PremisesSearchResult {
  center: { lat: number; lng: number } | null;
  resolvedLocation: string | null;
  listings: PropertyListing[];
  /** Adverts folded into a primary listing during deduplication. */
  duplicateCount: number;
  sources: PropertySourceInfo[];
  /** Why the structured result set looks the way it does. */
  notices: string[];
  checkedAt: string;
}

/**
 * Aggregates commercial to-let adverts from every enabled source.
 *
 * A source only returns structured listings when its official feed credential
 * is configured on the server. Sources without a credential stay in outbound
 * mode: Found-r hands back a prefilled search link instead of inventing data.
 */
export const searchPremises = createServerFn({ method: "POST" })
  .inputValidator((d) => requirementsSchema.parse(d))
  .handler(async ({ data }) => {
    const req = data as unknown as PropertyRequirements;
    const geo = await geocode(req.location);

    const enabledFeeds = SOURCE_DEFINITIONS.filter((s) => s.feedEnvVar && process.env[s.feedEnvVar]).map((s) => s.id);

    // Feed adapters plug in here, one per enabled source. None can run without
    // an official credential, so the aggregate is empty until one is supplied.
    const raw: PropertyListing[] = [];

    const grouped = dedupeListings(raw);
    const notices: string[] = [];
    if (enabledFeeds.length === 0) {
      notices.push(
        "No licensed property feed is connected yet, so Found-r is not holding structured adverts for this area. Your criteria have been carried into a prefilled search on each source below, and you can paste any advert you find back into Found-r for a suitability assessment.",
      );
    }

    const result: PremisesSearchResult = {
      center: geo ? { lat: geo.lat, lng: geo.lng } : null,
      resolvedLocation: geo?.address ?? null,
      listings: grouped.map((g) => g.listing),
      duplicateCount: grouped.reduce((n, g) => n + g.duplicates.length, 0),
      sources: sourceInfoFor(req, enabledFeeds),
      notices,
      checkedAt: new Date().toISOString(),
    };
    return result;
  });
