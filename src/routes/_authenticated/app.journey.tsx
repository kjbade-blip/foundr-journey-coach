import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Pill, Bar } from "@/components/foundr/ui";
import { Switch } from "@/components/ui/switch";
import { Check, Lock, Brain, ChevronRight, BarChart3, Loader2, RotateCcw, Lightbulb, Target, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STAGES, checkedMap, stagePercent, overallPercent, type TaskCheck } from "@/lib/journey";
import { getJourneyTasks, setJourneyTask, completeJourneyStage, resetJourneyProgress } from "@/lib/journey.functions";
import { NoteField, FounderBriefPanel } from "@/components/foundr/JourneyNotes";
import { StageResourcesPanel } from "@/components/foundr/StageResources";

export const Route = createFileRoute("/_authenticated/app/journey")({
  head: () => ({
    meta: [
      { title: "My Journey · Found-r" },
      { name: "description", content: "Eleven guided stages from idea to opening day, with task checklists saved to your account." },
      { property: "og:title", content: "My Journey · Found-r" },
      { property: "og:description", content: "Eleven guided stages from idea to opening day, with task checklists saved to your account." },
    ],
  }),
  component: Journey,
});

const KEY = ["journey-tasks"];

function Journey() {
  const [active, setActive] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const tasksFn = useServerFn(getJourneyTasks);
  const toggleFn = useServerFn(setJourneyTask);
  const completeFn = useServerFn(completeJourneyStage);
  const resetFn = useServerFn(resetJourneyProgress);
  const qc = useQueryClient();

  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: KEY, queryFn: () => tasksFn() });

  const afterWrite = () => {
    void qc.invalidateQueries({ queryKey: KEY });
    void qc.invalidateQueries({ queryKey: ["journey-progress"] });
  };

  const toggle = useMutation({
    mutationFn: (v: { stageIndex: number; taskKey: string; checked: boolean }) => toggleFn({ data: v }),
    onMutate: async (v) => {
      setSaveError(null);
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<TaskCheck[]>(KEY) ?? [];
      const next = prev.filter((r) => !(r.stageIndex === v.stageIndex && r.taskKey === v.taskKey));
      if (v.checked) next.push({ stageIndex: v.stageIndex, taskKey: v.taskKey });
      qc.setQueryData(KEY, next);
      return { prev };
    },
    onError: (_e, _v, c) => {
      if (c) qc.setQueryData(KEY, c.prev);
      setSaveError("Couldn't save that change — it has been undone. Please try again.");
    },
    onSettled: afterWrite,
  });

  const complete = useMutation({
    mutationFn: (v: { stageIndex: number; complete: boolean }) => completeFn({ data: v }),
    onMutate: async (v) => {
      setSaveError(null);
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<TaskCheck[]>(KEY) ?? [];
      const others = prev.filter((r) => r.stageIndex !== v.stageIndex);
      const next = v.complete
        ? [...others, ...STAGES[v.stageIndex]!.tasks.map((t) => ({ stageIndex: v.stageIndex, taskKey: t.key }))]
        : others;
      qc.setQueryData(KEY, next);
      return { prev };
    },
    onError: (_e, _v, c) => {
      if (c) qc.setQueryData(KEY, c.prev);
      setSaveError("Couldn't update the stage. It has been undone — please try again.");
    },
    onSettled: afterWrite,
  });

  const reset = useMutation({
    mutationFn: () => resetFn(),
    onError: () => setSaveError("Couldn't reset your journey. Please try again."),
    onSuccess: () => setActive(0),
    onSettled: afterWrite,
  });

  const checked = checkedMap(rows);
  const progress = STAGES.map((_, i) => stagePercent(i, checked[i]!));
  const overall = overallPercent(checked);
  const nextIndex = progress.findIndex((p) => p < 100);
  const current = STAGES[active]!;
  const currentChecked = checked[active]!;

  return (
    <div>
      <PageHeader
        eyebrow="My Business Journey"
        title="From idea to opening day."
        subtitle="Eleven guided stages with tasks, ideas and AI specialists. Tick tasks off as you go — your progress is saved to your account."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold">
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Overall {overall}%
            </div>
            <button
              type="button"
              onClick={() => {
                if (reset.isPending) return;
                if (window.confirm("Reset all journey progress? This clears every checked task for your account.")) reset.mutate();
              }}
              disabled={reset.isPending || overall === 0}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {reset.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {reset.isPending ? "Resetting…" : "Reset journey"}
            </button>
          </div>
        }
      />

      <div className="mb-6 h-2 w-full rounded-full bg-muted" role="progressbar" aria-valuenow={overall} aria-valuemin={0} aria-valuemax={100} aria-label="Overall journey progress">
        <div className="h-full rounded-full bg-brand-dark transition-all" style={{ width: `${overall}%` }} />
      </div>

      {(saveError || isError) && (
        <div role="alert" className="mb-6 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {saveError ?? "We couldn't load your saved progress. Refresh the page to try again."}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-2">
          {STAGES.map((s, i) => {
            const p = progress[i] ?? 0;
            const status = p === 100 ? "done" : p > 0 ? "active" : i === nextIndex ? "next" : "locked";
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => setActive(i)}
                aria-current={active === i ? "step" : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark ${active === i ? "border-brand-dark bg-card shadow-soft" : "border-border bg-card hover:border-brand-dark/30"}`}
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    status === "done"
                      ? "bg-[color:var(--success)] text-white"
                      : status === "active"
                        ? "bg-brand text-brand-foreground"
                        : status === "next"
                          ? "bg-brand-dark text-white"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {status === "done" ? <Check className="h-5 w-5" /> : status === "locked" ? <Lock className="h-4 w-4" /> : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{s.title}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{p}%</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Bar value={p} />
                    {status === "next" && <Pill tone="brand">Next</Pill>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Stage {active + 1} of {STAGES.length}</div>
              <h2 className="mt-1 text-2xl font-bold">{current.title}</h2>
            </div>
            <div className="text-sm font-semibold text-muted-foreground">
              {currentChecked.size} of {current.tasks.length} tasks · {progress[active]}% complete
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tasks</div>
            {isLoading ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your saved progress…
              </div>
            ) : current.tasks.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No required tasks for this stage.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
                {current.tasks.map((task) => {
                  const isChecked = currentChecked.has(task.key);
                  const id = `task-${active}-${task.key}`;
                  return (
                    <li key={task.key}>
                      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 p-3.5 hover:bg-muted/40">
                        <input
                          id={id}
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggle.mutate({ stageIndex: active, taskKey: task.key, checked: e.target.checked })}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--brand-dark)]"
                        />
                        <span className={`text-sm ${isChecked ? "text-muted-foreground line-through" : ""}`}>{task.label}</span>
                      </label>
                      {active === 0 && <NoteField stageIndex={0} taskKey={task.key} label={task.label} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {active === 0 && <FounderBriefPanel />}

          {current.ideas.length > 0 && (
            <div className="mt-6 rounded-2xl bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" /> Optional ideas
              </div>
              <ul className="mt-2 space-y-1.5">
                {current.ideas.map((idea) => (
                  <li key={idea} className="text-sm text-muted-foreground">• {idea}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Target className="h-3.5 w-3.5" /> Outputs
              </div>
              <ul className="mt-2 space-y-2">
                {current.outputs.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-dark" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Specialists</div>
              <ul className="mt-2 space-y-2">
                {current.ai.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm">
                    <Brain className="h-3.5 w-3.5 text-brand-dark" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {["Discover Opportunities", "Validate Opportunity", "Find Premises"].includes(current.title) && (
            <div className="mt-6 rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
                <BarChart3 className="h-4 w-4" /> Evidence required for this stage
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Run an Opportunity Analysis to attach published evidence — ONS population and earnings, recorded crime,
                business formations and live competitors — with every figure sourced and every gap stated.
              </p>
              <Link to="/app/opportunity-finder" className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm hover:bg-brand/90">
                Run an Opportunity Analysis
              </Link>
            </div>
          )}

          <StageResourcesPanel stageIndex={active} />

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-5 py-2.5">
              <Switch
                checked={(progress[active] ?? 0) >= 100}
                disabled={complete.isPending || isLoading}
                onCheckedChange={(on) => complete.mutate({ stageIndex: active, complete: on })}
                aria-label="Mark stage complete"
                className="data-[state=checked]:bg-brand-dark"
              />
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                {complete.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {(progress[active] ?? 0) >= 100 ? "Stage complete" : "Stage incomplete"}
              </span>
            </label>
            {active < STAGES.length - 1 && (
              <button
                type="button"
                onClick={() => setActive(active + 1)}
                className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold"
              >
                Next stage
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
