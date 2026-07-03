// Deterministic sample BDI results used for demo/marketing surfaces
// (dashboards, reports listings, journey stages) where we don't have a
// live location analysis yet.
import { computeBDI, type BDIPlaceInput, type BDIResult } from "./bdi";

function sample(kind: "healthy" | "concentrated" | "weak"): BDIPlaceInput[] {
  if (kind === "healthy") {
    return [
      ...rep("restaurant", 6, "OPERATIONAL", "Local Kitchen"),
      ...rep("cafe", 4, "OPERATIONAL", "Independent Cafe"),
      ...rep("coffee_shop", 2, "OPERATIONAL", "Costa"),
      ...rep("bakery", 2, "OPERATIONAL", "The Bakery"),
      ...rep("bar", 3, "OPERATIONAL", "Wine Bar"),
      ...rep("pub", 2, "OPERATIONAL", "The Crown"),
      ...rep("clothing_store", 3, "OPERATIONAL", "Boutique"),
      ...rep("gift_shop", 2, "OPERATIONAL", "Gifts"),
      ...rep("book_store", 1, "OPERATIONAL", "Waterstones"),
      ...rep("florist", 1, "OPERATIONAL", "Florist"),
      ...rep("pharmacy", 2, "OPERATIONAL", "Boots"),
      ...rep("bank", 2, "OPERATIONAL", "Barclays"),
      ...rep("post_office", 1, "OPERATIONAL", "Post Office"),
      ...rep("supermarket", 1, "OPERATIONAL", "Sainsbury's"),
      ...rep("optician", 1, "OPERATIONAL", "Specsavers"),
      ...rep("doctor", 1, "OPERATIONAL", "Surgery"),
      ...rep("dentist", 1, "OPERATIONAL", "Dental"),
      ...rep("gym", 2, "OPERATIONAL", "PureGym"),
      ...rep("yoga_studio", 1, "OPERATIONAL", "Yoga"),
      ...rep("hair_salon", 2, "OPERATIONAL", "Salon"),
      ...rep("beauty_salon", 2, "OPERATIONAL", "Beauty Room"),
      ...rep("movie_theater", 1, "OPERATIONAL", "Cinema"),
      ...rep("art_gallery", 1, "OPERATIONAL", "Gallery"),
      ...rep("real_estate_agency", 2, "OPERATIONAL", "Estate Agent"),
      ...rep("accounting", 1, "OPERATIONAL", "Accountants"),
    ];
  }
  if (kind === "concentrated") {
    return [
      ...rep("barber_shop", 12, "OPERATIONAL", "Barber"),
      ...rep("meal_takeaway", 10, "OPERATIONAL", "Takeaway"),
      ...rep("nail_salon", 6, "OPERATIONAL", "Nail Bar"),
      ...rep("convenience_store", 4, "OPERATIONAL", "Convenience"),
      ...rep("cafe", 2, "OPERATIONAL", "Cafe"),
      ...rep("pharmacy", 1, "OPERATIONAL", "Pharmacy"),
    ];
  }
  return [
    ...rep("meal_takeaway", 5, "OPERATIONAL", "Takeaway"),
    ...rep("convenience_store", 3, "OPERATIONAL", "Shop"),
    ...rep("barber_shop", 3, "OPERATIONAL", "Barber"),
    ...rep("hair_salon", 2, "OPERATIONAL", "Salon"),
  ];
}

function rep(primaryType: string, n: number, businessStatus = "OPERATIONAL", nameBase = "Business"): BDIPlaceInput[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${primaryType}-${i}`,
    name: `${nameBase} ${i + 1}`,
    primaryType,
    types: [primaryType],
    businessStatus,
  }));
}

let cache: Record<string, BDIResult> | null = null;
function all(): Record<string, BDIResult> {
  if (cache) return cache;
  cache = {
    healthy: computeBDI(sample("healthy")),
    concentrated: computeBDI(sample("concentrated")),
    weak: computeBDI(sample("weak")),
  };
  return cache;
}

export function sampleBDI(kind: "healthy" | "concentrated" | "weak" = "healthy"): BDIResult {
  return all()[kind];
}
