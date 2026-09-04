// Deterministic scoring engine.
//
// DATA → NORMALISATION → DETERMINISTIC SCORING → OPPORTUNITY SCORE
//
// Pure functions only: no network, no database, no AI. The same inputs always
// produce the same score, and every category explains itself. Categories with
// no verified evidence are excluded and their weight is redistributed across
// the rest — never filled with an estimate.

import { INDICATOR_BY_KEY, type BusinessTypeDef, type IndicatorKey } from "../ons/business-relevance";
import { weightsFor, CATEGORY_LABELS } from "./weights";
import type {
  CategoryDataPoint,
  CategoryKey,
  CategoryScore,
  DemandAssessment,
  EvidenceSource,
  OpportunityEvidence,
  Reading,
} from "./types";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function reading(score: number): Reading {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function indicatorScore(key: IndicatorKey, value: number): number {
  return clamp((value / INDICATOR_BY_KEY[key].strongAt) * 100);
}

interface Built {
  categories: CategoryScore[];
  overallScore: number | null;
  evidenceGaps: string[];
  sources: EvidenceSource[];
}

export function buildScores(
  evidence: OpportunityEvidence,
  type: BusinessTypeDef,
  radiusMiles: number,
  demand?: DemandAssessment | null,
): Built {
  const weights = weightsFor(type.key);
  const gaps: string[] = [];
  const raw: Array<Omit<CategoryScore, "weight"> & { rawWeight: number }> = [];

  const push = (
    key: CategoryKey,
    score: number,
    sources: string[],
    dataPoints: CategoryDataPoint[],
    interpretation: string,
    limitations: string | null,
  ) => {
    const rawWeight = weights[key] ?? 0;
    if (rawWeight <= 0) return;
    raw.push({
      key,
      label: CATEGORY_LABELS[key],
      score: clamp(score),
      reading: reading(clamp(score)),
      sources,
      dataPoints,
      interpretation,
      limitations,
      rawWeight,
    });
  };

  // --- ONS-backed categories ------------------------------------------------
  const profile = evidence.ons;

  const weighted = (keys: IndicatorKey[]): { score: number; points: CategoryDataPoint[] } | null => {
    let total = 0;
    let weightSum = 0;
    const points: CategoryDataPoint[] = [];
    for (const key of keys) {
      const w = type.weights[key];
      if (!w || !profile) continue;
      const def = INDICATOR_BY_KEY[key];
      const value = def.read(profile);
      if (value === null) continue;
      total += indicatorScore(key, value) * w;
      weightSum += w;
      points.push({
        label: def.label,
        value: `${value.toLocaleString()} ${def.unit}`,
        source: "ONS Census 2021 / ASHE",
      });
    }
    return weightSum > 0 ? { score: Math.round(total / weightSum), points } : null;
  };

  if (profile) {
    const demand = weighted(["population", "density"]);
    if (demand) {
      push(
        "demand",
        demand.score,
        ["ONS Census 2021"],
        demand.points,
        `How many people live in the immediate catchment around ${profile.displayName}, and how tightly packed they are. Scored against Found-r benchmarks for a ${type.label.toLowerCase()}.`,
        "Resident population only. It does not include workers, commuters or visitors passing through.",
      );
    } else {
      gaps.push("Catchment population figures were unavailable for this area.");
    }

    const demo = weighted(["under16", "youngAdults", "workingAge", "over65", "familiesWithChildren", "onePersonHouseholds"]);
    if (demo) {
      push(
        "demographics",
        demo.score,
        ["ONS Census 2021"],
        demo.points,
        `Weighted towards the age and household groups most relevant to a ${type.label.toLowerCase()}. ${type.rationale}`,
        "Census 2021 is a point-in-time count; the local mix may have shifted since.",
      );
    } else {
      gaps.push("Age and household breakdowns were unavailable for this area.");
    }

    const econ = weighted(["employment", "pay"]);
    if (econ) {
      push(
        "economy",
        econ.score,
        ["ONS Census 2021", "ONS ASHE"],
        econ.points,
        "Local employment levels and median resident earnings, as a read on spending capacity.",
        "Pay is published for the local authority and is individual earnings, not household income.",
      );
    } else {
      gaps.push("Employment and earnings data were unavailable for this area.");
    }

    const fit = weighted(["pay", "population", "workingAge"]);
    if (fit) {
      push(
        "businessFit",
        fit.score,
        ["ONS Census 2021", "ONS ASHE", "Found-r model"],
        fit.points,
        `A modelled read of how the local profile lines up with the typical requirements of a ${type.label.toLowerCase()}.`,
        "This is a Found-r model, not a published statistic or a proven relationship.",
      );
    }
  } else {
    gaps.push("ONS data could not be retrieved for this location, so demand, demographics and economic environment are not scored.");
  }

  // --- Competition (Google Places) -----------------------------------------
  const comp = evidence.competition;
  if (comp) {
    const perMile = comp.count / Math.max(0.5, comp.radiusMiles);
    const score = clamp(100 - perMile * 9 - comp.strongCount * 4);
    push(
      "competition",
      score,
      ["Google Places"],
      [
        { label: "Comparable businesses nearby", value: `${comp.count} within ${comp.radiusMiles} miles`, source: "Google Places" },
        { label: "Highly rated (4.3+)", value: `${comp.strongCount}`, source: "Google Places" },
      ],
      comp.count === 0
        ? "No comparable businesses were found nearby. That can mean open headroom, or that the location does not support this type of business — worth checking on the ground."
        : `${comp.count} comparable businesses trade within ${comp.radiusMiles} miles, ${comp.strongCount} of them highly rated. Some competition signals real demand; density reduces headroom.`,
      "Google Places lists businesses that maintain a listing. Very new or listing-less businesses may be missing.",
    );
  } else {
    gaps.push("The competitor scan did not return results, so competitive density is not scored.");
  }

  // --- Crime (police.uk) ----------------------------------------------------
  const crime = evidence.crime;
  if (crime) {
    const c = crime.profile;
    push(
      "crime",
      crime.risk.score,
      ["Police.uk street-level crime data (Home Office)", "Found-r model"],
      [
        { label: "Recorded offences", value: `${c.totalCrimes.toLocaleString()} over ${c.monthsReturned} months (${c.windowLabel})`, source: "Home Office / police.uk" },
        { label: "Monthly average", value: `${c.averagePerMonth} a month within ${c.radiusMiles} mile`, source: "Home Office / police.uk" },
        ...(c.benchmark
          ? [{ label: "Benchmark", value: `Higher than ${c.benchmark.percentile}% of ${c.benchmark.comparedWith} Found-r reference areas`, source: "Found-r model" }]
          : []),
      ],
      `Recorded crime is weighted for the offence types that matter most to a ${type.label.toLowerCase()}. ${
        c.benchmark
          ? `Weighted crime load here is ${c.benchmark.percentile >= 50 ? "above" : "below"} the middle of Found-r's reference areas.`
          : "No benchmark comparison was available for this window."
      } Counts are police-recorded fact; the weighting and score are a Found-r model.`,
      "Street-level data is published to an anonymised point near the incident, and covers a roughly one-mile radius.",
    );
  } else {
    gaps.push("Police-recorded crime data was unavailable for this point.");
  }

  // --- Business ecosystem (BDI) --------------------------------------------
  const bdi = evidence.businessDiversity;
  if (bdi) {
    push(
      "ecosystem",
      bdi.result.overall,
      ["Google Places", "Found-r Business Diversity Index"],
      [
        { label: "Business Diversity Index", value: `${bdi.result.overall}/100 (${bdi.result.band})`, source: "Found-r model" },
        { label: "Businesses sampled", value: `${bdi.result.sampleSize} within ${bdi.radiusMiles} miles`, source: "Google Places" },
        ...bdi.result.sectorMix.slice(0, 3).map((s) => ({
          label: `${s.sector} mix`,
          value: `${Math.round(s.share * 100)}% of nearby businesses`,
          source: "Google Places",
        })),
      ],
      `The surrounding trading environment: sector diversity, concentration, independents versus chains, essential services and evening economy. A varied, active parade usually supports a ${type.label.toLowerCase()} better than a single-use street.`,
      "Built from businesses with a Google listing; vacancy and rent are not part of this reading.",
    );
  } else {
    gaps.push("The surrounding business mix could not be sampled, so the ecosystem reading is unavailable.");
  }

  // --- Business market dynamics (Companies House) --------------------------
  const ch = evidence.companiesHouse;
  if (ch) {
    // Formation and survival balance, normalised deterministically.
    const churnBase = ch.incorporated12m + ch.dissolved12m;
    const formationShare = churnBase > 0 ? ch.incorporated12m / churnBase : 0.5;
    const netRate = ch.activeCount > 0 ? ch.netChange12m / ch.activeCount : 0;
    const score = clamp(50 + (formationShare - 0.5) * 80 + netRate * 200);
    push(
      "marketDynamics",
      score,
      ["Companies House"],
      [
        { label: "Active businesses", value: `${ch.activeCount.toLocaleString()}`, source: "Companies House" },
        { label: "Incorporated in last 12 months", value: `+${ch.incorporated12m.toLocaleString()}`, source: "Companies House" },
        { label: "Dissolved in last 12 months", value: `-${ch.dissolved12m.toLocaleString()}`, source: "Companies House" },
        { label: "Net change (12 months)", value: `${ch.netChange12m >= 0 ? "+" : ""}${ch.netChange12m.toLocaleString()}`, source: "Companies House" },
      ],
      `${ch.netChange12m >= 0 ? "More businesses were incorporated than dissolved" : "More businesses were dissolved than incorporated"} in ${ch.areaLabel} over the last 12 months. Formation and closure patterns describe how the local business base is moving; they do not measure trading performance.`,
      ch.caveat,
    );
  } else {
    gaps.push("Companies House business-formation data was not available for this area.");
  }

  // --- Integration points with no reliable source connected ----------------
  gaps.push("Commercial rent and premises cost data is not connected, so premises affordability is not assessed or scored.");
  gaps.push("Measured footfall and accessibility data is not connected, so passing trade is not assessed or scored.");

  if (raw.length === 0) {
    return { categories: [], overallScore: null, evidenceGaps: gaps, sources: buildSources(evidence, radiusMiles) };
  }

  const weightSum = raw.reduce((s, c) => s + c.rawWeight, 0);
  const categories: CategoryScore[] = raw
    .map(({ rawWeight, ...c }) => ({ ...c, weight: Math.round((rawWeight / weightSum) * 100) }))
    .sort((a, b) => b.weight - a.weight);
  const overallScore = Math.round(
    raw.reduce((s, c) => s + c.score * c.rawWeight, 0) / weightSum,
  );

  return { categories, overallScore, evidenceGaps: gaps, sources: buildSources(evidence, radiusMiles) };
}

export function buildSources(evidence: OpportunityEvidence, radiusMiles: number): EvidenceSource[] {
  const p = evidence.ons;
  const crime = evidence.crime;
  const bdi = evidence.businessDiversity;
  const ch = evidence.companiesHouse;

  return [
    {
      key: "ons",
      label: "Population, demographics & earnings",
      status: p ? (p.unavailable.length > 0 ? "partial" : "available") : "unavailable",
      source: "Office for National Statistics",
      sourceUrl: "https://www.ons.gov.uk/",
      referencePeriod: p?.population?.referencePeriod ?? null,
      retrievedAt: p?.retrievedAt ?? null,
      note: p
        ? `${p.primaryGeography.name} (${p.primaryGeography.level.replace("_", " ")})${p.unavailable.length ? ` · ${p.unavailable.length} metric(s) unavailable` : ""}`
        : "ONS data could not be retrieved for this location.",
    },
    {
      key: "googlePlaces",
      label: "Competitors nearby",
      status: evidence.competition ? "available" : "unavailable",
      source: "Google Places",
      sourceUrl: "https://developers.google.com/maps/documentation/places",
      referencePeriod: "Live listing data",
      retrievedAt: null,
      note: evidence.competition
        ? `${evidence.competition.count} comparable businesses within ${evidence.competition.radiusMiles} miles`
        : "The competitor scan was unavailable.",
    },
    {
      key: "crime",
      label: "Recorded crime",
      status: crime ? "available" : "unavailable",
      source: "Home Office street-level crime data (police.uk)",
      sourceUrl: "https://data.police.uk/docs/method/crime-street/",
      referencePeriod: crime?.profile.windowLabel ?? null,
      retrievedAt: crime?.profile.retrievedAt ?? null,
      note: crime
        ? `${crime.profile.totalCrimes.toLocaleString()} offences within ${crime.profile.radiusMiles} mile`
        : "No published crime data was returned for this point.",
    },
    {
      key: "businessDiversity",
      label: "Business ecosystem (BDI)",
      status: bdi ? "available" : "unavailable",
      source: "Found-r Business Diversity Index, built from Google Places",
      sourceUrl: null,
      referencePeriod: "Live listing data",
      retrievedAt: bdi?.retrievedAt ?? null,
      note: bdi ? `${bdi.result.sampleSize} businesses sampled within ${bdi.radiusMiles} miles` : "The business mix could not be sampled.",
    },
    {
      key: "companiesHouse",
      label: "Business market dynamics",
      status: ch ? "available" : "unavailable",
      source: "Companies House public data API",
      sourceUrl: "https://developer.company-information.service.gov.uk/",
      referencePeriod: ch ? "Rolling 12 and 36 months" : null,
      retrievedAt: ch?.retrievedAt ?? null,
      note: ch
        ? `${ch.activeCount.toLocaleString()} active businesses registered in ${ch.areaLabel}`
        : "Companies House is not connected for this project, so business formation and closure figures are unavailable. No estimate has been substituted.",
    },
    {
      key: "property",
      label: "Commercial rent & premises",
      status: "unavailable",
      source: "Not connected",
      sourceUrl: null,
      referencePeriod: null,
      retrievedAt: null,
      note: `Found-r has no verified commercial rent source for a ${radiusMiles} mile radius, so premises affordability is excluded from the score rather than estimated.`,
    },
    {
      key: "accessibility",
      label: "Footfall & accessibility",
      status: "unavailable",
      source: "Not connected",
      sourceUrl: null,
      referencePeriod: null,
      retrievedAt: null,
      note: "Found-r does not measure footfall. Catchment population is used as a proxy for market size and is labelled as such.",
    },
  ];
}
