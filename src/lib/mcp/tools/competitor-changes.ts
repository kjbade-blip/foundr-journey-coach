import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_competitor_changes",
  title: "List competitor changes",
  description:
    "List recent detected competitor changes from Found-r's continuous competitive intelligence for the signed-in user's monitored businesses.",
  inputSchema: { limit: z.number().int().min(1).max(60).optional().describe("How many changes to return (default 25).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("ci_changes")
      .select("id, business_id, competitor_id, kind, title, detail, severity, priority, created_at")
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const changes = data ?? [];
    return {
      content: [{ type: "text", text: changes.length ? JSON.stringify(changes, null, 2) : "No competitor changes recorded." }],
      structuredContent: { changes },
    };
  },
});
