// Verdict derivation — deterministic, from the score, the confidence and the
// weakest categories. The AI explains the verdict; it never chooses it.

import type { CategoryScore, ConfidenceAssessment, Verdict } from "./types";

export function deriveVerdict(
  overall: number | null,
  confidence: ConfidenceAssessment,
  categories: CategoryScore[],
): Verdict {
  if (overall === null) {
    return {
      key: "not_yet",
      label: "Not enough evidence",
      tone: "bad",
      reason: "Found-r could not retrieve enough published data for this location to score it. No verdict has been modelled from guesswork.",
      conditions: ["Try a nearby postcode or town centre", "Check the location is in England, Scotland or Wales"],
    };
  }

  const weak = categories.filter((c) => c.score < 45).sort((a, b) => b.weight - a.weight);
  const conditions = weak.slice(0, 3).map((c) => `Resolve the ${c.label.toLowerCase()} concern: ${c.interpretation.split(". ")[0]}.`);
  conditions.push("Verify premises cost and passing trade on the ground — Found-r does not hold verified data for either.");

  if (overall >= 70 && confidence.level !== "low" && weak.length === 0) {
    return {
      key: "go",
      label: "Go",
      tone: "good",
      reason: `The evidence points the right way across every category Found-r could score, with an overall ${overall}/100 and ${confidence.level} confidence.`,
      conditions: ["Verify premises cost and passing trade on the ground before committing."],
    };
  }

  if (overall >= 55) {
    return {
      key: "go_with_conditions",
      label: "Go, with conditions",
      tone: "warn",
      reason: `An overall ${overall}/100 with ${confidence.level} confidence. The case is workable, but ${weak.length > 0 ? `${weak.length} categor${weak.length === 1 ? "y is" : "ies are"} scoring poorly` : "some evidence is missing"}.`,
      conditions,
    };
  }

  return {
    key: "not_yet",
    label: "Not yet",
    tone: "bad",
    reason: `An overall ${overall}/100 with ${confidence.level} confidence. On the published evidence, this location does not currently support the case for this business.`,
    conditions,
  };
}
