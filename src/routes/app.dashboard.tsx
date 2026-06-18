import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Stat, Pill, Bar } from "@/components/foundr/ui";
import { ArrowRight, Sparkles, Compass, FileText, Building2, CheckCircle2 } from "lucide-react";
import { GoogleMap, type MapMarker } from "@/components/foundr/GoogleMap";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Found-r" }] }),
  component: Dashboard,
});

const OPPS = [
  { name: "Speciality Coffee",   area: "SW11 · 0.5mi", score: 84, tone: "good" as const, lat: 51.4655, lng: -0.1696 },
  { name: "Dog Grooming Studio", area: "BS7 · 1mi",    score: 76, tone: "good" as const, lat: 51.4780, lng: -2.5870 },
  { name: "Boutique Gym",        area: "M20 · 0.75mi", score: 68, tone: "warn" as const, lat: 53.4180, lng: -2.2280 },
  { name: "Independent Bakery",  area: "LS6 · 1mi",    score: 61, tone: "warn" as const, lat: 53.8170, lng: -1.5740 },
];

function Dashboard() {
  return (
    <div>
      <PageHeader
        eyebrow="Start a Business"
        title="Welcome back, Alex."
        subtitle="You're on stage 2 of 11. Here's what to focus on today."
        actions={<Link to="/app/journey" className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Open my journey</Link>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Founder Readiness" value="72" hint="Solid — keep building" />
        <Stat label="Journey Progress" value="18%" hint="2 of 11 stages complete" />
        <Stat label="Saved Opportunities" value="6" hint="3 high-confidence" />
        <Stat label="Reports Generated" value="4" hint="2 viability, 2 location" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
              <Sparkles className="h-4 w-4" /> Found-r AI · Next Best Action
            </div>
            <Pill tone="brand">High impact</Pill>
          </div>
          <h3 className="mt-3 text-2xl font-bold">Validate your top opportunity: Speciality Coffee, SW11</h3>
          <p className="mt-2 text-muted-foreground">Demand and competition signals look favourable. Running the full Validation suite will give you an Opportunity Score, SWOT and a Go/No-Go.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/app/opportunity-finder" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">Run validation</Link>
            <Link to="/app/journey" className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold">View in journey</Link>
          </div>
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Today's checklist</div>
          <ul className="mt-3 space-y-2.5">
            {[
              { t: "Complete Founder Profile", done: true },
              { t: "Shortlist 3 industries", done: true },
              { t: "Save 5 opportunities", done: false },
              { t: "Book free consult with mentor", done: false },
            ].map((i) => (
              <li key={i.t} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className={`h-4 w-4 ${i.done ? "text-[color:var(--success)]" : "text-muted-foreground"}`} />
                <span className={i.done ? "text-muted-foreground line-through" : ""}>{i.t}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Top Opportunities</div>
            <Link to="/app/opportunity-finder" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline">View finder <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
            <div className="divide-y divide-border">
              {OPPS.map((o, i) => (
                <div key={o.name} className="flex items-center gap-4 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-xs font-bold text-brand-dark">{i + 1}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{o.name}</div>
                    <div className="text-xs text-muted-foreground">{o.area}</div>
                  </div>
                  <div className="hidden w-32 md:block"><Bar value={o.score} /></div>
                  <div className="w-12 text-right text-lg font-extrabold">{o.score}</div>
                </div>
              ))}
            </div>
            <div className="h-[220px] overflow-hidden rounded-xl bg-muted sm:h-auto">
              <GoogleMap
                center={{ lat: 53.0, lng: -1.5 }}
                zoom={5}
                markers={OPPS.map((o, i) => ({
                  lat: o.lat, lng: o.lng, label: String(i + 1), title: `${o.name} · ${o.score}`,
                  primary: i === 0,
                })) as MapMarker[]}
                className="h-full w-full"
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Recent reports</div>
          <ul className="mt-3 space-y-3">
            {["SW11 Coffee · Viability", "BS7 Dog Grooming · Location", "M20 Gym · Competition"].map((r) => (
              <li key={r} className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{r}</span>
                <button className="text-xs font-semibold text-brand-dark hover:underline">PDF</button>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl bg-accent p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark"><Compass className="h-3.5 w-3.5" /> Tip</div>
            <p className="mt-1 text-sm">Compare two opportunities side-by-side in Reports to sharpen your decision.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
