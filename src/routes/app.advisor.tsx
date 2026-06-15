import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/foundr/ui";
import { Sparkles, ArrowRight, TrendingUp, Users, PiggyBank, Megaphone, Building2 } from "lucide-react";

export const Route = createFileRoute("/app/advisor")({
  head: () => ({ meta: [{ title: "AI Growth Advisor · Found-r" }] }),
  component: Advisor,
});

const IDEAS = [
  { i: TrendingUp, cat: "Growth", t: "Launch weekday loyalty pass", impact: "+£3.1k/mo", effort: "Low", tone: "brand" as const },
  { i: Users, cat: "Retention", t: "Win-back SMS for 90-day lapsed customers", impact: "+£1.2k/mo", effort: "Low", tone: "good" as const },
  { i: Megaphone, cat: "Marketing", t: "Geo-targeted Meta ads to commuters", impact: "+£2.4k/mo", effort: "Medium", tone: "good" as const },
  { i: PiggyBank, cat: "Cost", t: "Renegotiate dairy supplier · switch to local", impact: "+£480/mo", effort: "Medium", tone: "neutral" as const },
  { i: Building2, cat: "Expansion", t: "Open 2nd site · Clapham Junction (Score 79)", impact: "+£14k/mo", effort: "High", tone: "warn" as const },
];

function Advisor() {
  return (
    <div>
      <PageHeader eyebrow="AI Growth Advisor" title="Seven moves to grow this quarter." subtitle="Ranked by impact, effort and confidence. Apply with one click." />
      <Card className="mb-6 bg-brand-dark text-white">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand"><Sparkles className="h-4 w-4" /> This week's focus</div>
        <h3 className="mt-2 text-2xl font-bold">Loyalty + win-back combo · projected +£4.3k/mo</h3>
        <p className="mt-1 text-white/70">Combining these two moves typically lifts repeat rate by 14pts in 60 days for cafes of your size.</p>
        <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-foreground">Apply both <ArrowRight className="h-4 w-4" /></button>
      </Card>
      <div className="grid gap-3">
        {IDEAS.map((idea) => (
          <Card key={idea.t}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-brand-dark"><idea.i className="h-5 w-5" /></div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <Pill tone={idea.tone}>{idea.cat}</Pill>
                  <span className="text-xs text-muted-foreground">Effort: {idea.effort}</span>
                </div>
                <h3 className="mt-1 font-semibold">{idea.t}</h3>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase text-muted-foreground">Projected impact</div>
                <div className="text-lg font-extrabold text-[color:var(--success)]">{idea.impact}</div>
              </div>
              <button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Apply</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
