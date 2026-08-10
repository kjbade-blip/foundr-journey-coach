// Database-backed cache for ONS observations, geographies and location
// profiles. Prevents repeat calls to the ONS API and records exactly when each
// figure was retrieved and when it should be refreshed.

import type { DatasetDef } from "./datasets";
import type { GeographyLevel, GeographyRef, LocationProfile } from "./types";
import type { RawObservation } from "./nomis.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export interface CachedObservations {
  rows: RawObservation[];
  retrievedAt: string;
  fresh: boolean;
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** Read cached observations for a dataset+geography, if still within TTL. */
export async function readObservations(
  dataset: DatasetDef,
  geography: GeographyRef,
): Promise<CachedObservations | null> {
  const db = await admin();
  const { data, error } = await db
    .from("ons_observations")
    .select("category, value, unit, reference_period, geography_name, retrieved_at, refresh_after")
    .eq("dataset_id", dataset.id)
    .eq("geography_code", geography.code)
    .eq("metric", dataset.table);

  if (error || !data || data.length === 0) return null;
  const first = data[0]!;
  const fresh = new Date(first.refresh_after).getTime() > Date.now();
  return {
    fresh,
    retrievedAt: first.retrieved_at,
    rows: data.map((r) => ({
      category: r.category,
      value: r.value ?? 0,
      unit: r.unit ?? "",
      referencePeriod: r.reference_period,
      geographyName: r.geography_name ?? geography.name,
    })),
  };
}

/** Persist freshly retrieved observations with full provenance. */
export async function writeObservations(
  dataset: DatasetDef,
  geography: GeographyRef,
  rows: RawObservation[],
): Promise<string> {
  const retrievedAt = new Date().toISOString();
  if (rows.length === 0) return retrievedAt;
  const db = await admin();
  await db.from("ons_observations").upsert(
    rows.map((r) => ({
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      geography_type: geography.level,
      geography_code: geography.code,
      geography_name: r.geographyName || geography.name,
      metric: dataset.table,
      category: r.category,
      value: r.value,
      unit: r.unit,
      reference_period: r.referencePeriod,
      source: dataset.source,
      source_url: dataset.sourceUrl,
      retrieved_at: retrievedAt,
      refresh_after: daysFromNow(dataset.refreshDays),
    })),
    { onConflict: "dataset_id,geography_code,metric,category" },
  );
  return retrievedAt;
}

export async function saveGeographies(
  geographies: Partial<Record<GeographyLevel, GeographyRef>>,
  latitude: number,
  longitude: number,
): Promise<void> {
  const rows = Object.values(geographies).filter(Boolean) as GeographyRef[];
  if (rows.length === 0) return;
  const db = await admin();
  await db.from("ons_geographies").upsert(
    rows.map((g) => ({
      geography_type: g.level,
      geography_code: g.code,
      name: g.name,
      country: geographies.country?.name ?? null,
      region: geographies.region?.name ?? null,
      parent_code: geographies.local_authority?.code ?? null,
      latitude,
      longitude,
    })),
    { onConflict: "geography_type,geography_code" },
  );
}

export async function readProfile(cacheKey: string): Promise<LocationProfile | null> {
  const db = await admin();
  const { data } = await db
    .from("location_profiles")
    .select("profile, refresh_after")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.refresh_after).getTime() < Date.now()) return null;
  return data.profile as unknown as LocationProfile;
}

export async function writeProfile(profile: LocationProfile, refreshDays: number): Promise<void> {
  const db = await admin();
  await db.from("location_profiles").upsert(
    {
      cache_key: profile.cacheKey,
      display_name: profile.displayName,
      postcode: profile.postcode,
      latitude: profile.latitude,
      longitude: profile.longitude,
      primary_geography_type: profile.primaryGeography.level,
      primary_geography_code: profile.primaryGeography.code,
      geographies: profile.geographies as never,
      profile: profile as never,
      evidence: profile.evidence as never,
      unavailable: profile.unavailable as never,
      retrieved_at: profile.retrievedAt,
      refresh_after: daysFromNow(refreshDays),
    },
    { onConflict: "cache_key" },
  );
}
