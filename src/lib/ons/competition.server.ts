// Competitor evidence layer (Google Places). Deliberately separate from ONS:
// ONS does not publish competitor-level business data, and the UI must never
// attribute these figures to ONS.

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
  examples: Array<{ name: string; rating: number | null; reviews: number | null }>;
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
        "X-Goog-FieldMask": "places.displayName,places.rating,places.userRatingCount",
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
      places?: Array<{ displayName?: { text: string }; rating?: number; userRatingCount?: number }>;
    };
    const places = json.places ?? [];
    return {
      count: places.length,
      strongCount: places.filter((p) => (p.rating ?? 0) >= 4.3).length,
      radiusMiles,
      examples: places.slice(0, 5).map((p) => ({
        name: p.displayName?.text ?? "Unknown",
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? null,
      })),
    };
  } catch (error) {
    console.error("[Competition] scan failed:", error);
    return null;
  }
}
