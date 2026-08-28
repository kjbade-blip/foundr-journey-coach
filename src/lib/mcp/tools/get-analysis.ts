import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_opportunity_analysis",
  title: "Get opportunity analysis",
  description:
    "Fetch one saved Found-r opportunity analysis in full: category scores, evidence, sources, confidence, verdict and interpretation.",
  inputSchema: { id: z.string().uuid().describe("The analysis id from list_opportunity_analyses.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("location_analyses")
      .select("id, analysis")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No analysis found with that id." }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data.analysis, null, 2) }],
      structuredContent: { analysis: data.analysis },
    };
  },
});
