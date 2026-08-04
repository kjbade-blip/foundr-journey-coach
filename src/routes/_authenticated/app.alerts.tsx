import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/foundr/ui";
import { Building, Hammer, Landmark, Newspaper, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/alerts")({
  head: () => ({ meta: [{ title: "Market Alerts · Found-r" }] }),
  component: Alerts,
});

const ALERTS = [
  { i: Building, t: "Planning approved", b: "92-flat residential development at 14 Battersea Park Rd — 0.3mi north. Estimated +1,800 residents by 2028.", tag: "Housing", tone: "good" as const, time: "Today" },
  { i: Landmark, t: "Council grant launched", b: "£500k Lambeth high-street regeneration fund. Applications open until 31 July.", tag: "Council", tone: "brand" as const, time: "Yesterday" },
  { i: Hammer, t: "Roadworks", b: "Battersea Park Rd partial closure for 3 weeks starting 22 June. Expect 18% footfall drop on the east side.", tag: "Local", tone: "warn" as const, time: "2d ago" },
  { i: Newspaper, t: "Local business news", b: "Two indie coffee shops opened in Clapham Old Town — monitor for spillover demand.", tag: "News", tone: "neutral" as const, time: "3d ago" },
  { i: AlertTriangle, t: "Crime cluster", b: "Reported vehicle break-ins up 22% near Wandsworth Common. Review CCTV and lighting.", tag: "Safety", tone: "bad" as const, time: "4d ago" },
];

function Alerts() {
  return (
    <div>
      <PageHeader eyebrow="Market Alerts" title="What's changing around you." subtitle="Planning, housing, council, government, news and safety — filtered for relevance." />
      <div className="space-y-3">
        {ALERTS.map((a) => (
          <Card key={a.t}>
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-brand-dark"><a.i className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{a.t}</h3>
                  <Pill tone={a.tone}>{a.tag}</Pill>
                  <span className="text-xs text-muted-foreground">· {a.time}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.b}</p>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-full bg-brand-dark px-3.5 py-1.5 text-xs font-semibold text-white">AI summary</button>
                  <button className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">Dismiss</button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
