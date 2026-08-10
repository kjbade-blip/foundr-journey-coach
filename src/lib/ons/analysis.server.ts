// Orchestration for the location-intelligence engine: combines the ONS
// evidence layer with competitor data, the viability model and AI
// interpretation.

import { buildLocationProfile } from "./profile.server";
import { scanCompetitors, type CompetitorScan } from "./competition.server";
import { interpretForBusiness, type Interpretation } from "./interpret.server";
import { scoreLocation, type ViabilityScore } from "./viability";
import { BUSINESS_TYPES, matchBusinessType, INDICATOR_BY_KEY } from "./business-relevance";
import type { LocationProfile } from "./types";

export interface LocationInput {
  query?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
  forceRefresh?: boolean;
}

export interface LocationAnalysis {
  profile: LocationProfile;
  businessType: string;
  score: ViabilityScore;
  competition: CompetitorScan | null;
  interpretation: Interpretation;
}

export async function analyseLocationForBusiness(
  input: LocationInput & { businessType: string; radiusMiles?: number },
): Promise<LocationAnalysis> {
  const profile = await buildLocationProfile(input);
  const type = matchBusinessType(input.businessType) ?? BUSINESS_TYPES[0]!;
  const radius = input.radiusMiles ?? 1;

  const competition =
    profile.latitude !== null && profile.longitude !== null
      ? await scanCompetitors(type.searchTerm, profile.latitude, profile.longitude, radius)
      : null;

  const score = scoreLocation(profile, type, competition);
  const interpretation = await interpretForBusiness(profile, type.label, score, competition);

  return { profile, businessType: type.label, score, competition, interpretation };
}

export interface OpportunitySuggestion {
  businessType: string;
  key: string;
  score: number;
  drivers: Array<{ label: string; value: string }>;
  rationale: string;
  competition: CompetitorScan | null;
}

/**
 * Rank business types for a location. ONS evidence ranks every type, then the
 * top candidates get a live competitor scan which can change the order.
 */
export async function findOpportunities(
  input: LocationInput,
): Promise<{ profile: LocationProfile; opportunities: OpportunitySuggestion[] }> {
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
      const competition =
        profile.latitude !== null && profile.longitude !== null
          ? await scanCompetitors(type.searchTerm, profile.latitude, profile.longitude, 1)
          : null;
      const withComp = scoreLocation(profile, type, competition);
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
      };
    }),
  );

  opportunities.sort((a, b) => b.score - a.score);
  return { profile, opportunities };
}

export async function compareLocationProfiles(
  queries: string[],
  businessType?: string,
): Promise<{
  profiles: LocationProfile[];
  scores: Array<{ displayName: string; score: ViabilityScore } | null>;
}> {
  const profiles = await Promise.all(queries.map((query) => buildLocationProfile({ query })));
  const type = matchBusinessType(businessType);
  const scores = type
    ? profiles.map((p) => ({ displayName: p.displayName, score: scoreLocation(p, type, null) }))
    : profiles.map(() => null);
  return { profiles, scores };
}
