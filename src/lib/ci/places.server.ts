// Google Places evidence adapter for Competitive Intelligence.
//
// Deliberately isolated behind a small interface so additional providers
// (Companies House, ONS, local authority, footfall, property) can be added
// later without touching the intelligence engine.

import type { PlaceObservation } from "./scoring";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function mapsHeaders() {
  const lk = process.env["LOVABLE_API_KEY"];
  const gk = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lk || !gk) throw new Error("Google Maps connector not configured");
  return { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk };
}

const FIELD_MASK =
  "places.id,places.primaryType,places.types,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus,places.primaryTypeDisplayName,places.websiteUri,places.priceLevel,places.regularOpeningHours.weekdayDescriptions";

type RawPlace = {
  id?: string;
  primaryType?: string;
  types?: string[];
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryTypeDisplayName?: { text: string };
  websiteUri?: string;
  priceLevel?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

function toObservation(p: RawPlace): PlaceObservation | null {
  if (!p.id) return null;
  return {
    placeId: p.id,
    name: p.displayName?.text ?? "Unknown business",
    address: p.formattedAddress ?? null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    rating: p.rating ?? null,
    reviews: p.userRatingCount ?? null,
    businessStatus: p.businessStatus ?? null,
    category: p.primaryTypeDisplayName?.text ?? null,
    primaryType: p.primaryType ?? null,
    types: p.types ?? [],
    website: p.websiteUri ?? null,
    priceLevel: p.priceLevel ?? null,
    openingHours: p.regularOpeningHours?.weekdayDescriptions ?? [],
  };
}

export async function searchCompetitors(
  term: string,
  lat: number,
  lng: number,
  radiusMiles: number,
): Promise<PlaceObservation[]> {
  const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
    method: "POST",
    headers: { ...mapsHeaders(), "Content-Type": "application/json", "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify({
      textQuery: term,
      maxResultCount: 20,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius: Math.round(radiusMiles * 1609.34) },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[CI] Places search failed [${res.status}]: ${body}`);
    throw new Error(`Competitor search failed [${res.status}]`);
  }
  const json = (await res.json()) as { places?: RawPlace[] };
  return (json.places ?? []).map(toObservation).filter((p): p is PlaceObservation => p !== null);
}

export async function fetchPlace(placeId: string): Promise<PlaceObservation | null> {
  const res = await fetch(`${GATEWAY}/places/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      ...mapsHeaders(),
      "X-Goog-FieldMask": FIELD_MASK.replace(/places\./g, ""),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[CI] Place details failed [${res.status}]: ${body}`);
    return null;
  }
  return toObservation((await res.json()) as RawPlace);
}
