// Cross-source deduplication.
//
// The same unit is routinely advertised by several agents on several portals.
// We treat two adverts as the same unit when their normalised address or
// postcode agrees and either the rent or the floor area is close.

import type { PropertyListing } from "./types";

function norm(s: string | null): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function rentOf(l: PropertyListing): number | null {
  return l.rentPerMonth ?? (l.rentPerYear != null ? Math.round(l.rentPerYear / 12) : null);
}

function close(a: number | null, b: number | null, tolerance: number): boolean {
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= Math.max(a, b) * tolerance;
}

export function sameUnit(a: PropertyListing, b: PropertyListing): boolean {
  if (a.sourceId === b.sourceId && a.sourceListingId && a.sourceListingId === b.sourceListingId) return true;
  const addrA = norm(a.addressLine ?? a.approximateLocation);
  const addrB = norm(b.addressLine ?? b.approximateLocation);
  const pcA = norm(a.postcode);
  const pcB = norm(b.postcode);
  const addressMatch = (addrA && addrA === addrB) || (pcA && pcA === pcB && addrA.slice(0, 12) === addrB.slice(0, 12));
  if (!addressMatch) return false;
  return close(rentOf(a), rentOf(b), 0.05) || close(a.sizeSqFt, b.sizeSqFt, 0.05);
}

export interface DedupedListing {
  listing: PropertyListing;
  /** Other adverts for the same unit, kept so the user can see every source. */
  duplicates: PropertyListing[];
}

/** Keeps the most complete advert as primary and attaches the rest. */
export function dedupeListings(listings: PropertyListing[]): DedupedListing[] {
  const groups: DedupedListing[] = [];
  for (const l of listings) {
    const hit = groups.find((g) => sameUnit(g.listing, l) || g.duplicates.some((d) => sameUnit(d, l)));
    if (!hit) {
      groups.push({ listing: l, duplicates: [] });
      continue;
    }
    const richer = fields(l) > fields(hit.listing);
    if (richer) {
      hit.duplicates.push(hit.listing);
      hit.listing = l;
    } else {
      hit.duplicates.push(l);
    }
  }
  return groups;
}

function fields(l: PropertyListing): number {
  return [l.sizeSqFt, l.rentPerMonth ?? l.rentPerYear, l.ratesPerYear, l.addressLine, l.description, l.imageUrl, l.epcRating]
    .filter((v) => v != null && v !== "")
    .length + Object.keys(l.features).length;
}
