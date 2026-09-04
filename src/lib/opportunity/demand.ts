// Perceived Demand — deterministic, and deliberately independent of how many
// competitors trade nearby.
//
// Found-r must never treat "lots of competitors" as proof of saturation. This
// module produces:
//   demandScore      — estimated local customer demand (proxy signals only)
//   demandConfidence — how much real signal that estimate rests on
//   demandSignals    — every signal, including the ones that were unavailable
//   competitionScore — competitive PRESSURE (higher = more competition)
//   capacityScore    — null until a verified capacity source is connected
//   marketGapScore   — demand relative to observed supply pressure
//
// It is an ESTIMATE built from proxies. No search volume, booking count or
// customer number is ever invented. Any signal we cannot observe is recorded
// as unavailable and its weight is redistributed across the rest.

import { INDICATOR_BY_KEY, type BusinessTypeDef, type IndicatorKey } from "../ons/business-relevance";
import type { CompetitorScan } from "../ons/competition.server";
import type {
  DemandAssessment,
  DemandBand,
  DemandSignal,
  MarketGapKey,
  OpportunityEvidence,
} from "./types";

export const DEMAND_SCORE_VERSION = 1;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function demandBand(score: number): DemandBand {
  if (score >= 80) return { key: "very_high", label: "Very High", tone: "good" };
  if (score >= 60) return { key: "high", label: "High", tone: "good" };
  if (score >= 40) return { key: "moderate", label: "Moderate", tone: "warn" };
  if (score >= 20) return { key: "low", label: "Low", tone: "bad" };
  return { key: "very_low", label: "Very Low", tone: "bad" };
}

export function competitionBand(score: number): "High" | "Moderate" | "Low" {
  if (score >= 66) return "High";
  if (score >= 33) return "Moderate";
  return "Low";
}

/** Signal weights. Add new sources here — the UI needs no change. */
const SIGNAL_WEIGHTS = {
  catchment: 28,
  categoryRelevance: 24,
  revealedInterest: 18,
  spendingCapacity: 16,
  tradingEnvironment: 8,
  marketFormation: 6,
} as const;

type SignalKey = keyof typeof SIGNAL_WEIGHTS;

/** Guards against any non-numeric read: a bad signal is dropped, never guessed. */
function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function indicatorScore(key: IndicatorKey, value: number): number {
  const strongAt = INDICATOR_BY_KEY[key].strongAt;
  if (!strongAt || !Number.isFinite(strongAt)) return clamp(value);
  return clamp((value / strongAt) * 100);
}

function weightedIndicators(
  keys: IndicatorKey[],
  type: BusinessTypeDef,
  evidence: OpportunityEvidence,
): number | null {
  const profile = evidence.ons;
  if (!profile) return null;
  let total = 0;
  let weightSum = 0;
  for (const key of keys) {
    const w = type.weights[key];
    if (!w) continue;
    const value = finiteOrNull(INDICATOR_BY_KEY[key].read(profile));
    if (value === null) continue;
    total += indicatorScore(key, value) * w;
    weightSum += w;
  }
  return weightSum > 0 ? finiteOrNull(Math.round(total / weightSum)) : null;
}

/**
 * Competitive PRESSURE, 0-100. Higher means a more crowded market. This is a
 * supply-side reading only — it never feeds the demand score.
 */
export function competitionPressure(comp: CompetitorScan | null): number | null {
  if (!comp) return null;
  const perMile = comp.count / Math.max(0.5, comp.radiusMiles);
  return clamp(perMile * 9 + comp.strongCount * 4);
}

