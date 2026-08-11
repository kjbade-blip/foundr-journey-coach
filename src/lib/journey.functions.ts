import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StageProgress } from "./journey";

export const getJourneyProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StageProgress[]> => {
    const { data, error } = await context.supabase
      .from("user_journey_stages")
      .select("stage_index, progress, status")
      .order("stage_index");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ stageIndex: r.stage_index, progress: r.progress, status: r.status }));
  });

export const setStageProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ stageIndex: z.number().int().min(0).max(10), progress: z.number().int().min(0).max(100) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<StageProgress> => {
    const status = data.progress >= 100 ? "complete" : data.progress > 0 ? "in_progress" : "not_started";
    const { error } = await context.supabase.from("user_journey_stages").upsert(
      { user_id: context.userId, stage_index: data.stageIndex, progress: data.progress, status },
      { onConflict: "user_id,stage_index" },
    );
    if (error) throw new Error(error.message);
    return { stageIndex: data.stageIndex, progress: data.progress, status };
  });
