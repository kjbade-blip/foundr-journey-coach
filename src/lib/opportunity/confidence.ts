// Confidence assessment — deliberately separate from the Opportunity Score.
//
// The Opportunity Score answers "how good does this look?".
// Confidence answers "how much evidence is that judgement standing on?".

import type {
  ConfidenceAssessment,
  ConfidenceFactor,
  CategoryScore,
  EvidenceSource,
  OpportunityEvidence,
} from "./types";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Sources that materially change a decision if missing. */
const CORE_SOURCES: Array<{ key: EvidenceSource["key"]; label: string; weight: number }> = [
  { key: "ons", label: "ONS population & demographics", weight: 22 },
  { key: "googlePlaces", label: "Competitor scan", weight: 18 },
  { key: "crime", label: "Police-recorded crime", weight: 10 },
  { key: "businessDiversity", label: "Business ecosystem", weight: 10 },
  { key: "companiesHouse", label: "Business market dynamics", weight: 10 },
  { key: "property", label: "Commercial rent & premises", weight: 8 },
  { key: "accessibility", label: "Footfall & accessibility", weight: 7 },
];

function monthsSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return (Date.now() - then) / (1000 * 60 * 60 * 24 * 30.44);
}

export function assessConfidence(
  sources: EvidenceSource[],
  categories: CategoryScore[],
  evidence: OpportunityEvidence,
): ConfidenceAssessment {
  const factors: ConfidenceFactor[] = [];
  let score = 15; // floor: geography always resolved before scoring is attempted

  const byKey = new Map(sources.map((s) => [s.key, s]));
  const missing: string[] = [];

  for (const core of CORE_SOURCES) {
    const s = byKey.get(core.key);
    if (s?.status === "available") {
      score += core.weight;
      factors.push({ label: core.label, detail: s.note ?? "Available", impact: core.weight });
    } else if (s?.status === "partial") {
      score += Math.round(core.weight * 0.6);
      factors.push({ label: core.label, detail: s.note ?? "Partially available", impact: Math.round(core.weight * 0.6) });
    } else {
      missing.push(core.label);
      factors.push({ label: core.label, detail: s?.note ?? "Unavailable", impact: 0 });
    }
  }

  // Completeness: how much of the model's intended weight was actually scored.
  if (categories.length < 4) {
    score -= 8;
    factors.push({
      label: "Model coverage",
      detail: `Only ${categories.length} of the model's evidence categories could be scored.`,
      impact: -8,
    });
  }

  // Freshness of the crime window.
  const crimeAge = monthsSince(evidence.crime?.profile.retrievedAt ?? null);
  if (evidence.crime && crimeAge !== null && crimeAge > 3) {
    score -= 5;
    factors.push({ label: "Crime data freshness", detail: "Cached crime figures are more than three months old.", impact: -5 });
  }

  // Sample-size consistency on ecosystem evidence.
  const sample = evidence.businessDiversity?.result.sampleSize ?? null;
  if (sample !== null && sample < 25) {
    score -= 5;
    factors.push({ label: "Ecosystem sample size", detail: `Only ${sample} nearby businesses were sampled, so the ecosystem reading is indicative.`, impact: -5 });
  }

  // Crime model's own confidence, where it disagrees.
  if (evidence.crime?.risk.confidence === "low") {
    score -= 4;
    factors.push({ label: "Crime model confidence", detail: evidence.crime.risk.confidenceReason, impact: -4 });
  }

  const final = clamp(score);
  const level = final >= 75 ? "high" : final >= 50 ? "medium" : "low";

  const reason = missing.length
    ? `${missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`} ${missing.length === 1 ? "was" : "were"} unavailable, so the model could not assess ${missing.length === 1 ? "that dimension" : "those dimensions"}. Everything shown is based on the evidence that was retrieved.`
    : "Every evidence source Found-r uses returned data for this location.";

  return { score: final, level, reason, factors };
}
