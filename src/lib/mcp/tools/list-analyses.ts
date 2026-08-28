import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_opportunity_analyses",
  title: "List opportunity analyses",
  description:
    "List the signed-in user's saved Found-r location opportunity analyses (location, business type, score, confidence, verdict).",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("How many analyses to return (default 20).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("location_analyses")
      .select("id, display_name, business_type, overall_score, confidence_score, verdict, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: rows.length ? JSON.stringify(rows, null, 2) : "No saved analyses yet." }],
      structuredContent: { analyses: rows },
    };
  },
});
