// Client-safe types for the crime & safety evidence layer.
//
// Every figure here comes from Home Office street-level police data published
// on data.police.uk. As with the ONS layer, each number carries the geography,
// the exact months it covers and the retrieval date so it can be traced.

export interface CrimeCategoryCount {
  slug: string;
  name: string;
  /** Recorded crimes in the window. FACT — police-recorded count. */
  count: number;
  /** Share of all recorded crimes in the window, 0-100. Derived by Found-r. */
  share: number;
  perMonth: number;
  businessRelevance: string | null;
}

export interface CrimeMonthPoint {
  month: string;
  total: number;
}

export interface CrimeRate {
  /** Crimes per 1,000 residents across the window. Derived by Found-r. */
  value: number;
  population: number;
  populationGeography: string;
  caveat: string;
}

export interface CrimeBenchmark {
  /** Number of Found-r reference areas measured with the identical method. */
  comparedWith: number;
  /** 0-100. Share of reference areas with a lower weighted crime load. */
  percentile: number;
  medianPerMonth: number;
  lowestArea: { name: string; perMonth: number } | null;
  highestArea: { name: string; perMonth: number } | null;
  method: string;
}

export interface CrimeProfile {
  latitude: number;
  longitude: number;
  /** Police street-level data is published for a ~1 mile radius around a point. */
  radiusMiles: number;
  months: string[];
  windowLabel: string;
  monthsRequested: number;
  monthsReturned: number;
  totalCrimes: number;
  averagePerMonth: number;
  categories: CrimeCategoryCount[];
  monthly: CrimeMonthPoint[];
  /** % change, most recent 6 months vs the 6 before. Derived by Found-r. */
  trendPct: number | null;
  rate: CrimeRate | null;
  benchmark: CrimeBenchmark | null;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  unavailable: string[];
}

export interface CrimeRiskDriver {
  slug: string;
  name: string;
  count: number;
  perMonth: number;
  weight: number;
  /** Share of the weighted risk index attributable to this category, 0-100. */
  contribution: number;
  businessRelevance: string | null;
}

export type CrimeConfidence = "high" | "medium" | "low";

export interface CrimeRisk {
  /** 0-100 where 100 means the lowest measured crime load. Modelled. */
  score: number;
  /** Weighted crimes per month for the selected business type. Modelled. */
  weightedIndex: number;
  band: { label: string; tone: "good" | "warn" | "bad" };
  drivers: CrimeRiskDriver[];
  confidence: CrimeConfidence;
  confidenceReason: string;
  method: string;
  businessType: string;
  modelled: true;
}
