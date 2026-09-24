import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STAGES, type StageProgress, type TaskCheck } from "./journey";

type Ctx = { supabase: any; userId: string };

async function syncStage(ctx: Ctx, stageIndex: number) {
  const { data, error } = await ctx.supabase
    .from("user_journey_tasks")
    .select("task_key")
    .eq("user_id", ctx.userId)
    .eq("stage_index", stageIndex);
  if (error) throw new Error(error.message);
  const valid = new Set(STAGES[stageIndex]!.tasks.map((t) => t.key));
  const done = (data ?? []).filter((r: { task_key: string }) => valid.has(r.task_key)).length;
  const progress = valid.size === 0 ? 0 : Math.round((done / valid.size) * 100);
  const status = progress >= 100 ? "complete" : progress > 0 ? "in_progress" : "not_started";
  const { error: e2 } = await ctx.supabase
    .from("user_journey_stages")
    .upsert({ user_id: ctx.userId, stage_index: stageIndex, progress, status }, { onConflict: "user_id,stage_index" });
  if (e2) throw new Error(e2.message);
}

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

export const getJourneyTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TaskCheck[]> => {
    const { data, error } = await context.supabase
      .from("user_journey_tasks")
      .select("stage_index, task_key")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ stageIndex: r.stage_index, taskKey: r.task_key }));
  });

const stageIdx = z.number().int().min(0).max(STAGES.length - 1);

export const setJourneyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ stageIndex: stageIdx, taskKey: z.string().min(1).max(64), checked: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (!STAGES[data.stageIndex]!.tasks.some((t) => t.key === data.taskKey)) throw new Error("Unknown task");
    if (data.checked) {
      const { error } = await context.supabase
        .from("user_journey_tasks")
        .upsert(
          { user_id: context.userId, stage_index: data.stageIndex, task_key: data.taskKey },
          { onConflict: "user_id,stage_index,task_key", ignoreDuplicates: true },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("user_journey_tasks")
        .delete()
        .eq("user_id", context.userId)
        .eq("stage_index", data.stageIndex)
        .eq("task_key", data.taskKey);
      if (error) throw new Error(error.message);
    }
    await syncStage(context, data.stageIndex);
    return { ok: true };
  });

/** Marks a stage complete (checks all its tasks) or incomplete (clears them). */
export const completeJourneyStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ stageIndex: stageIdx, complete: z.boolean().default(true) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (data.complete) {
      const rows = STAGES[data.stageIndex]!.tasks.map((t) => ({
        user_id: context.userId,
        stage_index: data.stageIndex,
        task_key: t.key,
      }));
      if (rows.length) {
        const { error } = await context.supabase
          .from("user_journey_tasks")
          .upsert(rows, { onConflict: "user_id,stage_index,task_key", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
    } else {
      const { error } = await context.supabase
        .from("user_journey_tasks")
        .delete()
        .eq("user_id", context.userId)
        .eq("stage_index", data.stageIndex);
      if (error) throw new Error(error.message);
    }
    await syncStage(context, data.stageIndex);
    return { ok: true };
  });

/** Wipe all saved journey progress for the signed-in user. */
export const resetJourneyProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const a = await context.supabase.from("user_journey_tasks").delete().eq("user_id", context.userId);
    if (a.error) throw new Error(a.error.message);
    const b = await context.supabase.from("user_journey_stages").delete().eq("user_id", context.userId);
    if (b.error) throw new Error(b.error.message);
    return { ok: true };
  });
