// Canonical analysis pipeline.
//
// DATA COLLECTION (parallel, failure-tolerant)
//   → NORMALISATION & DETERMINISTIC SCORING (engine.ts)
//   → CONFIDENCE (confidence.ts)
//   → VERDICT (verdict.ts)
//   → AI INTERPRETATION (interpret.server.ts)
//
// Every evidence source is optional. A source that fails is recorded as
// unavailable and its weight is redistributed — never estimated.

import { buildLocationProfile } from "../ons/profile.server";
import { scanCompetitors } from "../ons/competition.server";
import { buildCrimeProfile } from "../crime/profile.server";
import { assessCrimeRisk } from "../crime/model";
import { collectBDI } from "../bdi.server";
import { BUSINESS_TYPES, matchBusinessType, type BusinessTypeDef } from "../ons/business-relevance";
import { buildScores } from "./engine";
import { buildDemandAssessment } from "./demand";
import { assessConfidence } from "./confidence";
import { deriveVerdict } from "./verdict";
import { interpretAnalysis } from "./interpret.server";
import { getMarketDynamics } from "./companies-house.server";
import { findAlternatives } from "./alternatives.server";
import type { LocationProfile } from "../ons/types";
import type {
  BusinessDiversitySummary,
  CrimeAssessmentEvidence,
  MarketDynamics,
  OpportunityAnalysis,
  OpportunityEvidence,
} from "./types";

export interface AnalyseInput {
  query?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
  businessType: string;
  businessName?: string;
  radiusMiles?: number;
  forceRefresh?: boolean;
  includeAlternatives?: boolean;
  interpret?: boolean;
}

const METHODOLOGY =
  "Found-r collects published data (ONS Census 2021 and ASHE, Home Office street-level crime, Companies House, Google Places), normalises each indicator against Found-r benchmarks, then scores weighted categories chosen for the business type. Categories with no verified data are excluded from the score and their weight is redistributed — never estimated. Confidence is assessed separately from the score and reflects how much evidence the judgement rests on. The AI interprets this finished model; it never calculates or supplies a figure.";

async function crimeFor(profile: LocationProfile, type: BusinessTypeDef): Promise<CrimeAssessmentEvidence | null> {
  if (profile.latitude === null || profile.longitude === null) return null;
  try {
    const built = await buildCrimeProfile({
      latitude: profile.latitude,
      longitude: profile.longitude,
      businessKey: type.key,
      population: profile.population?.value ?? null,
      populationGeography: profile.primaryGeography.name,
      lsoa: profile.geographies.lsoa?.code ?? null,
      localAuthority: profile.geographies.local_authority?.code ?? null,
      region: profile.geographies.region?.code ?? null,
    });
    if (!built) return null;
    return { profile: built.profile, risk: assessCrimeRisk(built.profile, built.weights, type.label) };
  } catch (error) {
    console.error("[Opportunity] crime evidence failed:", error);
    return null;
  }
}

async function bdiFor(profile: LocationProfile, radiusMiles: number): Promise<BusinessDiversitySummary | null> {
  if (profile.latitude === null || profile.longitude === null) return null;
  try {
    const radius = Math.min(5000, Math.max(200, Math.round(radiusMiles * 1609)));
    const { result, narrative } = await collectBDI(profile.latitude, profile.longitude, radius, profile.displayName, false);
    if (result.sampleSize === 0) return null;
    return { result, narrative, radiusMiles, retrievedAt: new Date().toISOString() };
  } catch (error) {
    console.error("[Opportunity] BDI evidence failed:", error);
    return null;
  }
}

async function marketFor(profile: LocationProfile): Promise<MarketDynamics | null> {
  try {
    return await getMarketDynamics(profile.postcode, profile.primaryGeography.name);
  } catch (error) {
    console.error("[Opportunity] Companies House evidence failed:", error);
    return null;
  }
}

export async function buildOpportunityAnalysis(input: AnalyseInput): Promise<OpportunityAnalysis> {
  const type = matchBusinessType(input.businessType) ?? BUSINESS_TYPES[0]!;
  const radiusMiles = input.radiusMiles ?? 1;

  const profile = await buildLocationProfile({
    query: input.query,
    latitude: input.latitude,
    longitude: input.longitude,
    label: input.label,
    forceRefresh: input.forceRefresh,
  });

  const hasPoint = profile.latitude !== null && profile.longitude !== null;

  const [competition, crime, businessDiversity, companiesHouse] = await Promise.all([
    hasPoint
      ? scanCompetitors(type.searchTerm, profile.latitude!, profile.longitude!, radiusMiles).catch(() => null)
      : Promise.resolve(null),
    crimeFor(profile, type),
    bdiFor(profile, radiusMiles),
    marketFor(profile),
  ]);

  const evidence: OpportunityEvidence = {
    ons: profile,
    competition,
    crime,
    businessDiversity,
    companiesHouse,
    property: null,
    accessibility: null,
  };

  const demand = buildDemandAssessment(evidence, type, radiusMiles);
  const { categories, overallScore, evidenceGaps, sources } = buildScores(evidence, type, radiusMiles, demand);
  const confidence = assessConfidence(sources, categories, evidence);
  const verdict = deriveVerdict(overallScore, confidence, categories);

  const base: OpportunityAnalysis = {
    version: 1,
    id: null,
    timestamp: new Date().toISOString(),
    businessType: { key: type.key, label: type.label, rationale: type.rationale },
    businessName: input.businessName ?? null,
    location: {
      displayName: profile.displayName,
      postcode: profile.postcode,
      latitude: profile.latitude,
      longitude: profile.longitude,
      radiusMiles,
      geography: `${profile.primaryGeography.name} (${profile.primaryGeography.level.replace(/_/g, " ")})`,
    },
    evidence,
    sources,
    categories,
    overallScore,
    demand,
    confidence,
    verdict,
    evidenceGaps,
    interpretation: {
      verdictRationale: verdict.reason,
      strengths: [],
      risks: [],
      opportunities: [],
      investigateNext: [],
      recommendedAction: verdict.conditions[0] ?? "",
      confidenceExplanation: confidence.reason,
      whatWouldFoundrDo: "",
      generatedBy: "rules",
    },
    alternatives: [],
    methodology: METHODOLOGY,
  };

  const [interpretation, alternatives] = await Promise.all([
    input.interpret === false ? Promise.resolve(base.interpretation) : interpretAnalysis(base),
    input.includeAlternatives && hasPoint
      ? findAlternatives(profile.latitude!, profile.longitude!, type, overallScore, radiusMiles).catch(() => [])
      : Promise.resolve([]),
  ]);

  return { ...base, interpretation, alternatives };
}
