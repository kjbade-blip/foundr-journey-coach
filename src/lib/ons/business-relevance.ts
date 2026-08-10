// Business-type relevance framework.
//
// IMPORTANT: these weightings are a Found-r model, not a statistically proven
// relationship. They express which ONS indicators are most informative for a
// given business type, and every surface that uses them must label the output
// as a modelled assessment.

import type { LocationProfile } from "./types";

export type IndicatorKey =
  | "population"
  | "density"
  | "under16"
  | "youngAdults"
  | "workingAge"
  | "over65"
  | "employment"
  | "pay"
  | "onePersonHouseholds"
  | "familiesWithChildren";

export interface IndicatorDef {
  key: IndicatorKey;
  label: string;
  tooltip: string;
  /** Reads the derived/measured value out of a profile, or null if unavailable. */
  read: (p: LocationProfile) => number | null;
  /** Value that scores 100 in the model. */
  strongAt: number;
  unit: string;
}

export const INDICATORS: IndicatorDef[] = [
  {
    key: "population",
    label: "Resident population",
    tooltip: "Usual residents counted by ONS in the neighbourhood around this location.",
    read: (p) => p.population?.value ?? null,
    strongAt: 12000,
    unit: "people",
  },
  {
    key: "density",
    label: "Population density",
    tooltip: "People per square kilometre. Higher density usually means more passing trade within walking distance.",
    read: (p) => p.populationDensity?.value ?? null,
    strongAt: 5000,
    unit: "people/km²",
  },
  {
    key: "under16",
    label: "Children (under 16)",
    tooltip: "Share of residents aged under 16, from the ONS age structure table.",
    read: (p) => p.derived.under16Pct,
    strongAt: 24,
    unit: "%",
  },
  {
    key: "youngAdults",
    label: "Young adults (15–24)",
    tooltip: "Share of residents in the younger adult age bands published by ONS.",
    read: (p) => p.derived.age16to24Pct,
    strongAt: 16,
    unit: "%",
  },
  {
    key: "workingAge",
    label: "Working-age residents",
    tooltip: "Share of residents in the main working-age bands (20–64) published by ONS.",
    read: (p) => p.derived.workingAgePct,
    strongAt: 62,
    unit: "%",
  },
  {
    key: "over65",
    label: "Residents aged 65+",
    tooltip: "Share of residents aged 65 and over, from the ONS age structure table.",
    read: (p) => p.derived.age65PlusPct,
    strongAt: 24,
    unit: "%",
  },
  {
    key: "employment",
    label: "Employment rate",
    tooltip: "Share of residents aged 16+ recorded by ONS as in employment.",
    read: (p) => p.derived.employmentRatePct,
    strongAt: 62,
    unit: "%",
  },
  {
    key: "pay",
    label: "Median weekly pay",
    tooltip: "ONS Annual Survey of Hours and Earnings: median gross weekly pay for full-time residents of the local authority. This is earnings, not household income.",
    read: (p) => p.medianWeeklyPay?.value ?? null,
    strongAt: 750,
    unit: "£/week",
  },
  {
    key: "onePersonHouseholds",
    label: "One-person households",
    tooltip: "Share of households with a single occupant, from the ONS household composition table.",
    read: (p) => p.derived.onePersonHouseholdPct,
    strongAt: 34,
    unit: "%",
  },
  {
    key: "familiesWithChildren",
    label: "Households with dependent children",
    tooltip: "Share of households containing dependent children, from the ONS household composition table.",
    read: (p) => p.derived.householdsWithChildrenPct,
    strongAt: 32,
    unit: "%",
  },
];

export const INDICATOR_BY_KEY = Object.fromEntries(INDICATORS.map((i) => [i.key, i])) as Record<
  IndicatorKey,
  IndicatorDef
>;

export interface BusinessTypeDef {
  key: string;
  label: string;
  /** Google Places search term used for competitor evidence. */
  searchTerm: string;
  /** Relative weights across ONS indicators; normalised at scoring time. */
  weights: Partial<Record<IndicatorKey, number>>;
  rationale: string;
}

export const BUSINESS_TYPES: BusinessTypeDef[] = [
  {
    key: "coffee_shop",
    label: "Coffee Shop",
    searchTerm: "Coffee Shop",
    weights: { density: 3, workingAge: 3, population: 2, employment: 2, pay: 1, onePersonHouseholds: 1 },
    rationale: "Daytime food and drink tends to rely on footfall density and a working population nearby.",
  },
  {
    key: "gym",
    label: "Gym / Fitness Studio",
    searchTerm: "Gym",
    weights: { workingAge: 3, density: 3, youngAdults: 2, employment: 2, pay: 2 },
    rationale: "Membership businesses draw mainly on working-age residents within a short travel time.",
  },
  {
    key: "nursery",
    label: "Nursery / Childcare",
    searchTerm: "Nursery",
    weights: { under16: 4, familiesWithChildren: 4, employment: 2, population: 2, pay: 1 },
    rationale: "Demand is closely tied to the number of local households with dependent children.",
  },
  {
    key: "hair_salon",
    label: "Hair Salon",
    searchTerm: "Hair Salon",
    weights: { population: 3, density: 2, workingAge: 2, pay: 2, youngAdults: 1, over65: 1 },
    rationale: "Salons serve a broad resident base, with spend influenced by local earnings.",
  },
  {
    key: "dog_grooming",
    label: "Dog Grooming",
    searchTerm: "Dog Grooming",
    weights: { population: 3, pay: 2, over65: 2, onePersonHouseholds: 2, familiesWithChildren: 1 },
    rationale: "Pet services index on household counts and discretionary spend rather than footfall.",
  },
  {
    key: "convenience_store",
    label: "Convenience Store",
    searchTerm: "Convenience Store",
    weights: { density: 4, population: 3, onePersonHouseholds: 2, employment: 1 },
    rationale: "Convenience retail is driven above all by resident density within a few minutes' walk.",
  },
  {
    key: "bakery",
    label: "Bakery",
    searchTerm: "Bakery",
    weights: { density: 3, population: 3, over65: 1, familiesWithChildren: 2, pay: 1 },
    rationale: "Bakeries combine local resident trade with passing footfall.",
  },
  {
    key: "restaurant",
    label: "Restaurant",
    searchTerm: "Restaurant",
    weights: { density: 3, pay: 3, workingAge: 2, population: 2, youngAdults: 1 },
    rationale: "Evening dining is sensitive to local earnings as well as catchment size.",
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    searchTerm: "Pharmacy",
    weights: { population: 3, over65: 3, density: 2, familiesWithChildren: 1 },
    rationale: "Pharmacy demand rises with population size and the share of older residents.",
  },
  {
    key: "care_service",
    label: "Care / Retirement Services",
    searchTerm: "Care Home",
    weights: { over65: 5, population: 2, onePersonHouseholds: 2, pay: 1 },
    rationale: "Older-age services concentrate on the 65+ population and single-occupant households.",
  },
];

export const BUSINESS_TYPE_BY_KEY = Object.fromEntries(BUSINESS_TYPES.map((b) => [b.key, b])) as Record<
  string,
  BusinessTypeDef
>;

/** Match a free-text category (e.g. from the Opportunity Finder) to a type. */
export function matchBusinessType(input: string | null | undefined): BusinessTypeDef | null {
  if (!input) return null;
  const q = input.toLowerCase().trim();
  return (
    BUSINESS_TYPES.find((b) => b.label.toLowerCase() === q || b.key === q) ??
    BUSINESS_TYPES.find((b) => q.includes(b.searchTerm.toLowerCase()) || b.label.toLowerCase().includes(q)) ??
    null
  );
}
