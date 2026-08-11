// Business Diversity Index data collection (Google Places) + AI narrative.
// Server-only: extracted so both the BDI server function and the canonical
// opportunity pipeline can reuse the same fetch, with no duplicated logic.

import { computeBDI, type BDIPlaceInput, type BDIResult } from "./bdi";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function mapsHeaders() {
  const lk = process.env["LOVABLE_API_KEY"];
  const gk = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lk || !gk) throw new Error("Google Maps connector not configured");
  return { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk };
}

// Broad set covering the 16 sectors. Google's searchNearby caps includedTypes,
// so we run several parallel queries and merge.
const TYPE_GROUPS: string[][] = [
  ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"],
  ["clothing_store", "shoe_store", "gift_shop", "book_store", "florist", "jewelry_store"],
  ["supermarket", "grocery_store", "convenience_store", "pharmacy"],
  ["doctor", "dentist", "hospital", "physiotherapist"],
  ["gym", "yoga_studio"],
  ["lawyer", "accounting", "real_estate_agency", "insurance_agency", "travel_agency", "post_office"],
  ["bank", "atm"],
  ["hair_salon", "beauty_salon", "barber_shop", "nail_salon", "spa"],
  ["night_club", "hotel", "movie_theater", "bowling_alley", "event_venue"],
  ["school", "university", "library", "preschool"],
  ["car_dealer", "car_repair", "car_wash", "gas_station"],
  ["hardware_store", "home_improvement_store", "furniture_store"],
  ["museum", "art_gallery", "performing_arts_theater"],
  ["electronics_store", "cell_phone_store"],
];

async function nearbySearch(lat: number, lng: number, radius: number, includedTypes: string[]) {
  const res = await fetch(`${GATEWAY}/places/v1/places:searchNearby`, {
    method: "POST",
    headers: {
      ...mapsHeaders(),
      "Content-Type": "application/json",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.primaryType,places.types,places.businessStatus,places.regularOpeningHours",
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 20,
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      primaryType?: string;
      types?: string[];
      businessStatus?: string;
      regularOpeningHours?: { periods?: Array<{ close?: { hour?: number } }> };
    }>;
  };
  return json.places ?? [];
}

export async function collectBDI(
  lat: number,
  lng: number,
  radius: number,
  locationName?: string,
  withNarrative = true,
): Promise<{ result: BDIResult; narrative: string }> {
  const results = await Promise.all(
    TYPE_GROUPS.map((g) => nearbySearch(lat, lng, radius, g).catch(() => [])),
  );
  const seen = new Set<string>();
  const merged: BDIPlaceInput[] = [];
  for (const arr of results) {
    for (const p of arr) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const openLate = p.regularOpeningHours?.periods?.some((pd) => (pd.close?.hour ?? 0) >= 19) ?? false;
      merged.push({
        id: p.id,
        name: p.displayName?.text,
        primaryType: p.primaryType,
        types: p.types,
        businessStatus: p.businessStatus,
        openLate,
      });
    }
  }
  const result = computeBDI(merged);
  const narrative = withNarrative
    ? await generateNarrative(locationName ?? "This location", result).catch(() => result.summary)
    : result.summary;
  return { result, narrative };
}

async function generateNarrative(locationName: string, result: BDIResult): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return result.summary;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are Found-r's location intelligence writer. Reply in 2-3 tight sentences (max 90 words) explaining WHY the Business Diversity Index score is high or low. No preamble. British English.",
          },
          {
            role: "user",
            content: `Location: ${locationName}\nBDI score: ${result.overall}/100 (${result.band})\nTop sectors: ${result.sectorMix.slice(0, 4).map((s) => `${s.sector} ${Math.round(s.share * 100)}%`).join(", ")}\nStrengths: ${result.strengths.join(", ")}\nWeaknesses: ${result.weaknesses.join(", ")}\nSample size: ${result.sampleSize} businesses.`,
          },
        ],
      }),
    });
    if (!res.ok) return result.summary;
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return j.choices?.[0]?.message?.content?.trim() || result.summary;
  } catch {
    return result.summary;
  }
}
