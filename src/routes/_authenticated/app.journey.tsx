import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill, Bar } from "@/components/foundr/ui";
import { Check, Lock, Brain, ChevronRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/app/journey")({
  head: () => ({ meta: [{ title: "My Journey · Found-r" }] }),
  component: Journey,
});

const STAGES = [
  { title: "Explore",                outputs: ["Founder Readiness Score","Founder Profile","Recommended Industries"], ai: ["Founder Coach"], progress: 100 },
  { title: "Discover Opportunities", outputs: ["Opportunity Shortlist","Opportunity Rankings"], ai: ["Opportunity Engine"], progress: 60 },
  { title: "Validate Opportunity",   outputs: ["Opportunity Score","SWOT Analysis","Viability Report","Go / No-Go"], ai: ["Location Analyst","Competitor Analyst","Business Analyst"], progress: 10 },
  { title: "Plan",                   outputs: ["Business Plan","Funding Plan","Launch Roadmap"], ai: ["Business Planner"], progress: 0 },
  { title: "Build Foundations",      outputs: ["Company Setup Checklist","Compliance Checklist"], ai: ["Compliance Advisor"], progress: 0 },
  { title: "Secure Funding",         outputs: ["Funding Recommendations","Finance Options"], ai: ["Funding Advisor"], progress: 0 },
  { title: "Find Premises",          outputs: ["Property Score","Site Comparison Report"], ai: ["Location Selection Engine"], progress: 0 },
  { title: "Fit Out & Setup",        outputs: ["Launch Readiness Score"], ai: ["Setup Advisor"], progress: 0 },
  { title: "Create Presence",        outputs: ["Brand Pack","Website Plan","SEO Plan"], ai: ["Brand Advisor","Marketing Advisor"], progress: 0 },
  { title: "Pre-Launch Marketing",   outputs: ["Launch Campaign","Social Content","Marketing Calendar"], ai: ["Marketing Manager"], progress: 0 },
  { title: "Launch",                 outputs: ["Launch Checklist","Opening Dashboard"], ai: ["Launch Coach"], progress: 0 },
];

function Journey() {
  const [active, setActive] = useState(1);
  const overall = Math.round(STAGES.reduce((s, x) => s + x.progress, 0) / STAGES.length);

  return (
    <div>
      <PageHeader
        eyebrow="My Business Journey"
        title="From idea to opening day."
        subtitle="Eleven guided stages with AI specialists, tasks, and a measurable output for each."
        actions={<div className="rounded-full bg-card border border-border px-4 py-2 text-sm font-semibold">Overall {overall}%</div>}
      />

      <div className="mb-6 h-2 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-dark transition-all" style={{ width: `${overall}%` }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Timeline */}
        <div className="space-y-2">
          {STAGES.map((s, i) => {
            const status = s.progress === 100 ? "done" : s.progress > 0 ? "active" : i === STAGES.findIndex((x) => x.progress < 100) ? "next" : "locked";
            return (
              <button
                key={s.title}
                onClick={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${active === i ? "border-brand-dark bg-card shadow-soft" : "border-border bg-card hover:border-brand-dark/30"}`}
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  status === "done" ? "bg-[color:var(--success)] text-white" :
                  status === "active" ? "bg-brand text-brand-foreground" :
                  status === "next" ? "bg-brand-dark text-white" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {status === "done" ? <Check className="h-5 w-5" /> : status === "locked" ? <Lock className="h-4 w-4" /> : i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.title}</span>
                    {status === "next" && <Pill tone="brand">Up next</Pill>}
                  </div>
                  <div className="mt-1.5"><Bar value={s.progress} /></div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <Card>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">Stage {active + 1} of 11</div>
          <h2 className="mt-1 text-3xl font-extrabold">{STAGES[active].title}</h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Outputs</div>
              <ul className="mt-2 space-y-2">
                {STAGES[active].outputs.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-dark" />{o}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Specialists</div>
              <ul className="mt-2 space-y-2">
                {STAGES[active].ai.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm">
                    <Brain className="h-3.5 w-3.5 text-brand-dark" />{a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-accent p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Tasks</div>
            <ul className="mt-2 space-y-2">
              {["Run AI analysis","Review recommendations","Approve next steps","Save to reports"].map((t, i) => (
                <li key={t} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked={i < 1} className="accent-[color:var(--brand-dark)]" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {["Discover Opportunities", "Validate Opportunity", "Find Premises"].includes(STAGES[active].title) && (
            <div className="mt-6 rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
                <BarChart3 className="h-4 w-4" /> Evidence required for this stage
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                You can't complete {STAGES[active].title.toLowerCase()} on instinct. Run a Location Analysis to attach
                official Office for National Statistics evidence — population, age structure, households, employment and
                earnings for the exact neighbourhood — to your Viability Report.
              </p>
              <Link
                to="/app/location-analysis"
                search={{ q: undefined, type: undefined }}
                className="mt-3 inline-flex rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white"
              >
                Validate this location with ONS data
              </Link>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white">Continue stage</button>
            <button className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">Ask Found-r AI</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
