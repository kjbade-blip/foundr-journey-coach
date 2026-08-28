// Business finder for onboarding. Two sources, both real:
//   - Companies House (registered name, company number, status, SIC industry)
//   - Google Places (trading name, address, website, coordinates)
// Neither source is invented: when a source is unavailable it simply
// contributes no results.

import { searchBusinesses as searchPlaces, fetchPlaceDetails } from "../business-discovery.server";
import type { BusinessMatch } from "./types";

const CH_BASE = "https://api.company-information.service.gov.uk";

function chAuth(): string | null {
  const key = process.env["COMPANIES_HOUSE_API_KEY"];
  return key ? `Basic ${Buffer.from(`${key}:`).toString("base64")}` : null;
}

function postcodeFrom(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.toUpperCase().match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/);
  return m ? m[0].replace(/\s+/, " ") : null;
}

interface CHCompany {
  company_number?: string;
  title?: string;
  company_status?: string;
  address_snippet?: string;
  address?: { postal_code?: string };
  description?: string;
}

async function companiesHouse(query: string): Promise<BusinessMatch[]> {
  const auth = chAuth();
  if (!auth) return [];
  const trimmed = query.trim();
  const isCompanyNumber = /^[A-Z0-9]{6,8}$/i.test(trimmed.replace(/\s+/g, ""));
  try {
    const url = isCompanyNumber
      ? new URL(`${CH_BASE}/company/${trimmed.replace(/\s+/g, "").toUpperCase()}`)
      : new URL(`${CH_BASE}/search/companies`);
    if (!isCompanyNumber) {
      url.searchParams.set("q", trimmed);
      url.searchParams.set("items_per_page", "8");
    }
    const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: CHCompany[] } & CHCompany;
    const items: CHCompany[] = isCompanyNumber ? [json] : (json.items ?? []);
    return items
      .filter((c) => c.company_number && (c.title || (c as { company_name?: string }).company_name))
      .map((c) => {
        const name = c.title ?? (c as { company_name?: string }).company_name ?? "";
        const address = c.address_snippet ?? null;
        return {
          key: `ch:${c.company_number}`,
          name,
          address,
          postcode: c.address?.postal_code ?? postcodeFrom(address),
          companyNumber: c.company_number ?? null,
          status: c.company_status ?? null,
          industry: null,
          website: null,
          placeId: null,
          latitude: null,
          longitude: null,
          source: "companies_house" as const,
        };
      });
  } catch (error) {
    console.error("[Onboarding] Companies House search failed:", error);
    return [];
  }
}

async function places(query: string): Promise<BusinessMatch[]> {
  try {
    const results = await searchPlaces(query);
    return results.slice(0, 8).map((p) => ({
      key: `place:${p.id}`,
      name: p.name,
      address: p.address,
      postcode: postcodeFrom(p.address),
      companyNumber: null,
      status: null,
      industry: p.category || null,
      website: null,
      placeId: p.id,
      latitude: p.lat,
      longitude: p.lng,
      source: "places" as const,
    }));
  } catch (error) {
    console.error("[Onboarding] Places search failed:", error);
    return [];
  }
}

export async function findBusinesses(query: string): Promise<BusinessMatch[]> {
  const [ch, gp] = await Promise.all([companiesHouse(query), places(query)]);
  return [...ch, ...gp];
}

/** Enrich a Places match with the website and status before it is saved. */
export async function enrichMatch(match: BusinessMatch): Promise<BusinessMatch> {
  if (!match.placeId) return match;
  try {
    const details = await fetchPlaceDetails(match.placeId);
    if (!details) return match;
    return {
      ...match,
      website: details.website ?? match.website,
      status: details.status ?? match.status,
      industry: match.industry ?? details.categories[0] ?? null,
      latitude: details.lat,
      longitude: details.lng,
    };
  } catch {
    return match;
  }
}
