// Police.uk street-level crime API client.
//
// Home Office open data, no API key required. The API returns every recorded
// crime within roughly a 1 mile radius of a point for one calendar month.
// Nothing is inferred here: if a month is not published, it is reported as
// missing rather than filled in.

const API = "https://data.police.uk/api";
const TIMEOUT_MS = 20_000;

export const CRIME_SOURCE = "Police.uk street-level crime data (Home Office)";
export const CRIME_SOURCE_URL = "https://data.police.uk/docs/method/crime-street/";

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) {
      if (res.status !== 404) console.error(`[Crime] ${res.status} for ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error("[Crime] request failed:", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Months published by the Home Office, newest first (e.g. "2026-06"). */
export async function availableMonths(): Promise<string[]> {
  const dates = await getJson<Array<{ date: string }>>(`${API}/crimes-street-dates`);
  if (!dates) return [];
  return dates.map((d) => d.date).sort((a, b) => b.localeCompare(a));
}

export interface RawCrime {
  category: string;
  month: string;
}

/** All recorded crimes within ~1 mile of a point for one month. */
export async function crimesAtPoint(
  lat: number,
  lng: number,
  month: string,
): Promise<Record<string, number> | null> {
  const rows = await getJson<RawCrime[]>(
    `${API}/crimes-street/all-crime?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&date=${month}`,
  );
  if (!rows) return null;
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (!row?.category) continue;
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
}

/** Official crime category list for a month. */
export async function crimeCategories(month: string): Promise<Array<{ url: string; name: string }>> {
  return (await getJson<Array<{ url: string; name: string }>>(`${API}/crime-categories?date=${month}`)) ?? [];
}
