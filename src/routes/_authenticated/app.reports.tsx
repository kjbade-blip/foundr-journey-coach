import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/foundr/ui";
import { FileText, Download, Share2, Search, BarChart3 } from "lucide-react";
import { bdiColor } from "@/components/foundr/bdi/BDIGauge";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listSavedAnalyses } from "@/lib/ons.functions";
import { scoreBand } from "@/lib/ons/viability";
import { SavedReports } from "@/components/foundr/StageResources";

export const Route = createFileRoute("/_authenticated/app/reports")({
  head: () => ({ meta: [{ title: "Reports · Found-r" }] }),
  component: Reports,
});

function OnsAnalyses() {
  const fn = useServerFn(listSavedAnalyses);
  const { data, isLoading } = useQuery({ queryKey: ["ons-analyses"], queryFn: () => fn({}) });

  return (
    <Card className="mb-6 p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
            <BarChart3 className="h-4 w-4" /> ONS location analyses
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Every saved analysis records the ONS datasets, geography and reference periods used at the time it was run.
          </p>
        </div>
        <Link
          to="/app/location-analysis"
          search={{ q: undefined, type: undefined }}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          New analysis
        </Link>
      </div>
      {isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">Loading your analyses…</div>
      ) : !data?.length ? (
        <div className="p-4 text-sm text-muted-foreground">
          No location analyses yet. Run one to build an evidence-backed viability report.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {data.map((a) => {
            const band = a.overall_score !== null ? scoreBand(a.overall_score) : null;
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent">
                  <BarChart3 className="h-5 w-5 text-brand-dark" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {a.display_name} — {a.business_type}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ONS location analysis · {new Date(a.created_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
                {band && <Pill tone={band.tone}>Viability {a.overall_score}</Pill>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Reports() {
  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="All your intelligence in one place."
        subtitle="Click any report to open the full analysis."
        actions={<Link to="/app/bdi-compare" search={{ q: undefined }} className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Compare BDI</Link>}
      />
      <Card>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark"><FileText className="h-4 w-4" /> Opportunity reports</div>
        <SavedReports />
      </Card>
    </div>
  );
}
