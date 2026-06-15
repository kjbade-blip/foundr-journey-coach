import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill, Bar } from "@/components/foundr/ui";
import { Star, Users, MapPin, Megaphone } from "lucide-react";

export const Route = createFileRoute("/app/competitors")({
  head: () => ({ meta: [{ title: "Competitor Intelligence · Found-r" }] }),
  component: Competitors,
});

const COMPETITORS = [
  { n: "Roast & Co", dist: "0.2mi", rating: 4.6, reviews: 412, threat: 78, signals: ["New brunch menu","+12 reviews this week"] },
  { n: "Beanery", dist: "0.4mi", rating: 4.3, reviews: 287, threat: 62, signals: ["4% price drop","Pushed paid social"] },
  { n: "Cafe Mode", dist: "0.6mi", rating: 4.5, reviews: 198, threat: 54, signals: ["Hiring 2 baristas"] },
  { n: "The Daily Grind", dist: "0.8mi", rating: 4.2, reviews: 156, threat: 41, signals: ["Refurb closed Mon-Wed"] },
];

function Competitors() {
  return (
    <div>
      <PageHeader eyebrow="Competitor Intelligence" title="Always know what they're doing." subtitle="Reviews, ratings, promos, hiring and social activity — synthesised by Found-r AI." />

      <div className="grid gap-4 sm:grid-cols-2">
        {COMPETITORS.map((c) => (
          <Card key={c.n}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">{c.n}</h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.dist}</span>
                  <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-[color:var(--warning)] text-[color:var(--warning)]" /> {c.rating} ({c.reviews})</span>
                </div>
              </div>
              <Pill tone={c.threat > 70 ? "bad" : c.threat > 50 ? "warn" : "good"}>Threat {c.threat}</Pill>
            </div>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground">Competitive pressure</div>
              <div className="mt-1"><Bar value={c.threat} color={c.threat > 70 ? "var(--destructive)" : c.threat > 50 ? "var(--warning)" : "var(--success)"} /></div>
            </div>
            <div className="mt-4 space-y-1.5">
              {c.signals.map((s) => (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <Megaphone className="h-3.5 w-3.5 text-brand-dark" />{s}
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">AI counter-strategy</button>
              <button className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Watch</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
