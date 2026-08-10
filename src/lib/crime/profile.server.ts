// Builds the Crime & Safety profile for a point: a 12-month window of
// Home Office street-level crime, cached, benchmarked against a fixed set of
// Found-r reference areas measured with the identical method.

import {
  areaKey,
  readCategoryMeta,
  readMonths,
  readReferenceAreas,
  readReferenceMonths,
  readWeights,
  writeMonth,
  type ReferenceArea,
} from "./cache.server";
import { availableMonths, crimesAtPoint, CRIME_SOURCE, CRIME_SOURCE_URL } from "./police.server";
import { FALLBACK_WEIGHTS, type CrimeWeights } from "./model";
import type { CrimeBenchmark, CrimeCategoryCount, CrimeProfile } from "./types";

export const CRIME_WINDOW_MONTHS = 12;
const RADIUS_MILES = 1;

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/** Run tasks with bounded concurrency so we stay polite to the police API. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}

interface MonthResult {
  month: string;
  byCategory: Record<string, number>;
}

/** Fetch (or read from cache) every month in the window for one point. */
async function loadArea(
  lat: number,
  lng: number,
  months: string[],
  geo?: { lsoa?: string | null; localAuthority?: string | null; region?: string | null },
): Promise<MonthResult[]> {
  const key = areaKey(lat, lng, RADIUS_MILES);
  const cached = await readMonths(key, months);
  const latest = months[0];

  const results = await mapLimit(months, 4, async (month) => {
    const hit = cached.get(month);
    if (hit && (hit.fresh || month !== latest)) {
      return { month, byCategory: hit.byCategory } satisfies MonthResult;
    }
    const fetched = await crimesAtPoint(lat, lng, month);
    if (!fetched) {
      return hit ? ({ month, byCategory: hit.byCategory } satisfies MonthResult) : null;
    }
    await writeMonth(key, lat, lng, RADIUS_MILES, month, fetched, month === latest, geo);
    return { month, byCategory: fetched } satisfies MonthResult;
  });

  return results.filter((r): r is MonthResult => r !== null);
}

function indexOf(byCategory: Record<string, number>, weights: CrimeWeights): number {
  return Object.entries(byCategory).reduce(
    (sum, [slug, count]) => sum + count * (weights[slug] ?? FALLBACK_WEIGHTS[slug] ?? 1),
    0,
  );
}

/** Rank this area's weighted monthly load against the reference corpus. */
async function buildBenchmark(
  ownPerMonth: number,
  months: string[],
  weights: CrimeWeights,
): Promise<CrimeBenchmark | null> {
  const areas = await readReferenceAreas();
  if (areas.length === 0) return null;
  const rows = await readReferenceMonths(areas, months, RADIUS_MILES);

  const byArea: Array<{ area: ReferenceArea; perMonth: number; months: number }> = [];
  for (const area of areas) {
    const list = rows.get(areaKey(area.latitude, area.longitude, RADIUS_MILES)) ?? [];
    if (list.length < 6) continue;
    // Not every police force publishes street-level data. An area returning
    // almost nothing is a data gap, not a safe area, so it must not sit at the
    // bottom of the benchmark and flatter everywhere else.
    const rawPerMonth =
      list.reduce((sum, r) => sum + Object.values(r.byCategory).reduce((a, b) => a + b, 0), 0) / list.length;
    if (rawPerMonth < 8) continue;
    const total = list.reduce((sum, r) => sum + indexOf(r.byCategory, weights), 0);
    byArea.push({ area, perMonth: total / list.length, months: list.length });
  }
  if (byArea.length < 3) return null;

  byArea.sort((a, b) => a.perMonth - b.perMonth);
  const lower = byArea.filter((a) => a.perMonth < ownPerMonth).length;
  const percentile = Math.round((lower / byArea.length) * 100);
  const mid = byArea[Math.floor(byArea.length / 2)]!;

  return {
    comparedWith: byArea.length,
    percentile,
    medianPerMonth: Math.round(mid.perMonth * 10) / 10,
    lowestArea: { name: byArea[0]!.area.name, perMonth: Math.round(byArea[0]!.perMonth * 10) / 10 },
    highestArea: {
      name: byArea[byArea.length - 1]!.area.name,
      perMonth: Math.round(byArea[byArea.length - 1]!.perMonth * 10) / 10,
    },
    method:
      "Reference areas span major city centres, town centres, market towns, suburbs and rural areas. Each is measured over the same months with the same 1 mile radius, then weighted for the selected business type.",
  };
}

export interface CrimeProfileInput {
  latitude: number;
  longitude: number;
  businessKey?: string;
  /** Resident population used only to express a per-1,000 rate. */
  population?: number | null;
  populationGeography?: string | null;
  lsoa?: string | null;
  localAuthority?: string | null;
  region?: string | null;
}

