import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Stat, Pill, Bar } from "@/components/foundr/ui";
import { TrendingUp, TrendingDown, Sparkles, Radar, Bell, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/grow")({
  head: () => ({ meta: [{ title: "Growth Dashboard · Found-r" }] }),
  component: Grow,
});

function Grow() {
  return (
    <div>
      <PageHeader
        eyebrow="Grow My Business"
        title="Lambeth Coffee Co. · SW11"
        subtitle="Live signals from your market, competitors and operations."
        actions={<Link to="/app/advisor" className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Open AI Advisor</Link>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Business Health" value="78" hint="+4 vs last month" tone="good" />
        <Stat label="Revenue (MTD)" value="£26.4k" hint="92% of goal" />
        <Stat label="Reviews" value="4.7" hint="+0.1 · 312 total" tone="good" />
        <Stat label="Competitor Pressure" value="Med" hint="2 new promos near you" tone="warn" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark"><Sparkles className="h-4 w-4" /> AI Growth Recommendation</div>
            <Pill tone="brand">High impact</Pill>
          </div>
          <h3 className="mt-3 text-2xl font-bold">Launch a weekday loyalty pass — projected +£3.1k/mo.</h3>
          <p className="mt-2 text-muted-foreground">Repeat-customer rate is 28% — below the 41% category benchmark. A 6-coffee weekday pass at £18 should lift it 12pts within 60 days.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">Apply recommendation</button>
            <Link to="/app/advisor" className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold">See all 7 ideas</Link>
          </div>
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Revenue goals</div>
          <div className="mt-3 space-y-3">
            {[
              { l: "Monthly revenue", v: 92, target: "£28.5k" },
              { l: "Avg ticket", v: 64, target: "£7.20" },
              { l: "Repeat rate", v: 41, target: "41%" },
            ].map((g) => (
              <div key={g.l}>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">{g.l}</span><span className="font-semibold">{g.target}</span></div>
                <div className="mt-1"><Bar value={g.v} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark"><Radar className="h-4 w-4" /> Competitor activity</div>
            <Link to="/app/competitors" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {[
              { n: "Roast & Co", e: "Launched Sunday brunch", d: "2d ago", t: "warn" as const, i: TrendingUp },
              { n: "Beanery", e: "Dropped 4% across all sizes", d: "5d ago", t: "warn" as const, i: TrendingDown },
              { n: "Cafe Mode", e: "Hiring 2 baristas", d: "1w ago", t: "neutral" as const, i: TrendingUp },
            ].map((c) => (
              <li key={c.n} className="flex items-center gap-3 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted"><c.i className="h-4 w-4" /></div>
                <div className="flex-1">
                  <div className="font-semibold">{c.n}</div>
                  <div className="text-xs text-muted-foreground">{c.e}</div>
                </div>
                <Pill tone={c.t}>{c.d}</Pill>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark"><Bell className="h-4 w-4" /> Market alerts</div>
            <Link to="/app/alerts" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {[
              { e: "Planning approved: 92-flat development 0.3mi north", d: "Today", t: "good" as const },
              { e: "Council launches £500k high-street grant", d: "Yesterday", t: "brand" as const },
              { e: "Roadworks: Battersea Park Rd · 3 weeks", d: "2d ago", t: "warn" as const },
            ].map((a) => (
              <li key={a.e} className="flex items-center gap-3 py-3">
                <span className="h-2 w-2 rounded-full bg-brand" />
                <div className="flex-1 text-sm">{a.e}</div>
                <Pill tone={a.t}>{a.d}</Pill>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
