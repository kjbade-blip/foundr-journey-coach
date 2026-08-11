// The canonical Found-r Opportunity Analysis.
//
// Every surface — Opportunity Finder, dashboard, reports, AI interpretation —
// consumes this one object. Nothing recalculates a score of its own.
//
// Three kinds of content live here and must stay visibly separated in the UI:
//   SOURCE DATA        — published figures (ONS, police.uk, Companies House, Google Places)
//   FOUND-R MODEL      — deterministic scores derived from that data
//   AI INTERPRETATION  — hedged reading of the model output, never a source of figures

import type { LocationProfile } from "../ons/types";
import type { CompetitorScan } from "../ons/competition.server";
import type { CrimeProfile, CrimeRisk } from "../crime/types";
import type { BDIResult } from "../bdi";

export type EvidenceKey =
  | "ons"
  | "googlePlaces"
  | "crime"
  | "businessDiversity"
  | "companiesHouse"
  | "property"
  | "accessibility";

export type EvidenceStatus = "available" | "partial" | "unavailable";

export interface EvidenceSource {
  key: EvidenceKey;
  label: string;
  status: EvidenceStatus;
  /** Publisher of the underlying data. */
  source: string;
  sourceUrl: string | null;
  referencePeriod: string | null;
  retrievedAt: string | null;
  /** Why it is unavailable, or what the data covers. */
  note: string | null;
}

export type CategoryKey =
  | "demand"
  | "competition"
  | "demographics"
  | "economy"
  | "marketDynamics"
  | "ecosystem"
  | "crime"
  | "accessibility"
  | "property"
  | "businessFit";

export type Reading = "high" | "medium" | "low";

export interface CategoryDataPoint {
  label: string;
  value: string;
  source: string;
}

export interface CategoryScore {
  key: CategoryKey;
  label: string;
  /** 0-100, deterministic. */
  score: number;
  /** Share of the overall score this category carries, after redistribution. */
  weight: number;
  reading: Reading;
  sources: string[];
  dataPoints: CategoryDataPoint[];
  /** Plain-English reading of the number. Found-r model, not AI. */
  interpretation: string;
  limitations: string | null;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceFactor {
  label: string;
  detail: string;
  /** Points added or removed from the confidence score. */
  impact: number;
}

export interface ConfidenceAssessment {
  score: number;
  level: ConfidenceLevel;
  reason: string;
  factors: ConfidenceFactor[];
}

export type VerdictKey = "go" | "go_with_conditions" | "not_yet";

export interface Verdict {
  key: VerdictKey;
  label: string;
  tone: "good" | "warn" | "bad";
  reason: string;
  conditions: string[];
}

/** Companies House derived local business-market activity. Source data only. */
export interface MarketDynamics {
  areaLabel: string;
  postcodeDistrict: string | null;
  activeCount: number;
  incorporated12m: number;
  incorporated3y: number;
  dissolved12m: number;
  dissolved3y: number;
  netChange12m: number;
  medianAgeYears: number | null;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  caveat: string;
}

export interface BusinessDiversitySummary {
  result: BDIResult;
  narrative: string;
  radiusMiles: number;
  retrievedAt: string;
}

export interface CrimeAssessmentEvidence {
  profile: CrimeProfile;
  risk: CrimeRisk;
}

export interface OpportunityEvidence {
  ons: LocationProfile | null;
  competition: CompetitorScan | null;
  crime: CrimeAssessmentEvidence | null;
  businessDiversity: BusinessDiversitySummary | null;
  companiesHouse: MarketDynamics | null;
  /** No reliable UK-wide source connected yet. Integration point only. */
  property: null;
  /** No reliable footfall/accessibility source connected yet. */
  accessibility: null;
}

export interface AlternativeLocation {
  displayName: string;
  postcode: string | null;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  score: number;
  advantage: string;
  risk: string;
  basedOn: string[];
}

export interface OpportunityInterpretation {
  verdictRationale: string;
  strengths: string[];
  risks: string[];
  opportunities: string[];
  investigateNext: string[];
  recommendedAction: string;
  confidenceExplanation: string;
  /** The signature "What would Found-r do?" answer. */
  whatWouldFoundrDo: string;
  generatedBy: "ai" | "rules";
}

export interface OpportunityAnalysis {
  version: 1;
  id: string | null;
  timestamp: string;
  businessType: { key: string; label: string; rationale: string };
  businessName: string | null;
  location: {
    displayName: string;
    postcode: string | null;
    latitude: number | null;
    longitude: number | null;
    radiusMiles: number;
    geography: string | null;
  };
  evidence: OpportunityEvidence;
  sources: EvidenceSource[];
  categories: CategoryScore[];
  overallScore: number | null;
  confidence: ConfidenceAssessment;
  verdict: Verdict;
  evidenceGaps: string[];
  interpretation: OpportunityInterpretation;
  alternatives: AlternativeLocation[];
  methodology: string;
}

/** Lightweight row shape used by lists (dashboard, reports). */
export interface SavedOpportunitySummary {
  id: string;
  displayName: string;
  businessType: string | null;
  overallScore: number | null;
  confidenceScore: number | null;
  verdict: string | null;
  createdAt: string;
}
