import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STAGES } from "./journey";
import { BUSINESS_TYPES } from "./ons/business-relevance";

export const BRIEF_KEY = "__brief";

export interface FounderBrief {
  masterPrompt: string;
  missionStatement: string;
  summary: string;
  offer: string;
  targetCustomer: string;
  budgetAndTime: string;
  goals: string;
  nextSteps: string[];
  opportunity: { typeKey: string; location: string | null };
  generatedAt: string;
}

export const getJourneyNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_journey_notes")
      .select("stage_index, task_key, note")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const notes: Record<string, string> = {};
    let brief: FounderBrief | null = null;
    for (const r of data ?? []) {
      if (r.task_key === BRIEF_KEY) {
        try { brief = JSON.parse(r.note); } catch { /* ignore */ }
      } else notes[`${r.stage_index}:${r.task_key}`] = r.note;
    }
    return { notes, brief };
  });

export const saveJourneyNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ stageIndex: z.number().int().min(0).max(STAGES.length - 1), taskKey: z.string().min(1).max(64), note: z.string().max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!STAGES[data.stageIndex]!.tasks.some((t) => t.key === data.taskKey)) throw new Error("Unknown task");
    const { error } = await context.supabase.from("user_journey_notes").upsert(
      { user_id: context.userId, stage_index: data.stageIndex, task_key: data.taskKey, note: data.note, updated_at: new Date().toISOString() },
      { onConflict: "user_id,stage_index,task_key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const SYSTEM = `You are Found-r's Founder Coach ("Clarity Before Commitment") for first-time UK business owners.
From the founder's own notes, produce:
1. masterPrompt: a single, detailed brief (150-250 words) written in second person to an analyst, describing the founder, their idea, budget, time, goals and preferred industries, asking for an opportunity analysis. Use only what the notes say.
2. missionStatement: one or two sentences.
3. A mini business plan: summary, offer, targetCustomer, budgetAndTime, goals (short paragraphs), nextSteps (3-5 items).
4. opportunity.typeKey: the closest key from this list: ${BUSINESS_TYPES.map((t) => `${t.key} (${t.label})`).join(", ")}.
5. opportunity.location: a UK town or postcode if the notes mention one, else null.
RULES: never invent figures, prices or statistics. If the notes don't say something, write "Not stated yet" for that part. British English, warm and direct.`;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["masterPrompt", "missionStatement", "summary", "offer", "targetCustomer", "budgetAndTime", "goals", "nextSteps", "opportunity"],
  properties: {
    masterPrompt: { type: "string" },
    missionStatement: { type: "string" },
    summary: { type: "string" },
    offer: { type: "string" },
    targetCustomer: { type: "string" },
    budgetAndTime: { type: "string" },
    goals: { type: "string" },
    nextSteps: { type: "array", items: { type: "string" } },
    opportunity: {
      type: "object",
      additionalProperties: false,
      required: ["typeKey", "location"],
      properties: {
        typeKey: { type: "string", enum: BUSINESS_TYPES.map((t) => t.key) },
        location: { type: ["string", "null"] },
      },
    },
  },
};

export const generateFounderBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FounderBrief> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured.");
    const { data, error } = await context.supabase
      .from("user_journey_notes")
      .select("task_key, note")
      .eq("user_id", context.userId)
      .eq("stage_index", 0);
    if (error) throw new Error(error.message);
    const byKey = new Map((data ?? []).map((r) => [r.task_key, r.note]));
    const notesText = STAGES[0]!.tasks
      .map((t) => `${t.label}:\n${(byKey.get(t.key) ?? "").trim() || "(no notes)"}`)
      .join("\n\n");
    if (!STAGES[0]!.tasks.some((t) => (byKey.get(t.key) ?? "").trim())) throw new Error("Add some notes first.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: SYSTEM,
        input: `Founder notes (Stage 1: Explore):\n\n${notesText}`,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "founder_brief", strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      if (res.status === 429) throw new Error("Found-r AI is busy — please try again in a minute.");
      if (res.status === 402) throw new Error("AI credits have run out. Add credits in Settings → Plans & credits.");
      throw new Error(`AI request failed (${res.status}).`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          else if (ev.type === "error" || ev.type === "response.failed") throw new Error("AI generation failed.");
        } catch (e) {
          if (e instanceof Error && e.message === "AI generation failed.") throw e;
        }
      }
    }
    let parsed: Omit<FounderBrief, "generatedAt">;
    try { parsed = JSON.parse(text); } catch { throw new Error("AI returned an unreadable answer — please try again."); }
    const brief: FounderBrief = { ...parsed, generatedAt: new Date().toISOString() };
    await context.supabase.from("user_journey_notes").upsert(
      { user_id: context.userId, stage_index: 0, task_key: BRIEF_KEY, note: JSON.stringify(brief), updated_at: brief.generatedAt },
      { onConflict: "user_id,stage_index,task_key" },
    );
    return brief;
  });
