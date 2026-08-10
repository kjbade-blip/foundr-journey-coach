// Crime risk model. Pure functions — no network, no database — so the same
// logic runs on the server and can be explained in the UI.
//
// IMPORTANT: police-recorded crime counts are FACT. Everything in this file is
// Found-r's INTERPRETATION of those counts for a business type, and must be
// labelled as modelled wherever it is shown.

import type { CrimeProfile, CrimeRisk, CrimeRiskDriver } from "./types";

export type CrimeWeights = Record<string, number>;

/** Fallback weights, used only if the database weight table is unreachable. */
export const FALLBACK_WEIGHTS: CrimeWeights = {
  "anti-social-behaviour": 1.5,
  "bicycle-theft": 0.5,
  burglary: 2.5,
  "criminal-damage-arson": 2,
  drugs: 0.5,
  "other-theft": 1.5,
  "possession-of-weapons": 1,
  "public-order": 1.5,
  robbery: 2,
  shoplifting: 1.5,
  "theft-from-the-person": 1,
  "vehicle-crime": 1,
  "violent-crime": 2,
  "other-crime": 0.5,
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Weighted crimes per month for a business type. */
export function weightedIndex(profile: CrimeProfile, weights: CrimeWeights): number {
  const total = profile.categories.reduce(
    (sum, c) => sum + c.perMonth * (weights[c.slug] ?? FALLBACK_WEIGHTS[c.slug] ?? 1),
    0,
  );
  return Math.round(total * 10) / 10;
}

// Anchors used only when no benchmark corpus is available yet. A weighted load
// of 20/month or below scores 100; 900/month or above scores 0. Logarithmic,
// because crime load varies by orders of magnitude between a rural high street
// and a major city centre.
const ANCHOR_LOW = 20;
const ANCHOR_HIGH = 900;

function anchorScore(index: number): number {
  if (index <= ANCHOR_LOW) return 100;
  if (index >= ANCHOR_HIGH) return 0;
  const t = Math.log(index / ANCHOR_LOW) / Math.log(ANCHOR_HIGH / ANCHOR_LOW);
  return clamp(100 - t * 100);
}

export function crimeBand(score: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (score >= 70) return { label: "Low measured crime load", tone: "good" };
  if (score >= 45) return { label: "Moderate measured crime load", tone: "warn" };
  return { label: "High measured crime load", tone: "bad" };
}

export function assessCrimeRisk(
  profile: CrimeProfile,
  weights: CrimeWeights,
  businessType: string,
): CrimeRisk {
  const index = weightedIndex(profile, weights);
  const total = profile.categories.reduce(
    (sum, c) => sum + c.perMonth * (weights[c.slug] ?? FALLBACK_WEIGHTS[c.slug] ?? 1),
    0,
  );

  const drivers: CrimeRiskDriver[] = profile.categories
    .map((c) => {
      const weight = weights[c.slug] ?? FALLBACK_WEIGHTS[c.slug] ?? 1;
      return {
        slug: c.slug,
        name: c.name,
        count: c.count,
        perMonth: c.perMonth,
        weight,
        contribution: total > 0 ? Math.round(((c.perMonth * weight) / total) * 1000) / 10 : 0,
        businessRelevance: c.businessRelevance,
      };
    })
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 5);

  const usedBenchmark = profile.benchmark !== null;
  const score = usedBenchmark
    ? clamp(100 - profile.benchmark!.percentile)
    : anchorScore(index);

  const confidence: CrimeRisk["confidence"] =
    profile.monthsReturned >= 10 && usedBenchmark
      ? "high"
      : profile.monthsReturned >= 6
        ? "medium"
        : "low";

  const confidenceReason =
    profile.monthsReturned >= 10
      ? usedBenchmark
        ? `${profile.monthsReturned} months of published data and ${profile.benchmark!.comparedWith} comparison areas measured the same way.`
        : `${profile.monthsReturned} months of published data, but no comparison areas were available, so a fixed Found-r scale was used instead of a percentile.`
      : `Only ${profile.monthsReturned} of the ${profile.monthsRequested} requested months were available from the police data feed, so this reading is less stable than usual.`;

  return {
    score,
    weightedIndex: index,
    band: crimeBand(score),
    drivers,
    confidence,
    confidenceReason,
    method: usedBenchmark
      ? `Each police-recorded crime category is multiplied by how much it matters to a ${businessType.toLowerCase()}, then averaged per month. That weighted figure is ranked against ${profile.benchmark!.comparedWith} Found-r reference areas measured over the same months with the same 1-mile radius. The weights are a Found-r model, not a Home Office measure.`
      : `Each police-recorded crime category is multiplied by how much it matters to a ${businessType.toLowerCase()}, then averaged per month and placed on a fixed Found-r scale. The weights are a Found-r model, not a Home Office measure.`,
    businessType,
    modelled: true,
  };
}
