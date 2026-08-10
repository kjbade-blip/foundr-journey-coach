// Location Viability Score.
//
// Transparent, multi-category model. ONS contributes to the demographics,
// population and economic categories only — it can never determine the score
// on its own. Competition and accessibility come from other sources (Google
// Places today, more sources later). Categories with no verified evidence are
// excluded and their weight is redistributed, rather than filled with a guess.

import { INDICATOR_BY_KEY, type BusinessTypeDef, type IndicatorKey } from "./business-relevance";
import type { LocationProfile } from "./types";

export interface CompetitionInput {
  /** Competing businesses of the selected type found nearby. */
  count: number;
  /** Share of those rated 4.3+ (a proxy for strong incumbents). */
  strongCount: number;
  radiusMiles: number;
}

export interface ScoreContribution {
  key: string;
  label: string;
  score: number;
  weight: number;
  /** Which evidence layers fed this category. */
  sources: string[];
  explanation: string;
}

export interface ViabilityScore {
  overall: number | null;
  categories: ScoreContribution[];
  /** Indicators that could not be scored because data was unavailable. */
  missing: string[];
  methodology: string;
  businessType: string;
  modelled: true;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Scale a raw value against the "strong" benchmark for that indicator. */
function indicatorScore(key: IndicatorKey, value: number): number {
  const def = INDICATOR_BY_KEY[key];
  return clamp((value / def.strongAt) * 100);
}

export function scoreLocation(
  profile: LocationProfile,
  businessType: BusinessTypeDef,
  competition: CompetitionInput | null,
): ViabilityScore {
  const missing: string[] = [];

  const weighted = (keys: IndicatorKey[]) => {
    let total = 0;
    let weightSum = 0;
    for (const key of keys) {
      const weight = businessType.weights[key];
      if (!weight) continue;
      const value = INDICATOR_BY_KEY[key].read(profile);
      if (value === null) {
        missing.push(INDICATOR_BY_KEY[key].label);
        continue;
      }
      total += indicatorScore(key, value) * weight;
      weightSum += weight;
    }
    return weightSum > 0 ? Math.round(total / weightSum) : null;
  };

  const categories: ScoreContribution[] = [];

  const demographics = weighted(["under16", "youngAdults", "workingAge", "over65", "familiesWithChildren", "onePersonHouseholds"]);
  if (demographics !== null) {
    categories.push({
      key: "demographics",
      label: "Population & demographics",
      score: demographics,
      weight: 25,
      sources: ["ONS Census 2021"],
      explanation: `Weighted towards the age and household groups most relevant to a ${businessType.label.toLowerCase()}. ${businessType.rationale}`,
    });
  }

  const market = weighted(["population", "density"]);
  if (market !== null) {
    categories.push({
      key: "market",
      label: "Market size & footfall",
      score: market,
      weight: 20,
      sources: ["ONS Census 2021"],
      explanation: "How many people live in the immediate catchment and how tightly packed they are.",
    });
  }

  const economy = weighted(["employment", "pay"]);
  if (economy !== null) {
    categories.push({
      key: "economy",
      label: "Economic environment",
      score: economy,
      weight: 20,
      sources: ["ONS Census 2021", "ONS ASHE"],
      explanation: "Local employment levels and median resident earnings. Earnings are pay, not household income.",
    });
  }

  if (competition) {
    // Some competition signals demand; saturation reduces headroom.
    const perMile = competition.count / Math.max(0.5, competition.radiusMiles);
    const saturation = clamp(100 - perMile * 9 - competition.strongCount * 4);
    categories.push({
      key: "competition",
      label: "Competition headroom",
      score: saturation,
      weight: 25,
      sources: ["Google Places"],
      explanation: `${competition.count} comparable businesses found within ${competition.radiusMiles} miles, ${competition.strongCount} of them highly rated. ONS does not publish competitor-level business data.`,
    });
  } else {
    missing.push("Competitor scan");
  }

  const distinctiveness = weighted(["pay", "population", "workingAge"]);
  if (distinctiveness !== null) {
    categories.push({
      key: "business_fit",
      label: "Business-specific fit",
      score: distinctiveness,
      weight: 10,
      sources: ["ONS Census 2021", "ONS ASHE", "Found-r model"],
      explanation: `A modelled read of how the local profile lines up with the typical requirements of a ${businessType.label.toLowerCase()}.`,
    });
  }

  if (categories.length === 0) {
    return {
      overall: null,
      categories: [],
      missing,
      methodology: "Not enough verified evidence was available to score this location.",
      businessType: businessType.label,
      modelled: true,
    };
  }

  const weightSum = categories.reduce((s, c) => s + c.weight, 0);
  const overall = Math.round(categories.reduce((s, c) => s + c.score * c.weight, 0) / weightSum);

  return {
    overall,
    categories,
    missing,
    methodology:
      "Each category is scored 0–100 against Found-r benchmarks, then combined using the weights shown. Weights reflect which evidence matters most for the selected business type; they are a Found-r model, not a statistically proven relationship. Categories with no verified data are excluded and their weight is shared across the rest, so the score is never propped up by estimated figures.",
    businessType: businessType.label,
    modelled: true,
  };
}

export function scoreBand(score: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (score >= 75) return { label: "Strong indicators", tone: "good" };
  if (score >= 55) return { label: "Mixed indicators", tone: "warn" };
  return { label: "Weak indicators", tone: "bad" };
}
