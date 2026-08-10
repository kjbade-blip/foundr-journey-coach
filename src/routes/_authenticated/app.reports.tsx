import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/foundr/ui";
import { FileText, Download, Share2, Search, BarChart3 } from "lucide-react";
import { bdiColor } from "@/components/foundr/bdi/BDIGauge";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listSavedAnalyses } from "@/lib/ons.functions";
import { scoreBand } from "@/lib/ons/viability";

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

const REPORTS = [
  { name: "SW11 Speciality Coffee — Viability",   type: "Opportunity", date: "12 Jun 2026", score: 84, tone: "good" as const, bdi: 84, bdiBand: "Strong" },
  { name: "BS7 Dog Grooming — Location",          type: "Location",    date: "08 Jun 2026", score: 76, tone: "good" as const, bdi: 71, bdiBand: "Stable" },
  { name: "M20 Boutique Gym — Competition",       type: "Competitor",  date: "05 Jun 2026", score: 68, tone: "warn" as const, bdi: 63, bdiBand: "Stable" },
  { name: "LS6 Independent Bakery — Viability",   type: "Opportunity", date: "02 Jun 2026", score: 61, tone: "warn" as const, bdi: 49, bdiBand: "Weak" },
  { name: "Lambeth Coffee Expansion — Growth",    type: "Growth",      date: "28 May 2026", score: 73, tone: "good" as const, bdi: 78, bdiBand: "Strong" },
];

function Reports() {
  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="All your intelligence in one place."
        subtitle="Every Location, Business and Opportunity report now includes the Business Diversity Index — Found-r's proprietary measure of high-street health."
        actions={<Link to="/app/bdi-compare" search={{ q: undefined }} className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Compare BDI</Link>}
      />


      <OnsAnalyses />

      <Card className="p-0">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input className="w-full bg-transparent text-sm outline-none" placeholder="Search reports…" />
          <select className="rounded-full border border-border bg-background px-3 py-1.5 text-sm">
            <option>All types</option><option>Opportunity</option><option>Location</option><option>Competitor</option><option>Growth</option>
          </select>
        </div>
        <div className="divide-y divide-border">
          {REPORTS.map((r) => (
            <div key={r.name} className="flex flex-wrap items-center gap-4 p-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent"><FileText className="h-5 w-5 text-brand-dark" /></div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.type} · {r.date}</div>
              </div>
              <Pill tone={r.tone}>Score {r.score}</Pill>
              <div className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold md:inline-flex">
                <span className="text-muted-foreground">BDI</span>
                <span style={{ color: bdiColor(r.bdi) }}>{r.bdi}</span>
                <span className="text-muted-foreground">· {r.bdiBand}</span>
              </div>
              <div className="flex gap-1.5">
                <button className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"><Download className="h-3.5 w-3.5" /> PDF</button>
                <button className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"><Share2 className="h-3.5 w-3.5" /> Share</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
