import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Stat, Pill, Bar } from "@/components/foundr/ui";
import { ArrowRight, Sparkles, Compass, FileText, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { GoogleMap, type MapMarker } from "@/components/foundr/GoogleMap";
import { listOpportunityAnalyses } from "@/lib/opportunity.functions";
import { getJourneyProgress } from "@/lib/journey.functions";
import { STAGES, progressMap, overallProgress } from "@/lib/journey";
import { scoreColour } from "@/components/foundr/opportunity/OpportunityReport";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Found-r" },
      { name: "description", content: "Your live Found-r dashboard: saved opportunity analyses, journey progress and your next best action." },
    ],
  }),
  component: Dashboard,
});

function verdictTone(v: string | null): "good" | "warn" | "bad" | "neutral" {
  if (v === "go") return "good";
  if (v === "go_with_conditions") return "warn";
  if (v === "not_yet") return "bad";
  return "neutral";
}

function verdictLabel(v: string | null): string {
  if (v === "go") return "Go";
  if (v === "go_with_conditions") return "Go, with conditions";
  if (v === "not_yet") return "Not yet";
  return "Unscored";
}

function Dashboard() {
  const analysesFn = useServerFn(listOpportunityAnalyses);
  const journeyFn = useServerFn(getJourneyProgress);

  const analyses = useQuery({ queryKey: ["opportunity-analyses"], queryFn: () => analysesFn() });
  const journey = useQuery({ queryKey: ["journey-progress"], queryFn: () => journeyFn() });

  const rows = analyses.data ?? [];
  const progress = progressMap(journey.data ?? []);
  const overall = overallProgress(journey.data ?? []);
  const completed = progress.filter((p) => p === 100).length;
  const currentStage = Math.max(0, progress.findIndex((p) => p < 100));

  const scored = rows.filter((r) => r.overallScore !== null);
  const best = scored[0]
    ? scored.reduce((a, b) => ((b.overallScore ?? 0) > (a.overallScore ?? 0) ? b : a))
    : null;
  const highConfidence = rows.filter((r) => (r.confidenceScore ?? 0) >= 75).length;
  const loading = analyses.isLoading || journey.isLoading;

  const markers: MapMarker[] = [];

  return (
    <div>
      <PageHeader
        eyebrow="Start a Business"
        title="Welcome back."
        subtitle={
          rows.length
            ? `You're on stage ${currentStage + 1} of ${STAGES.length}: ${STAGES[currentStage]!.title}.`
            : "Run your first Opportunity Analysis and Found-r will build your dashboard from real evidence."
        }
        actions={
          <Link to="/app/journey" className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">
            Open my journey
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Journey progress"
          value={loading ? "—" : `${overall}%`}
          hint={`${completed} of ${STAGES.length} stages complete`}
        />
        <Stat
          label="Analyses saved"
          value={loading ? "—" : String(rows.length)}
          hint={rows.length ? `${highConfidence} with high confidence` : "None yet"}
        />
        <Stat
          label="Best opportunity score"
          value={best?.overallScore ?? "—"}
          hint={best ? `${best.businessType ?? "Business"} · ${best.displayName}` : "Run an analysis to see this"}
        />
        <Stat
          label="Current stage"
          value={loading ? "—" : String(currentStage + 1)}
          hint={STAGES[currentStage]!.title}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
              <Sparkles className="h-4 w-4" /> Found-r · Next best action
            </div>
            {best && <Pill tone={verdictTone(best.verdict)}>{verdictLabel(best.verdict)}</Pill>}
          </div>
          {best ? (
            <>
              <h3 className="mt-3 text-2xl font-bold">
                {best.businessType ?? "Your opportunity"} in {best.displayName}
              </h3>
              <p className="mt-2 text-muted-foreground">
                Scored {best.overallScore}/100 with {best.confidenceScore ?? "—"}/100 confidence. Open the analysis to see
                the figures behind every category, the gaps Found-r could not fill, and what to check next.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/app/reports" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">
                  View analysis
                </Link>
                <Link to="/app/opportunity-finder" className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold">
                  Analyse another location
                </Link>
              </div>
            </>
          ) : (
            <>
              <h3 className="mt-3 text-2xl font-bold">Run your first Opportunity Analysis</h3>
              <p className="mt-2 text-muted-foreground">
                Pick a business type and a location. Found-r scores it against ONS statistics, recorded crime, business
                formations and live competitors — and tells you plainly what it does not know.
              </p>
              <div className="mt-5">
                <Link to="/app/opportunity-finder" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">
                  Start an analysis
                </Link>
              </div>
            </>
          )}
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Journey stages</div>
          <ul className="mt-3 space-y-2.5">
            {STAGES.slice(0, 5).map((s, i) => (
              <li key={s.title} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className={progress[i] === 100 ? "text-muted-foreground line-through" : ""}>{s.title}</span>
                  <span className="text-xs text-muted-foreground">{progress[i] ?? 0}%</span>
                </div>
                <div className="mt-1">
                  <Bar value={progress[i] ?? 0} />
                </div>
              </li>
            ))}
          </ul>
          <Link to="/app/journey" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline">
            All {STAGES.length} stages <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Your analyses</div>
            <Link to="/app/opportunity-finder" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline">
              Open finder <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {analyses.isLoading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your saved analyses…
            </div>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No analyses yet. Nothing here is sample data — this list fills up as you run real analyses.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
              <div className="divide-y divide-border">
                {rows.slice(0, 6).map((r, i) => (
                  <div key={r.id} className="flex items-center gap-4 py-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-xs font-bold text-brand-dark">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{r.businessType ?? "Business"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.displayName} · {new Date(r.createdAt).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                    <div className="hidden w-32 md:block">
                      <Bar value={r.overallScore ?? 0} color={scoreColour(r.overallScore ?? 0)} />
                    </div>
                    <div className="w-12 text-right text-lg font-extrabold" style={{ color: scoreColour(r.overallScore ?? 0) }}>
                      {r.overallScore ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-[220px] overflow-hidden rounded-xl bg-muted sm:h-auto">
                <GoogleMap center={{ lat: 53.0, lng: -1.5 }} zoom={5} markers={markers} className="h-full w-full" />
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Recent reports</div>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Saved analyses appear here as reports.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {rows.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-center gap-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">
                    {r.displayName} · {r.businessType ?? "Business"}
                  </span>
                  <Pill tone={verdictTone(r.verdict)}>{verdictLabel(r.verdict)}</Pill>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 rounded-xl bg-accent p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
              <Compass className="h-3.5 w-3.5" /> Tip
            </div>
            <p className="mt-1 text-sm">
              A high score with low confidence is not a green light. Check the evidence status panel before committing money.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
