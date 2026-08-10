// Converts whatever the user typed (postcode, outcode, town, local authority)
// or clicked on a map into the ONS statistical geographies Found-r needs.
//
// A postcode is NOT a statistical geography, so we use the ONS Postcode
// Directory lookup (served by postcodes.io) to obtain the official codes for
// the LSOA, MSOA, ward, local authority, region and country containing it.

import type { GeographyLevel, GeographyRef } from "./types";

const PC_API = "https://api.postcodes.io";
const TIMEOUT_MS = 10_000;

const COUNTRY_CODES: Record<string, string> = {
  England: "E92000001",
  Wales: "W92000004",
  Scotland: "S92000003",
  "Northern Ireland": "N92000002",
};

const REGION_CODES: Record<string, string> = {
  "North East": "E12000001",
  "North West": "E12000002",
  "Yorkshire and The Humber": "E12000003",
  "East Midlands": "E12000004",
  "West Midlands": "E12000005",
  "East of England": "E12000006",
  London: "E12000007",
  "South East": "E12000008",
  "South West": "E12000009",
};

export interface ResolvedLocation {
  displayName: string;
  postcode: string | null;
  latitude: number;
  longitude: number;
  country: string | null;
  geographies: Partial<Record<GeographyLevel, GeographyRef>>;
  primary: GeographyRef;
}

interface PostcodeResult {
  postcode: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string | null;
  admin_district: string | null;
  admin_county: string | null;
  admin_ward: string | null;
  msoa: string | null;
  lsoa: string | null;
  codes: Record<string, string | null>;
}

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const body = (await res.json()) as { status: number; result?: T };
    return body.result ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const OUTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

function buildGeographies(r: PostcodeResult): Partial<Record<GeographyLevel, GeographyRef>> {
  const geos: Partial<Record<GeographyLevel, GeographyRef>> = {};
  const valid = (code: string | null | undefined) =>
    !!code && !code.startsWith("E99999999") && !code.startsWith("W99999999");

  const countryCode = COUNTRY_CODES[r.country];
  if (countryCode) geos.country = { level: "country", code: countryCode, name: r.country };

  if (r.region && REGION_CODES[r.region]) {
    geos.region = { level: "region", code: REGION_CODES[r.region]!, name: r.region };
  }
  if (valid(r.codes["admin_county"]) && r.admin_county) {
    geos.county = { level: "county", code: r.codes["admin_county"]!, name: r.admin_county };
  }
  if (valid(r.codes["admin_district"]) && r.admin_district) {
    geos.local_authority = {
      level: "local_authority",
      code: r.codes["admin_district"]!,
      name: r.admin_district,
    };
  }
  if (valid(r.codes["admin_ward"]) && r.admin_ward) {
    geos.ward = { level: "ward", code: r.codes["admin_ward"]!, name: r.admin_ward };
  }
  if (valid(r.codes["msoa21"] ?? r.codes["msoa"]) && r.msoa) {
    geos.msoa = { level: "msoa", code: (r.codes["msoa21"] ?? r.codes["msoa"])!, name: r.msoa };
  }
  if (valid(r.codes["lsoa21"] ?? r.codes["lsoa"]) && r.lsoa) {
    geos.lsoa = { level: "lsoa", code: (r.codes["lsoa21"] ?? r.codes["lsoa"])!, name: r.lsoa };
  }
  return geos;
}

function toResolved(r: PostcodeResult, displayName: string, usePostcode: boolean): ResolvedLocation {
  const geographies = buildGeographies(r);
  const primary =
    geographies.msoa ?? geographies.local_authority ?? geographies.region ?? geographies.country;
  if (!primary) {
    throw new Error("Could not match this location to an ONS statistical geography.");
  }
  return {
    displayName,
    postcode: usePostcode ? r.postcode : null,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    geographies,
    primary,
  };
}

async function nearestPostcode(lat: number, lon: number): Promise<PostcodeResult | null> {
  const list = await getJson<PostcodeResult[]>(
    `${PC_API}/postcodes?lat=${lat}&lon=${lon}&limit=1&radius=2000`,
  );
  return list?.[0] ?? null;
}

/** Resolve a map click or geocoded coordinate pair. */
export async function resolveByCoordinates(
  lat: number,
  lng: number,
  label?: string,
): Promise<ResolvedLocation> {
  const r = await nearestPostcode(lat, lng);
  if (!r) throw new Error("No UK statistical geography found for this point.");
  return toResolved(r, label ?? `${r.admin_ward ?? r.admin_district ?? r.postcode}`, false);
}

/**
 * Resolve free text: full postcode, outcode (e.g. "SW11"), town, city or
 * local authority name.
 */
export async function resolveLocationQuery(query: string): Promise<ResolvedLocation> {
  const q = query.trim();
  if (!q) throw new Error("Enter a UK postcode, town or local authority.");

  if (POSTCODE_RE.test(q)) {
    const r = await getJson<PostcodeResult>(`${PC_API}/postcodes/${encodeURIComponent(q)}`);
    if (r) return toResolved(r, r.postcode, true);
  }

  if (OUTCODE_RE.test(q)) {
    const oc = await getJson<{ latitude: number; longitude: number; outcode: string; admin_district: string[] }>(
      `${PC_API}/outcodes/${encodeURIComponent(q)}`,
    );
    if (oc) {
      const resolved = await resolveByCoordinates(oc.latitude, oc.longitude);
      return {
        ...resolved,
        displayName: `${oc.outcode}${oc.admin_district?.[0] ? `, ${oc.admin_district[0]}` : ""}`,
      };
    }
  }

  // Town / city / local authority name via the ONS place index.
  const places = await getJson<Array<{ name_1: string; district_borough: string | null; county_unitary: string | null; latitude: number; longitude: number }>>(
    `${PC_API}/places?q=${encodeURIComponent(q)}&limit=1`,
  );
  const place = places?.[0];
  if (place) {
    const resolved = await resolveByCoordinates(place.latitude, place.longitude);
    const area = place.district_borough ?? place.county_unitary;
    return {
      ...resolved,
      displayName: area && area !== place.name_1 ? `${place.name_1}, ${area}` : place.name_1,
    };
  }

  // Last resort: partial postcode search.
  const partial = await getJson<PostcodeResult[]>(`${PC_API}/postcodes?q=${encodeURIComponent(q)}&limit=1`);
  if (partial?.[0]) return toResolved(partial[0], partial[0].postcode, true);

  throw new Error(`Could not find a UK location matching "${q}".`);
}
