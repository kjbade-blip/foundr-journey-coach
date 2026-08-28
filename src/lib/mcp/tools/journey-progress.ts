import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_journey_progress",
  title: "Get business journey progress",
  description: "Read the signed-in user's progress through the Found-r 11-stage business journey.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("user_journey_stages")
      .select("stage_index, progress, status")
      .order("stage_index");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const stages = data ?? [];
    return {
      content: [{ type: "text", text: stages.length ? JSON.stringify(stages, null, 2) : "No journey progress recorded yet." }],
      structuredContent: { stages },
    };
  },
});
