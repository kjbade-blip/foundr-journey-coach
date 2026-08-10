// AI interpretation of the ONS evidence. The model is given ONLY figures that
// were actually retrieved, and is required to separate fact, inference and
// recommendation. It must never produce a statistic of its own.

import type { LocationProfile } from "./types";
import type { ViabilityScore } from "./viability";
import type { CompetitorScan } from "./competition.server";

export interface Interpretation {
  fact: string[];
  inference: string[];
  recommendation: string[];
}

/** Compact, fact-only view of a profile for prompting or AI context. */
export function profileFacts(profile: LocationProfile): string[] {
  const f: string[] = [];
  const g = `${profile.primaryGeography.name} (${profile.primaryGeography.level.replace("_", " ")})`;
  const add = (label: string, value: number | null | undefined, unit: string, period?: string) => {
    if (value === null || value === undefined) return;
    f.push(`${label}: ${value.toLocaleString()} ${unit} — ${g}${period ? `, ${period}` : ""}`);
  };
  add("Usual resident population", profile.population?.value, "people", profile.population?.referencePeriod);
  add("Population density", profile.populationDensity?.value, "people/km²", profile.populationDensity?.referencePeriod);
  add("Local authority population estimate", profile.populationEstimate?.value, "people", profile.populationEstimate?.referencePeriod);
  add("Population change", profile.populationChange?.value, "% (derived by Found-r)", profile.populationChange?.referencePeriod);
  add("Households", profile.households?.value, "households", profile.households?.referencePeriod);
  add("Median gross weekly pay (full-time residents, earnings not household income)", profile.medianWeeklyPay?.value, "£/week", profile.medianWeeklyPay?.referencePeriod);
  const d = profile.derived;
  const pctLine = (label: string, v: number | null) => v !== null && f.push(`${label}: ${v}% (calculated by Found-r from ONS tables)`);
  pctLine("Under 16", d.under16Pct);
  pctLine("Working age (20–64)", d.workingAgePct);
  pctLine("Aged 65+", d.age65PlusPct);
  pctLine("Employment rate (16+)", d.employmentRatePct);
  pctLine("One-person households", d.onePersonHouseholdPct);
  pctLine("Households with dependent children", d.householdsWithChildrenPct);
  if (d.largestAgeBand) f.push(`Largest age band: ${d.largestAgeBand}`);
  for (const u of profile.unavailable) f.push(`UNAVAILABLE — ${u.metric}: ${u.reason}`);
  return f;
}

function fallback(profile: LocationProfile, businessType: string, score: ViabilityScore): Interpretation {
  const facts = profileFacts(profile).filter((l) => !l.startsWith("UNAVAILABLE")).slice(0, 4);
  return {
    fact: facts,
    inference: [
      `These characteristics describe the size and make-up of the local market around ${profile.displayName}. Demographic data alone does not establish commercial viability for a ${businessType.toLowerCase()}.`,
    ],
    recommendation: [
      score.overall !== null
        ? `Compare this location with two nearby areas before committing, and validate the ${score.categories.find((c) => c.key === "competition") ? "competitor picture" : "local competition"} on the ground.`
        : "Gather more evidence for this location before drawing conclusions.",
    ],
  };
}

export async function interpretForBusiness(
  profile: LocationProfile,
  businessType: string,
  score: ViabilityScore,
  competition: CompetitorScan | null,
): Promise<Interpretation> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return fallback(profile, businessType, score);

  const facts = profileFacts(profile).join("\n");
  const comp = competition
    ? `Google Places found ${competition.count} comparable businesses within ${competition.radiusMiles} miles, ${competition.strongCount} rated 4.3+.`
    : "No competitor scan was available.";

  const system = `You are Found-r's location analyst for UK small businesses.
You may ONLY use the figures supplied. Never invent, estimate or round-trip a statistic.
Return strict JSON: {"fact":[..],"inference":[..],"recommendation":[..]}.
- "fact": 3-5 short restatements of supplied figures, each naming the value.
- "inference": 2-3 sentences on what the evidence may mean for the business type. Use hedged language ("may support", "evidence suggests"). Never claim demographics guarantee success or prove causation.
- "recommendation": 2-3 concrete next validation steps.
If a figure is listed as UNAVAILABLE, say it is unavailable rather than estimating it.`;

  const user = `Business type: ${businessType}
Location: ${profile.displayName}
Primary ONS geography: ${profile.primaryGeography.name} (${profile.primaryGeography.level})
ONS evidence:
${facts}
Competition (Google Places, not ONS): ${comp}
Modelled viability score: ${score.overall ?? "not scored"} / 100`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return fallback(profile, businessType, score);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return fallback(profile, businessType, score);
    const parsed = JSON.parse(content) as Partial<Interpretation>;
    return {
      fact: parsed.fact?.slice(0, 5) ?? [],
      inference: parsed.inference?.slice(0, 3) ?? [],
      recommendation: parsed.recommendation?.slice(0, 3) ?? [],
    };
  } catch (error) {
    console.error("[ONS] interpretation failed:", error);
    return fallback(profile, businessType, score);
  }
}
