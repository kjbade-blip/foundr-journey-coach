// Database cache for police crime data. Past months never change once
// published, so they are cached indefinitely; the most recent month is
// re-checked weekly in case of a late revision.

import { CRIME_SOURCE, CRIME_SOURCE_URL } from "./police.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Grid key: ~110m precision, so nearby lookups reuse the same cached area. */
export function areaKey(lat: number, lng: number, radiusMiles: number): string {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusMiles}`;
}

export interface CachedMonth {
  month: string;
  total: number;
  byCategory: Record<string, number>;
  retrievedAt: string;
  fresh: boolean;
}

export async function readMonths(key: string, months: string[]): Promise<Map<string, CachedMonth>> {
  const out = new Map<string, CachedMonth>();
  try {
    const db = await admin();
    const { data, error } = await db
      .from("crime_area_months")
      .select("month, total, by_category, retrieved_at, refresh_after")
      .eq("area_key", key)
      .in("month", months);
    if (error || !data) return out;
    for (const row of data) {
      out.set(row.month, {
        month: row.month,
        total: row.total,
        byCategory: (row.by_category ?? {}) as Record<string, number>,
        retrievedAt: row.retrieved_at,
        fresh: new Date(row.refresh_after).getTime() > Date.now(),
      });
    }
  } catch (error) {
    console.error("[Crime] cache read failed:", error);
  }
  return out;
}

export async function writeMonth(
  key: string,
  lat: number,
  lng: number,
  radiusMiles: number,
  month: string,
  byCategory: Record<string, number>,
  isLatestMonth: boolean,
  geo?: { lsoa?: string | null; localAuthority?: string | null; region?: string | null },
): Promise<void> {
  try {
    const db = await admin();
    const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
    const refreshAfter = new Date(
      Date.now() + (isLatestMonth ? 7 : 365) * 86_400_000,
    ).toISOString();
    const { error } = await db.from("crime_area_months").upsert(
      {
        area_key: key,
        latitude: lat,
        longitude: lng,
        radius_miles: radiusMiles,
        month,
        total,
        by_category: byCategory as never,
        lsoa_code: geo?.lsoa ?? null,
        local_authority_code: geo?.localAuthority ?? null,
        region_code: geo?.region ?? null,
        source: CRIME_SOURCE,
        source_url: CRIME_SOURCE_URL,
        retrieved_at: new Date().toISOString(),
        refresh_after: refreshAfter,
      },
      { onConflict: "area_key,month" },
    );
    if (error) console.error("[Crime] cache write failed:", error.message);
  } catch (error) {
    console.error("[Crime] cache write failed:", error);
  }
}

export interface CategoryMeta {
  slug: string;
  name: string;
  businessRelevance: string | null;
  sortOrder: number;
}

export async function readCategoryMeta(): Promise<Map<string, CategoryMeta>> {
  const out = new Map<string, CategoryMeta>();
  try {
    const db = await admin();
    const { data } = await db
      .from("crime_categories")
      .select("slug, name, business_relevance, sort_order")
      .order("sort_order");
    for (const row of data ?? []) {
      out.set(row.slug, {
        slug: row.slug,
        name: row.name,
        businessRelevance: row.business_relevance,
        sortOrder: row.sort_order,
      });
    }
  } catch (error) {
    console.error("[Crime] category meta read failed:", error);
  }
  return out;
}

/** Weights for a business type, merged over the stored baseline. */
export async function readWeights(businessKey: string): Promise<Record<string, number>> {
  const weights: Record<string, number> = {};
  try {
    const db = await admin();
    const { data } = await db
      .from("crime_business_weights")
      .select("business_key, category_slug, weight")
      .in("business_key", ["default", businessKey]);
    for (const row of data ?? []) {
      if (row.business_key === "default") weights[row.category_slug] = Number(row.weight);
    }
    for (const row of data ?? []) {
      if (row.business_key !== "default") weights[row.category_slug] = Number(row.weight);
    }
  } catch (error) {
    console.error("[Crime] weights read failed:", error);
  }
  return weights;
}

export interface ReferenceArea {
  key: string;
  name: string;
  areaType: string;
  latitude: number;
  longitude: number;
}

export async function readReferenceAreas(): Promise<ReferenceArea[]> {
  try {
    const db = await admin();
    const { data } = await db
      .from("crime_reference_areas")
      .select("key, name, area_type, latitude, longitude");
    return (data ?? []).map((r) => ({
      key: r.key,
      name: r.name,
      areaType: r.area_type,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  } catch (error) {
    console.error("[Crime] reference areas read failed:", error);
    return [];
  }
}

/** Cached monthly rows for the reference corpus, restricted to a month window. */
export async function readReferenceMonths(
  areas: ReferenceArea[],
  months: string[],
  radiusMiles: number,
): Promise<Map<string, Array<{ month: string; byCategory: Record<string, number> }>>> {
  const out = new Map<string, Array<{ month: string; byCategory: Record<string, number> }>>();
  if (areas.length === 0) return out;
  try {
    const db = await admin();
    const keys = areas.map((a) => areaKey(a.latitude, a.longitude, radiusMiles));
    const { data } = await db
      .from("crime_area_months")
      .select("area_key, month, by_category")
      .in("area_key", keys)
      .in("month", months);
    for (const row of data ?? []) {
      const list = out.get(row.area_key) ?? [];
      list.push({ month: row.month, byCategory: (row.by_category ?? {}) as Record<string, number> });
      out.set(row.area_key, list);
    }
  } catch (error) {
    console.error("[Crime] reference month read failed:", error);
  }
  return out;
}