function marketGap(
  demand: number,
  pressure: number | null,
): { score: number | null; key: MarketGapKey; label: string; interpretation: string } {
  if (pressure === null) {
    return {
      score: null,
      key: "unknown",
      label: "Not assessed",
      interpretation:
        "The competitor scan returned no usable results, so Found-r cannot compare demand against local supply. No market gap has been estimated.",
    };
  }

  const score = clamp(50 + (demand - pressure) * 0.55);
  const highDemand = demand >= 60;
  const compLevel = competitionBand(pressure);

  if (highDemand && compLevel === "Low") {
    return {
      score,
      key: "strong",
      label: "Strong opportunity",
      interpretation:
        "Demand indicators are strong and few comparable businesses trade nearby. On these signals the market looks under-served rather than crowded.",
    };
  }
  if (highDemand && compLevel === "Moderate") {
    return {
      score,
      key: "potential",
      label: "Potential opportunity",
      interpretation:
        "Demand indicators are strong against a moderate level of competition. There may be room for another operator, subject to checking how busy existing businesses actually are.",
    };
  }
  if (highDemand) {
    return {
      score,
      key: "competitive",
      label: "Competitive, potentially underserved",
      interpretation:
        "Although competition is high, demand indicators are also strong. This suggests the market may be competitive rather than saturated. Whether there is genuine room depends on how much of that demand existing businesses can absorb — which Found-r cannot measure.",
    };
  }
  if (compLevel === "High") {
    return {
      score,
      key: "saturation_risk",
      label: "Saturation risk",
      interpretation:
        "Demand indicators are weak while a large number of comparable businesses already trade nearby. On these signals there is a real risk the market is over-supplied.",
    };
  }
  return {
    score,
    key: "weak",
    label: "Weak or uncertain",
    interpretation:
      "Neither demand nor competition is strong here. That usually means a thin market rather than an untapped one, and needs on-the-ground validation before anything else.",
  };
}

