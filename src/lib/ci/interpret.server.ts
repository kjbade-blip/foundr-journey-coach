// AI interpretation for a single detected change.
//
// Cost control: this runs only when a user asks "What should I do?" (or for a
// critical change during a scan) and the result is cached on the change row,
// so identical insights are never regenerated.

import type { ChangeInterpretation } from "./types";

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = `You are Found-r's competitive analyst for UK small business owners. Found-r's promise is "Clarity Before Commitment".

RULES — absolute:
- You are an INTERPRETER of observed data. Never invent revenue, customer numbers, pricing, footfall, growth or performance figures.
- Only reference the figures supplied. If something is not supplied, say Found-r does not hold it.
- Separate what was OBSERVED from your READING of it. Hedge every inference: "suggests", "may", "appears".
- Never state a business will succeed or fail.
- British English. Practical, calm, specific. No hype.

Reply with JSON only:
{"whatThisMeans":string,"whyItMatters":string,"whatYouCouldDo":string[]}
whatThisMeans: 1-2 sentences explaining the change in plain English.
whyItMatters: 1-2 sentences on potential relevance to this owner's business, hedged.
whatYouCouldDo: 3-5 short practical actions, each starting with a verb, phrased as considerations.`;

export interface ChangeContext {
  businessName: string;
  businessType: string;
  competitorName: string | null;
  competitorStatus: string | null;
  distanceLabel: string;
  kind: string;
  severity: string;
  title: string;
  detail: string;
  metrics: Record<string, unknown>;
}

export function rulesInterpretation(ctx: ChangeContext): ChangeInterpretation {
  const who = ctx.competitorName ?? "A business in your area";
  return {
    whatThisMeans: `${ctx.detail} This is observed data from Google Places, not an assessment of how that business is performing.`,
    whyItMatters:
      ctx.competitorStatus === "tracked" || ctx.competitorStatus === "user_added"
        ? `${who} is one of the competitors you chose to track, ${ctx.distanceLabel} from ${ctx.businessName}, so changes here may affect the same customers you serve.`
        : `${who} sits ${ctx.distanceLabel} from ${ctx.businessName}. It may compete for some of the same customers, though Found-r cannot confirm overlap.`,
    whatYouCouldDo: [
      "Review their current positioning and pricing in person or online.",
      "Read their most recent customer reviews to see what is being praised.",
      "Identify services or hours they do not appear to offer.",
      "Consider whether your own proposition still reads as clearly different.",
    ],
    generatedBy: "rules",
  };
}

export async function interpretChange(ctx: ChangeContext): Promise<ChangeInterpretation> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return rulesInterpretation(ctx);
  try {
    const user = [
      `Owner's business: ${ctx.businessName} (${ctx.businessType}).`,
      `Change type: ${ctx.kind} (${ctx.severity}).`,
      `Competitor: ${ctx.competitorName ?? "not competitor-specific"} — status: ${ctx.competitorStatus ?? "n/a"}, distance: ${ctx.distanceLabel}.`,
      `Observed: ${ctx.title}. ${ctx.detail}`,
      `Observed metrics: ${JSON.stringify(ctx.metrics)}`,
      "Found-r holds no revenue, footfall, pricing or customer-count data for this competitor. Do not estimate any.",
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`[CI] AI interpretation failed [${res.status}]: ${await res.text()}`);
      return rulesInterpretation(ctx);
    }
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = j.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<ChangeInterpretation>;
    const fb = rulesInterpretation(ctx);
    return {
      whatThisMeans: typeof parsed.whatThisMeans === "string" ? parsed.whatThisMeans : fb.whatThisMeans,
      whyItMatters: typeof parsed.whyItMatters === "string" ? parsed.whyItMatters : fb.whyItMatters,
      whatYouCouldDo:
        Array.isArray(parsed.whatYouCouldDo) && parsed.whatYouCouldDo.every((x) => typeof x === "string") && parsed.whatYouCouldDo.length
          ? (parsed.whatYouCouldDo as string[])
          : fb.whatYouCouldDo,
      generatedBy: "ai",
    };
  } catch (error) {
    console.error("[CI] AI interpretation error:", error);
    return rulesInterpretation(ctx);
  }
}
