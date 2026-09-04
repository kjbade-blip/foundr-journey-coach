// AI interpretation layer.
//
// The AI is an INTERPRETER, never a calculator and never a source of figures.
// It receives the finished canonical analysis and returns hedged reading and
// next steps. If the model is unavailable, deterministic rules produce the
// same shape so the product never breaks and never invents data.

import type { OpportunityAnalysis, OpportunityInterpretation } from "./types";

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = `You are Found-r's analyst. Found-r's promise is "Clarity Before Commitment" for first-time UK business owners.

RULES — these are absolute:
- You are an INTERPRETER. Every number has already been calculated. Never calculate, estimate, adjust or invent a figure, percentage or statistic.
- Only reference figures that appear in the supplied analysis. If something is listed as unavailable, say plainly that Found-r does not hold it — never fill the gap.
- Never contradict the supplied score, confidence or verdict. Explain them.
- Separate what is FACT (published data), what is a READING (your inference) and what is an ACTION.
- British English. Direct, warm, honest. No hype, no filler, no "in today's competitive landscape".
- Speak to someone risking their own savings. Be specific and practical.

Reply with JSON only, matching:
{"verdictRationale":string,"strengths":string[],"risks":string[],"opportunities":string[],"investigateNext":string[],"recommendedAction":string,"confidenceExplanation":string,"whatWouldFoundrDo":string}

verdictRationale: 2-3 sentences on why the verdict is what it is.
strengths/risks/opportunities: 2-4 items each, one sentence, each grounded in a supplied figure.
investigateNext: 3-4 concrete things to check that Found-r cannot answer.
recommendedAction: one sentence, the single next step.
confidenceExplanation: one or two sentences in plain English about how solid the evidence is.
whatWouldFoundrDo: 2-3 sentences of frank advice, as an experienced operator would give a friend.`;

function summarise(a: OpportunityAnalysis): string {
  const lines: string[] = [];
  lines.push(`Business type: ${a.businessType.label}`);
  lines.push(`Location: ${a.location.displayName}${a.location.postcode ? ` (${a.location.postcode})` : ""}, ${a.location.radiusMiles} mile radius`);
  lines.push(`Opportunity Score: ${a.overallScore ?? "not scored"}/100`);
  lines.push(`Confidence: ${a.confidence.score}/100 (${a.confidence.level}) — ${a.confidence.reason}`);
  lines.push(`Verdict (already decided): ${a.verdict.label} — ${a.verdict.reason}`);
  lines.push("");
  lines.push("DEMAND INTELLIGENCE (demand and competition are SEPARATE variables — never treat a high competitor count as proof of saturation):");
  lines.push(`- Perceived Demand (ESTIMATE, proxy signals): ${a.demand.demandScore}/100 (${a.demand.demandBand.label})`);
  lines.push(`- Demand confidence: ${a.demand.confidence.level} — ${a.demand.confidence.reason}`);
  lines.push(`- Competition pressure: ${a.demand.competitionScore ?? "not scored"}/100 (${a.demand.competitionLevel ?? "unknown"}). ${a.demand.competitionDetail}`);
  lines.push(`- Market Gap: ${a.demand.marketGapScore ?? "not scored"}/100 — ${a.demand.marketGapLabel}. ${a.demand.capacityNote}`);
  for (const s of a.demand.signals) lines.push(`    SIGNAL ${s.label}: ${s.value} [${s.source}]`);
  lines.push("");
  lines.push("CATEGORY SCORES (Found-r model, deterministic):");
  for (const c of a.categories) {
    lines.push(`- ${c.label}: ${c.score}/100, weight ${c.weight}%. ${c.interpretation}`);
    for (const d of c.dataPoints) lines.push(`    FACT ${d.label}: ${d.value} [${d.source}]`);
    if (c.limitations) lines.push(`    LIMIT: ${c.limitations}`);
  }
  lines.push("");
  lines.push("EVIDENCE GAPS (Found-r does NOT hold these — do not estimate them):");
  for (const g of a.evidenceGaps) lines.push(`- ${g}`);
  return lines.join("\n");
}

function rulesFallback(a: OpportunityAnalysis): OpportunityInterpretation {
  const sorted = [...a.categories].sort((x, y) => y.score - x.score);
  const strong = sorted.filter((c) => c.score >= 60).slice(0, 3);
  const weak = [...sorted].reverse().filter((c) => c.score < 50).slice(0, 3);
  return {
    verdictRationale: a.verdict.reason,
    strengths: strong.length
      ? strong.map((c) => `${c.label} scores ${c.score}/100. ${c.interpretation}`)
      : ["No category scored strongly on the evidence Found-r retrieved."],
    risks: weak.length
      ? weak.map((c) => `${c.label} scores ${c.score}/100. ${c.interpretation}`)
      : ["No category scored poorly, but missing evidence remains the main risk."],
    opportunities: a.categories
      .filter((c) => c.key === "competition" && c.score >= 55)
      .map((c) => `Competitive headroom looks workable: ${c.interpretation}`),
    investigateNext: [
      "Get real rent and rates figures for at least three candidate units.",
      "Stand outside the site at your trading hours and count passing trade yourself.",
      "Speak to two nearby independents about their trading pattern.",
      ...a.evidenceGaps.slice(0, 1),
    ],
    recommendedAction: a.verdict.conditions[0] ?? "Verify premises cost and footfall on the ground before committing.",
    confidenceExplanation: a.confidence.reason,
    whatWouldFoundrDo:
      a.verdict.key === "go"
        ? "The published evidence supports this. Found-r would move to premises viewings and firm cost figures, then re-run the analysis with real rent."
        : a.verdict.key === "go_with_conditions"
          ? "Found-r would not rule this out, but would resolve the weak categories above before signing anything. Treat the score as a reason to investigate, not a reason to commit."
          : "Found-r would not commit here on this evidence. Test a nearby location or a different format before spending money on this one.",
    generatedBy: "rules",
  };
}

export async function interpretAnalysis(a: OpportunityAnalysis): Promise<OpportunityInterpretation> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return rulesFallback(a);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: summarise(a) },
        ],
      }),
    });
    if (!res.ok) return rulesFallback(a);
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = j.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<OpportunityInterpretation>;
    const fb = rulesFallback(a);
    const arr = (v: unknown, f: string[]) =>
      Array.isArray(v) && v.every((x) => typeof x === "string") && v.length > 0 ? (v as string[]) : f;
    return {
      verdictRationale: typeof parsed.verdictRationale === "string" ? parsed.verdictRationale : fb.verdictRationale,
      strengths: arr(parsed.strengths, fb.strengths),
      risks: arr(parsed.risks, fb.risks),
      opportunities: arr(parsed.opportunities, fb.opportunities),
      investigateNext: arr(parsed.investigateNext, fb.investigateNext),
      recommendedAction: typeof parsed.recommendedAction === "string" ? parsed.recommendedAction : fb.recommendedAction,
      confidenceExplanation:
        typeof parsed.confidenceExplanation === "string" ? parsed.confidenceExplanation : fb.confidenceExplanation,
      whatWouldFoundrDo: typeof parsed.whatWouldFoundrDo === "string" ? parsed.whatWouldFoundrDo : fb.whatWouldFoundrDo,
      generatedBy: "ai",
    };
  } catch (error) {
    console.error("[Opportunity] AI interpretation failed:", error);
    return rulesFallback(a);
  }
}
