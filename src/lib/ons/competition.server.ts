// Competitor evidence layer (Google Places). Deliberately separate from ONS:
// ONS does not publish competitor-level business data, and the UI must never
// attribute these figures to ONS.

import { classifyCandidate } from "@/lib/competition/match";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function mapsHeaders() {
  const lk = process.env["LOVABLE_API_KEY"];
  const gk = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lk || !gk) throw new Error("Google Maps connector not configured");
  return { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk };
}

export interface CompetitorScan {
  count: number;
  strongCount: number;
  radiusMiles: number;
  /** Candidates returned by the source but rejected by the strict type match. */
  excludedCount: number;
  examples: Array<{ name: string; rating: number | null; reviews: number | null; matchReason: string }>;
}

export async function scanCompetitors(
  term: string,
  lat: number,
  lng: number,
  radiusMiles = 1,
): Promise<CompetitorScan | null> {
  try {
    const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        ...mapsHeaders(),
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.displayName,places.rating,places.userRatingCount,places.primaryType,places.types,places.primaryTypeDisplayName,places.websiteUri",
      },
      body: JSON.stringify({
        textQuery: term,
        maxResultCount: 20,
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius: Math.round(radiusMiles * 1609) },
        },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      places?: Array<{
        displayName?: { text: string };
        rating?: number;
        userRatingCount?: number;
        primaryType?: string;
        types?: string[];
        primaryTypeDisplayName?: { text: string };
        websiteUri?: string;
      }>;
    };
    const raw = json.places ?? [];
    // Only high-confidence same-type businesses count as competition.
    const matched = raw
      .map((p) => ({
        p,
        match: classifyCandidate(term, {
          primaryType: p.primaryType ?? null,
          types: p.types ?? [],
          category: p.primaryTypeDisplayName?.text ?? null,
          name: p.displayName?.text ?? null,
          website: p.websiteUri ?? null,
        }),
      }))
      .filter((x) => x.match.verdict === "direct");

    return {
      count: matched.length,
      strongCount: matched.filter((x) => (x.p.rating ?? 0) >= 4.3).length,
      radiusMiles,
      excludedCount: raw.length - matched.length,
      examples: matched.slice(0, 5).map(({ p, match }) => ({
        name: p.displayName?.text ?? "Unknown",
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? null,
        matchReason: match.reason,
      })),
    };
  } catch (error) {
    console.error("[Competition] scan failed:", error);
    return null;
  }
}
