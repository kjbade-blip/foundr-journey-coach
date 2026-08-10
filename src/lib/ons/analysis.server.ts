// Orchestration for the location-intelligence engine: combines the ONS
// evidence layer with competitor data, Home Office crime data, the viability
// model and AI interpretation.

import { buildLocationProfile } from "./profile.server";
import { scanCompetitors, type CompetitorScan } from "./competition.server";
import { interpretForBusiness, type Interpretation } from "./interpret.server";
import { scoreLocation, type ViabilityScore } from "./viability";
import { BUSINESS_TYPES, matchBusinessType, INDICATOR_BY_KEY, type BusinessTypeDef } from "./business-relevance";
import { buildCrimeProfile } from "../crime/profile.server";
import { assessCrimeRisk } from "../crime/model";
import type { CrimeProfile, CrimeRisk } from "../crime/types";
import type { LocationProfile, OpportunitySuggestion } from "./types";

export interface LocationInput {
  query?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
  forceRefresh?: boolean;
}

export interface CrimeAssessment {
  profile: CrimeProfile;
  risk: CrimeRisk;
}

export interface LocationAnalysis {
  profile: LocationProfile;
  businessType: string;
  score: ViabilityScore;
  competition: CompetitorScan | null;
  crime: CrimeAssessment | null;
  interpretation: Interpretation;
}

/** Crime read for a location, scoped to a business type. Never throws. */
async function crimeFor(
  profile: LocationProfile,
  type: BusinessTypeDef,
): Promise<CrimeAssessment | null> {
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
    console.error("[Crime] profile build failed:", error);
    return null;
  }
}

export async function analyseLocationForBusiness(
  input: LocationInput & { businessType: string; radiusMiles?: number },
): Promise<LocationAnalysis> {
  const profile = await buildLocationProfile(input);
  const type = matchBusinessType(input.businessType) ?? BUSINESS_TYPES[0]!;
  const radius = input.radiusMiles ?? 1;

  const [competition, crime] = await Promise.all([
    profile.latitude !== null && profile.longitude !== null
      ? scanCompetitors(type.searchTerm, profile.latitude, profile.longitude, radius)
      : Promise.resolve(null),
    crimeFor(profile, type),
  ]);

  const score = scoreLocation(profile, type, competition, crime);
  const interpretation = await interpretForBusiness(profile, type.label, score, competition, crime);

  return { profile, businessType: type.label, score, competition, crime, interpretation };
}

export type { OpportunitySuggestion };

/**
 * Rank business types for a location. ONS evidence ranks every type, then the
 * top candidates get a live competitor scan and a crime read, either of which
 * can change the order.
 */
export async function findOpportunities(
  input: LocationInput,
): Promise<{ profile: LocationProfile; opportunities: OpportunitySuggestion[]; crime: CrimeAssessment | null }> {
  const profile = await buildLocationProfile(input);

  const onsRanked = BUSINESS_TYPES.map((type) => ({
    type,
    score: scoreLocation(profile, type, null),
  }))
    .filter((r) => r.score.overall !== null)
    .sort((a, b) => (b.score.overall ?? 0) - (a.score.overall ?? 0))
    .slice(0, 5);

  const opportunities = await Promise.all(
    onsRanked.map(async ({ type }) => {
      const [competition, crime] = await Promise.all([
        profile.latitude !== null && profile.longitude !== null
          ? scanCompetitors(type.searchTerm, profile.latitude, profile.longitude, 1)
          : Promise.resolve(null),
        crimeFor(profile, type),
      ]);
      const withComp = scoreLocation(profile, type, competition, crime);
      const drivers = (Object.keys(type.weights) as Array<keyof typeof type.weights>)
        .slice(0, 3)
        .flatMap((key) => {
          const def = INDICATOR_BY_KEY[key];
          const value = def.read(profile);
          return value === null ? [] : [{ label: def.label, value: `${value.toLocaleString()} ${def.unit}` }];
        });
      return {
        businessType: type.label,
        key: type.key,
        score: withComp.overall ?? 0,
        drivers,
        rationale: type.rationale,
        competition,
        crimeScore: crime?.risk.score ?? null,
      };
    }),
  );

  opportunities.sort((a, b) => b.score - a.score);

  // The crime picture is the same for every business type bar the weighting,
  // so surface the top-ranked type's read alongside the list.
  const top = onsRanked[0];
  const crime = top ? await crimeFor(profile, top.type) : null;

  return { profile, opportunities, crime };
}

export async function compareLocationProfiles(
  queries: string[],
  businessType?: string,
): Promise<{
  profiles: LocationProfile[];
  scores: Array<{ displayName: string; score: ViabilityScore } | null>;
  crime: Array<CrimeAssessment | null>;
  businessType: string | null;
}> {
  const profiles = await Promise.all(queries.map((query) => buildLocationProfile({ query })));
  const type = matchBusinessType(businessType);
  const crime = await Promise.all(
    profiles.map((p) => (type ? crimeFor(p, type) : crimeFor(p, BUSINESS_TYPES[0]!))),
  );
  const scores = type
    ? profiles.map((p, i) => ({
        displayName: p.displayName,
        score: scoreLocation(p, type, null, crime[i] ?? null),
      }))
    : profiles.map(() => null);
  return { profiles, scores, crime, businessType: type?.label ?? null };
}
