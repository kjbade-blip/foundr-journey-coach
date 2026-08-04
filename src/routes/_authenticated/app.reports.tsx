import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/foundr/ui";
import { FileText, Download, Share2, Search } from "lucide-react";
import { bdiColor } from "@/components/foundr/bdi/BDIGauge";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports · Found-r" }] }),
  component: Reports,
});

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
        actions={<Link to="/app/bdi-compare" className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Compare BDI</Link>}
      />


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
