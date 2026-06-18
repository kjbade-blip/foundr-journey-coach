import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function authHeaders() {
  const lk = process.env.LOVABLE_API_KEY;
  const gk = process.env.GOOGLE_MAPS_API_KEY;
  if (!lk || !gk) throw new Error("Google Maps connector not configured");
  return { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk };
}

export const geocodeAddress = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ address: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const url = `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(data.address)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
    const json = (await res.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };
    const top = json.results?.[0];
    if (!top) return null;
    return {
      address: top.formatted_address,
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
    };
  });

export const searchPlacesNearby = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        query: z.string().min(1).max(120),
        lat: z.number(),
        lng: z.number(),
        radius: z.number().min(100).max(50000).default(1500),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        textQuery: data.query,
        locationBias: {
          circle: { center: { latitude: data.lat, longitude: data.lng }, radius: data.radius },
        },
        maxResultCount: 12,
      }),
    });
    if (!res.ok) throw new Error(`Places search failed: ${res.status}`);
    const json = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
        rating?: number;
        userRatingCount?: number;
      }>;
    };
    return (json.places ?? []).map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? "Unknown",
      address: p.formattedAddress ?? "",
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
      rating: p.rating ?? null,
      reviews: p.userRatingCount ?? null,
    }));
  });