export async function buildCrimeProfile(
  input: CrimeProfileInput,
): Promise<{ profile: CrimeProfile; weights: CrimeWeights } | null> {
  const published = await availableMonths();
  if (published.length === 0) {
    console.error("[Crime] no published months returned by police.uk");
    return null;
  }
  const months = published.slice(0, CRIME_WINDOW_MONTHS);

  const [weightsRaw, categoryMeta, results] = await Promise.all([
    readWeights(input.businessKey ?? "default"),
    readCategoryMeta(),
    loadArea(input.latitude, input.longitude, months, {
      lsoa: input.lsoa,
      localAuthority: input.localAuthority,
      region: input.region,
    }),
  ]);
  const weights = Object.keys(weightsRaw).length > 0 ? weightsRaw : FALLBACK_WEIGHTS;

  if (results.length === 0) return null;

  const totals: Record<string, number> = {};
  for (const r of results) {
    for (const [slug, count] of Object.entries(r.byCategory)) {
      totals[slug] = (totals[slug] ?? 0) + count;
    }
  }
  const totalCrimes = Object.values(totals).reduce((a, b) => a + b, 0);
  const monthsReturned = results.length;

  const categories: CrimeCategoryCount[] = Object.entries(totals)
    .map(([slug, count]) => {
      const meta = categoryMeta.get(slug);
      return {
        slug,
        name: meta?.name ?? slug.replace(/-/g, " "),
        count,
        share: totalCrimes > 0 ? Math.round((count / totalCrimes) * 1000) / 10 : 0,
        perMonth: Math.round((count / monthsReturned) * 10) / 10,
        businessRelevance: meta?.businessRelevance ?? null,
      };
    })
    .sort((a, b) => b.count - a.count);

  const monthly = results
    .map((r) => ({
      month: r.month,
      total: Object.values(r.byCategory).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  let trendPct: number | null = null;
  if (monthly.length >= 12) {
    const recent = monthly.slice(-6).reduce((s, m) => s + m.total, 0);
    const prior = monthly.slice(-12, -6).reduce((s, m) => s + m.total, 0);
    if (prior > 0) trendPct = Math.round(((recent - prior) / prior) * 1000) / 10;
  }

  const rate =
    input.population && input.population > 0
      ? {
          value: Math.round((totalCrimes / input.population) * 1000 * 10) / 10,
          population: input.population,
          populationGeography: input.populationGeography ?? "local ONS geography",
          caveat:
            "Derived by Found-r. Police data covers a 1 mile radius while the population figure covers the surrounding ONS neighbourhood, so the two areas are not identical. Treat this as an indicative rate, not an official crime rate.",
        }
      : null;

  const ownWeightedPerMonth = results.reduce((sum, r) => sum + indexOf(r.byCategory, weights), 0) / monthsReturned;
  const benchmark = await buildBenchmark(ownWeightedPerMonth, months, weights);

  const unavailable: string[] = [];
  if (monthsReturned < months.length) {
    unavailable.push(
      `${months.length - monthsReturned} of the last ${months.length} published months were not returned for this area.`,
    );
  }
  if (!rate) unavailable.push("Crimes per 1,000 residents — no ONS population figure was available for this area.");
  if (!benchmark) {
    unavailable.push("National comparison — the Found-r reference areas have not been measured for this window yet.");
  }

  const first = monthly[0]?.month;
  const last = monthly[monthly.length - 1]?.month;

  return {
    weights,
    profile: {
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMiles: RADIUS_MILES,
      months: monthly.map((m) => m.month),
      windowLabel: first && last ? `${monthLabel(first)} – ${monthLabel(last)}` : "",
      monthsRequested: months.length,
      monthsReturned,
      totalCrimes,
      averagePerMonth: Math.round((totalCrimes / monthsReturned) * 10) / 10,
      categories,
      monthly,
      trendPct,
      rate,
      benchmark,
      source: CRIME_SOURCE,
      sourceUrl: CRIME_SOURCE_URL,
      retrievedAt: new Date().toISOString(),
      unavailable,
    },
  };
}

/** Populate/refresh the reference corpus used for benchmarking. */
export async function refreshReferenceAreas(): Promise<{ areas: number; months: number }> {
  const published = await availableMonths();
  const months = published.slice(0, CRIME_WINDOW_MONTHS);
  const areas = await readReferenceAreas();
  let loaded = 0;
  for (const area of areas) {
    const results = await loadArea(area.latitude, area.longitude, months);
    loaded += results.length;
  }
  return { areas: areas.length, months: loaded };
}
