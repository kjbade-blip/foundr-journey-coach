// Client-safe types for the ONS evidence layer.
// Every figure the app displays must be traceable to a dataset, geography and
// reference period — that contract is encoded here.

export type GeographyLevel =
  | "country"
  | "region"
  | "county"
  | "local_authority"
  | "ward"
  | "msoa"
  | "lsoa";

export const GEOGRAPHY_LABELS: Record<GeographyLevel, string> = {
  country: "Country",
  region: "Region",
  county: "County",
  local_authority: "Local authority",
  ward: "Ward",
  msoa: "MSOA (neighbourhood, ~7,500 people)",
  lsoa: "LSOA (small area, ~1,500 people)",
};

export interface GeographyRef {
  level: GeographyLevel;
  code: string;
  name: string;
}

/** Provenance carried by every ONS-derived figure. */
export interface Provenance {
  datasetId: string;
  datasetName: string;
  referencePeriod: string;
  geographyLevel: GeographyLevel;
  geographyCode: string;
  geographyName: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
}

export interface OnsMetric extends Provenance {
  value: number;
  unit: string;
  /** Set when the figure is not a directly published ONS value. */
  derivation?: string;
}

export interface OnsCategory {
  label: string;
  value: number;
  /** Share of the dataset total, 0-100. Derived by Found-r. */
  share: number;
}

export interface OnsBreakdown extends Provenance {
  unit: string;
  total: number;
  categories: OnsCategory[];
}

export interface EvidenceItem {
  label: string;
  datasetId: string;
  datasetName: string;
  referencePeriod: string;
  geographyLevel: GeographyLevel;
  geographyName: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
}

export interface UnavailableItem {
  metric: string;
  reason: string;
}

/** Figures Found-r calculates from ONS values. Always labelled as derived. */
export interface DerivedIndicators {
  under16Pct: number | null;
  age16to24Pct: number | null;
  workingAgePct: number | null;
  age65PlusPct: number | null;
  largestAgeBand: string | null;
  employmentRatePct: number | null;
  unemploymentRatePct: number | null;
  economicallyInactivePct: number | null;
  onePersonHouseholdPct: number | null;
  householdsWithChildrenPct: number | null;
  averageHouseholdSize: number | null;
}

export interface LocationProfile {
  cacheKey: string;
  displayName: string;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  primaryGeography: GeographyRef;
  geographies: Partial<Record<GeographyLevel, GeographyRef>>;
  population: OnsMetric | null;
  populationEstimate: OnsMetric | null;
  populationChange: OnsMetric | null;
  populationDensity: OnsMetric | null;
  households: OnsMetric | null;
  medianWeeklyPay: OnsMetric | null;
  ageBands: OnsBreakdown | null;
  householdComposition: OnsBreakdown | null;
  economicActivity: OnsBreakdown | null;
  industry: OnsBreakdown | null;
  derived: DerivedIndicators;
  evidence: EvidenceItem[];
  unavailable: UnavailableItem[];
  retrievedAt: string;
  refreshAfter: string;
}

/** AI interpretation, strictly separated into evidence, reading and action. */
export interface Interpretation {
  fact: string[];
  inference: string[];
  recommendation: string[];
}

/** Ranked business-type suggestion for a location. */
export interface OpportunitySuggestion {
  businessType: string;
  key: string;
  score: number;
  drivers: Array<{ label: string; value: string }>;
  rationale: string;
  competition: {
    count: number;
    strongCount: number;
    radiusMiles: number;
    examples: Array<{ name: string; rating: number | null; reviews: number | null }>;
  } | null;
  /** Found-r crime score (100 = lowest measured crime load), or null. */
  crimeScore: number | null;
}
