import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Compass, BarChart3, Building2, FileText, PlayCircle, Star, Store, ChevronRight } from "lucide-react";
import { Pill } from "@/components/foundr/ui";
import { listOpportunityAnalyses } from "@/lib/opportunity.functions";
import { PARTNERS, STAGE_RESOURCES, videoUrl, type StageTool } from "@/lib/journey-resources";

const btn = "inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm hover:bg-brand/90";

function ToolLink({ tool }: { tool: StageTool }) {
  switch (tool) {
    case "opportunity-finder":
      return <Link to="/app/opportunity-finder" className={btn}><Compass className="h-4 w-4 text-brand-dark" /> Opportunity Finder</Link>;
    case "bdi-compare":
      return <Link to="/app/bdi-compare" search={{ q: undefined }} className={btn}><BarChart3 className="h-4 w-4 text-brand-dark" /> BDI Compare</Link>;
    case "premises":
      return <Link to="/app/premises" className={btn}><Building2 className="h-4 w-4 text-brand-dark" /> Find Premises</Link>;
    case "location-analysis":
      return <Link to="/app/location-analysis" search={{ q: undefined, type: undefined }} className={btn}><BarChart3 className="h-4 w-4 text-brand-dark" /> Location Analysis</Link>;
  }
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</div>;
}

export function SavedReports() {
  const [showAll, setShowAll] = useState(false);
  const fn = useServerFn(listOpportunityAnalyses);
  const { data, isLoading } = useQuery({ queryKey: ["opportunity-analyses"], queryFn: () => fn() });
  if (isLoading) return <p className="mt-2 text-sm text-muted-foreground">Loading your reports…</p>;
  if (!data?.length) return <p className="mt-2 text-sm text-muted-foreground">No reports yet. Run an Opportunity Analysis to create one.</p>;
  const visible = showAll ? data : data.slice(0, 5);
  const hiddenCount = data.length - visible.length;
  return (
    <>
      <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
        {visible.map((r) => (
          <li key={r.id}>
            <Link to="/app/report/$id" params={{ id: r.id }} className="flex items-center gap-3 p-3.5 hover:bg-muted/40">
              <FileText className="h-4 w-4 shrink-0 text-brand-dark" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{r.displayName} — {r.businessType}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-GB")}{r.verdict ? ` · ${r.verdict}` : ""}</div>
              </div>
              {r.overallScore !== null && <Pill>Score {r.overallScore}</Pill>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      {(hiddenCount > 0 || showAll) && data.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
          {showAll ? "Show fewer" : `Show all ${data.length} reports`}
        </button>
      )}
    </>
  );
}

export function StageResourcesPanel({ stageIndex }: { stageIndex: number }) {
  const res = STAGE_RESOURCES[stageIndex];
  if (!res) return null;
  const partners = PARTNERS.filter((p) => res.partnerCats.includes(p.cat));
  return (
    <div className="mt-6 space-y-6">
      {res.tools.length > 0 && (
        <div>
          <Heading>Tools for this stage</Heading>
          <div className="mt-2 flex flex-wrap gap-2">{res.tools.map((t) => <ToolLink key={t} tool={t} />)}</div>
        </div>
      )}
      {res.showReports && (
        <div>
          <Heading><FileText className="h-3.5 w-3.5" /> Your reports</Heading>
          <SavedReports />
        </div>
      )}
      {partners.length > 0 && (
        <div>
          <Heading><Store className="h-3.5 w-3.5" /> Recommended providers</Heading>
          <p className="mt-1 text-xs text-muted-foreground">Sample listings — illustrative, not yet live partners.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {partners.map((p) => (
              <div key={p.name} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{p.name}</span>
                  <Pill>{p.cat}</Pill>
                </div>
                <p className="text-sm text-muted-foreground">{p.tag}</p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Star className="h-3.5 w-3.5 fill-[color:var(--warning)] text-[color:var(--warning)]" />
                  <span className="font-semibold">{p.rating}</span>
                  <span className="text-muted-foreground">· {p.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {res.videos.length > 0 && (
        <div>
          <Heading><PlayCircle className="h-3.5 w-3.5" /> Learning videos</Heading>
          <ul className="mt-2 space-y-1.5">
            {res.videos.map((v) => (
              <li key={v}>
                <a href={videoUrl(v)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-dark hover:underline">
                  <PlayCircle className="h-4 w-4" /> {v}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">Opens a YouTube search for this topic.</p>
        </div>
      )}
    </div>
  );
}
