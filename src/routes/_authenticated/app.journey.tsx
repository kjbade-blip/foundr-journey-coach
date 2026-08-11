import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Pill, Bar } from "@/components/foundr/ui";
import { Check, Lock, Brain, ChevronRight, BarChart3, Loader2 } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STAGES, progressMap, overallProgress } from "@/lib/journey";
import { getJourneyProgress, setStageProgress } from "@/lib/journey.functions";

export const Route = createFileRoute("/_authenticated/app/journey")({
  head: () => ({
    meta: [
      { title: "My Journey · Found-r" },
      { name: "description", content: "Eleven guided stages from idea to opening day, with your real progress saved as you go." },
    ],
  }),
  component: Journey,
});

function Journey() {
  const [active, setActive] = useState(0);
  const progressFn = useServerFn(getJourneyProgress);
  const saveFn = useServerFn(setStageProgress);
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["journey-progress"],
    queryFn: () => progressFn(),
  });

  const save = useMutation({
    mutationFn: (v: { stageIndex: number; progress: number }) => saveFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journey-progress"] }),
  });

  const progress = progressMap(rows);
  const overall = overallProgress(rows);
  const nextIndex = progress.findIndex((p) => p < 100);
  const current = STAGES[active]!;

  return (
    <div>
      <PageHeader
        eyebrow="My Business Journey"
        title="From idea to opening day."
        subtitle="Eleven guided stages with AI specialists, tasks, and a measurable output for each. Your progress is saved to your account."
        actions={
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold">
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Overall {overall}%
          </div>
        }
      />

      <div className="mb-6 h-2 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-dark transition-all" style={{ width: `${overall}%` }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-2">
          {STAGES.map((s, i) => {
            const p = progress[i] ?? 0;
            const status = p === 100 ? "done" : p > 0 ? "active" : i === nextIndex ? "next" : "locked";
            return (
              <button
                key={s.title}
                onClick={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${active === i ? "border-brand-dark bg-card shadow-soft" : "border-border bg-card hover:border-brand-dark/30"}`}
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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.title}</span>
                    {status === "next" && <Pill tone="brand">Up next</Pill>}
                  </div>
                  <div className="mt-1.5">
                    <Bar value={p} />
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
            <div className="text-sm font-semibold text-muted-foreground">{progress[active] ?? 0}% complete</div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Outputs</div>
              <ul className="mt-2 space-y-2">
                {current.outputs.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-dark" />
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
                You can't complete {current.title.toLowerCase()} on instinct. Run an Opportunity Analysis to attach published
                evidence — ONS population and earnings, recorded crime, business formations and live competitors — with every
                figure sourced and every gap stated.
              </p>
              <Link
                to="/app/opportunity-finder"
                className="mt-3 inline-flex rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white"
              >
                Run an Opportunity Analysis
              </Link>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => save.mutate({ stageIndex: active, progress: Math.min(100, (progress[active] ?? 0) + 25) })}
              disabled={save.isPending || (progress[active] ?? 0) >= 100}
              className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Log progress on this stage
            </button>
            <button
              onClick={() => save.mutate({ stageIndex: active, progress: 100 })}
              disabled={save.isPending || (progress[active] ?? 0) === 100}
              className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Mark stage complete
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