export function buildDemandAssessment(
  evidence: OpportunityEvidence,
  type: BusinessTypeDef,
  radiusMiles: number,
): DemandAssessment {
  const profile = evidence.ons;
  const comp = evidence.competition;
  const signals: DemandSignal[] = [];

  const add = (
    key: SignalKey,
    label: string,
    score: number | null,
    value: string,
    source: string,
    note: string,
  ) => {
    const safe = finiteOrNull(score);
    signals.push({
      key,
      label,
      available: safe !== null,
      score: safe,
      weight: SIGNAL_WEIGHTS[key],
      value,
      source,
      note,
    });
  };

  // 1. Catchment size — how many people are within reach.
  const catchment = weightedIndicators(["population", "density"], type, evidence);
  add(
    "catchment",
    "Local population & density",
    catchment,
    profile?.population?.value != null
      ? `${profile.population.value.toLocaleString()} residents in ${profile.primaryGeography.name}`
      : "Not available",
    "ONS Census 2021",
    "Resident population only — workers, commuters and visitors are not counted.",
  );

  // 2. How relevant the local population is to this business type.
  const relevance = weightedIndicators(
    ["under16", "youngAdults", "workingAge", "over65", "familiesWithChildren", "onePersonHouseholds"],
    type,
    evidence,
  );
  add(
    "categoryRelevance",
    "Target demographic fit",
    relevance,
    relevance === null ? "Not available" : `${relevance}/100 match to a ${type.label.toLowerCase()} customer profile`,
    "ONS Census 2021 · Found-r model",
    type.rationale,
  );

  // 3. Revealed interest: how much customer activity nearby businesses attract.
  //    Uses review VOLUME per business, not the number of businesses. A busy
  //    market with heavily reviewed venues indicates people are buying.
  let revealed: number | null = null;
  let revealedValue = "Not available";
  if (comp && comp.count > 0) {
    const reviews = comp.examples.reduce((s, e) => s + (e.reviews ?? 0), 0);
    const rated = comp.examples.filter((e) => e.reviews != null).length;
    if (rated > 0) {
      const avg = reviews / rated;
      revealed = clamp((avg / 400) * 100);
      revealedValue = `${Math.round(avg).toLocaleString()} reviews on average across sampled competitors`;
    }
  } else if (comp) {
    revealedValue = "No comparable businesses were found to measure customer activity";
  }
  add(
    "revealedInterest",
    "Customer activity at comparable businesses",
    revealed,
    revealedValue,
    "Google Places",
    "Review volume is a proxy for customer traffic, not a count of customers. It reflects people who chose to leave a review.",
  );

  // 4. Spending capacity.
  const spend = weightedIndicators(["pay", "employment"], type, evidence);
  add(
    "spendingCapacity",
    "Local spending capacity",
    spend,
    spend === null ? "Not available" : `${spend}/100 against Found-r earnings and employment benchmarks`,
    "ONS ASHE · ONS Census 2021",
    "Median individual earnings for the local authority, not household income.",
  );

  // 5. Trading environment vitality.
  const bdi = evidence.businessDiversity?.result.overall ?? null;
  add(
    "tradingEnvironment",
    "Trading environment vitality",
    bdi,
    bdi === null ? "Not available" : `Business Diversity Index ${bdi}/100`,
    "Found-r BDI, built from Google Places",
    "A varied, active trading area tends to draw more customer trips than a single-use street.",
  );

  // 6. Market formation momentum.
  const ch = evidence.companiesHouse;
  const formation =
    ch && ch.incorporated12m + ch.dissolved12m > 0
      ? clamp((ch.incorporated12m / (ch.incorporated12m + ch.dissolved12m)) * 100)
      : null;
  add(
    "marketFormation",
    "Business formation momentum",
    formation,
    formation === null
      ? "Not available"
      : `${ch!.incorporated12m.toLocaleString()} incorporated vs ${ch!.dissolved12m.toLocaleString()} dissolved in the last 12 months`,
    "Companies House",
    "All sectors combined, registered-office based. It is not specific to this business type.",
  );

  // --- Composite -----------------------------------------------------------
  const usable = signals.filter((s) => s.score !== null);
  const weightSum = usable.reduce((s, x) => s + x.weight, 0);
  const score = weightSum > 0 ? clamp(usable.reduce((s, x) => s + x.score! * x.weight, 0) / weightSum) : 0;

  // Confidence: how much of the intended signal weight was actually observed,
  // and whether the strongest sources were among them.
  const coverage = weightSum / Object.values(SIGNAL_WEIGHTS).reduce((a, b) => a + b, 0);
  const hasOns = signals.find((s) => s.key === "catchment")?.available ?? false;
  const hasRevealed = signals.find((s) => s.key === "revealedInterest")?.available ?? false;
  const availableCount = usable.length;

  let level: DemandAssessment["confidence"]["level"];
  if (coverage >= 0.75 && hasOns && hasRevealed && availableCount >= 4) level = "high";
  else if (coverage >= 0.45 && availableCount >= 2) level = "medium";
  else level = "low";

  const missing = signals.filter((s) => !s.available).map((s) => s.label);
  const confidenceReason =
    level === "high"
      ? "Several independent demand signals were available, including population data and observed customer activity at comparable businesses."
      : level === "medium"
        ? `Some meaningful demand signals were available, but gaps remain${missing.length ? `: ${missing.join(", ")}` : ""}.`
        : `This estimate rests mainly on proxy data. Unavailable: ${missing.length ? missing.join(", ") : "most demand signals"}.`;

  const pressure = competitionPressure(comp);
  const gap = marketGap(score, pressure);
  const band = demandBand(score);

  const capacityNote =
    "Capacity data unavailable — market gap is estimated from demand and competition signals. Found-r has no verified source for how many customers existing businesses can actually serve, and competitor count is not treated as capacity.";

  const interpretation =
    pressure === null
      ? `Perceived demand for a ${type.label.toLowerCase()} around ${evidence.ons?.displayName ?? "this location"} reads ${band.label.toLowerCase()} (${score}/100). No competitor data was returned, so this is a demand-only reading.`
      : `Perceived demand reads ${band.label.toLowerCase()} (${score}/100) against ${competitionBand(pressure).toLowerCase()} competition (${pressure}/100). ${gap.interpretation}`;

  return {
    scoreVersion: DEMAND_SCORE_VERSION,
    calculatedAt: new Date().toISOString(),
    demandScore: score,
    demandBand: band,
    isEstimate: true,
    confidence: { level, reason: confidenceReason, signalCoverage: Math.round(coverage * 100) },
    signals,
    competitionScore: pressure,
    competitionLevel: pressure === null ? null : competitionBand(pressure),
    competitionDetail: comp
      ? `${comp.count} comparable ${comp.count === 1 ? "business" : "businesses"} within ${comp.radiusMiles} ${comp.radiusMiles === 1 ? "mile" : "miles"}, ${comp.strongCount} highly rated.`
      : "The competitor scan returned no usable results.",
    capacityScore: null,
    capacityNote,
    marketGapScore: gap.score,
    marketGapKey: gap.key,
    marketGapLabel: gap.label,
    interpretation,
    methodology: `Perceived Demand is Found-r's estimate of how strong local customer demand may be for a ${type.label.toLowerCase()} within ${radiusMiles} ${radiusMiles === 1 ? "mile" : "miles"}. It combines available local demographic, business, spending and market-activity signals, each weighted and normalised against Found-r benchmarks. Signals that could not be retrieved are excluded and their weight is redistributed — never estimated. It is an estimate, not a direct count of customers, and the number of competitors is never used to calculate it.`,
  };
}
