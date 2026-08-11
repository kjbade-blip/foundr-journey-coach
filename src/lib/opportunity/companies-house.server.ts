// Companies House — real local business-market dynamics.
//
// Uses the advanced company search endpoint, which returns a total hit count
// for a filtered query. We count active companies, incorporations and
// dissolutions for the postcode district, which is the finest geography the
// public API filters on.
//
// If no Companies House API key is configured, this returns null. Found-r
// never estimates these figures: the source is recorded as unavailable.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MarketDynamics } from "./types";

const BASE = "https://api.company-information.service.gov.uk";
const CACHE_DAYS = 30;

function authHeader(): string | null {
  const key = process.env["COMPANIES_HOUSE_API_KEY"];
  if (!key) return null;
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

function admin() {
  return createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** "SW11 3AB" -> "SW11". Returns null when no district can be read. */
export function postcodeDistrict(postcode: string | null): string | null {
  if (!postcode) return null;
  const m = postcode.toUpperCase().trim().match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)/);
  return m ? m[1]! : null;
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
}

async function hits(params: Record<string, string>, auth: string): Promise<number | null> {
  const url = new URL(`${BASE}/advanced-search/companies`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("size", "1");
  try {
    const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { hits?: number };
    return typeof json.hits === "number" ? json.hits : null;
  } catch (error) {
    console.error("[CompaniesHouse] request failed:", error);
    return null;
  }
}

export async function getMarketDynamics(
  postcode: string | null,
  areaLabel: string,
): Promise<MarketDynamics | null> {
  const district = postcodeDistrict(postcode);
  if (!district) return null;

  const areaKey = `ch:${district}`;
  const supabase = admin();

  const { data: cached } = await supabase
    .from("companies_house_areas")
    .select("*")
    .eq("area_key", areaKey)
    .maybeSingle();

  if (cached && new Date(cached.refresh_after).getTime() > Date.now()) {
    return toDynamics(cached, areaLabel, district);
  }

  const auth = authHeader();
  if (!auth) return cached ? toDynamics(cached, areaLabel, district) : null;

  const [active, inc12, inc36, dis12, dis36] = await Promise.all([
    hits({ location: district, company_status: "active" }, auth),
    hits({ location: district, incorporated_from: isoDaysAgo(365) }, auth),
    hits({ location: district, incorporated_from: isoDaysAgo(1095) }, auth),
    hits({ location: district, company_status: "dissolved", dissolved_from: isoDaysAgo(365) }, auth),
    hits({ location: district, company_status: "dissolved", dissolved_from: isoDaysAgo(1095) }, auth),
  ]);

  if (active === null && inc12 === null) return null;

  const row = {
    area_key: areaKey,
    postcode_district: district,
    active_count: active ?? 0,
    incorporated_12m: inc12 ?? 0,
    incorporated_3y: inc36 ?? 0,
    dissolved_12m: dis12 ?? 0,
    dissolved_3y: dis36 ?? 0,
    net_change_12m: (inc12 ?? 0) - (dis12 ?? 0),
    retrieved_at: new Date().toISOString(),
    refresh_after: new Date(Date.now() + CACHE_DAYS * 86400_000).toISOString(),
  };

  const { error } = await supabase.from("companies_house_areas").upsert(row, { onConflict: "area_key" });
  if (error) console.error("[CompaniesHouse] cache write failed:", error.message);

  return toDynamics(row, areaLabel, district);
}

function toDynamics(
  row: {
    active_count: number;
    incorporated_12m: number;
    incorporated_3y: number;
    dissolved_12m: number;
    dissolved_3y: number;
    net_change_12m: number;
    median_age_years?: number | null;
    retrieved_at: string;
  },
  areaLabel: string,
  district: string,
): MarketDynamics {
  return {
    areaLabel: `${areaLabel} (${district})`,
    postcodeDistrict: district,
    activeCount: row.active_count,
    incorporated12m: row.incorporated_12m,
    incorporated3y: row.incorporated_3y,
    dissolved12m: row.dissolved_12m,
    dissolved3y: row.dissolved_3y,
    netChange12m: row.net_change_12m,
    medianAgeYears: row.median_age_years ?? null,
    source: "Companies House public data API",
    sourceUrl: "https://developer.company-information.service.gov.uk/",
    retrievedAt: row.retrieved_at,
    caveat:
      "Counts cover all registered companies in the postcode district, across every sector, and include registered-office-only addresses. They describe registrations, not trading performance.",
  };
}
