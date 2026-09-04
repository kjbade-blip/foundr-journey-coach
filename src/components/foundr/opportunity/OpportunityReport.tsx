import type { ReactNode } from "react";
import { Card, Pill } from "@/components/foundr/ui";
import type { OpportunityAnalysis, CategoryScore, EvidenceSource } from "@/lib/opportunity/types";
import { DemandIntelligence, DemandSummaryStrip } from "./DemandIntelligence";
import {
  ShieldAlert,
  Info,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Compass,
  MapPin,
  ChevronDown,
} from "lucide-react";

export function scoreColour(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 45) return "var(--warning)";
  return "var(--destructive, #b91c1c)";
}

function Dial({ score, label }: { score: number | null; label: string }) {
  const pct = score ?? 0;
  const colour = score === null ? "var(--muted-foreground)" : scoreColour(score);
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${colour} ${pct * 3.6}deg, var(--muted) 0deg)` }}
      >
        <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-card">
          <span className="text-2xl font-extrabold" style={{ color: colour }}>
            {score ?? "—"}
          </span>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm text-muted-foreground">out of 100</div>
      </div>
    </div>
  );
}

function SourceTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function CategoryRow({ category }: { category: CategoryScore }) {
  return (
    <details className="group border-b border-border py-3 last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{category.label}</span>
            <span className="text-xs text-muted-foreground">{category.weight}% of score</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${category.score}%`, background: scoreColour(category.score) }}
            />
          </div>
        </div>
        <span className="w-10 text-right text-lg font-extrabold" style={{ color: scoreColour(category.score) }}>
          {category.score}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-3 pl-1">
        <p className="text-sm text-muted-foreground">{category.interpretation}</p>
        {category.dataPoints.length > 0 && (
          <ul className="space-y-1.5">
            {category.dataPoints.map((d) => (
              <li key={`${d.label}-${d.value}`} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">{d.label}:</span>
                <span className="font-semibold">{d.value}</span>
                <SourceTag>{d.source}</SourceTag>
              </li>
            ))}
          </ul>
        )}
        {category.limitations && (
          <p className="flex gap-2 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {category.limitations}
          </p>
        )}
      </div>
    </details>
  );
}

function SourceRow({ source }: { source: EvidenceSource }) {
  const tone = source.status === "available" ? "good" : source.status === "partial" ? "warn" : "bad";
  return (
    <li className="flex flex-wrap items-start gap-2 border-b border-border py-2.5 last:border-0">
      <Pill tone={tone}>{source.status === "available" ? "Available" : source.status === "partial" ? "Partial" : "Unavailable"}</Pill>
      <div className="min-w-[200px] flex-1">
        <div className="text-sm font-semibold">{source.label}</div>
        <div className="text-xs text-muted-foreground">
          {source.source}
          {source.referencePeriod ? ` · ${source.referencePeriod}` : ""}
          {source.retrievedAt ? ` · retrieved ${new Date(source.retrievedAt).toLocaleDateString("en-GB")}` : ""}
        </div>
        {source.note && <div className="mt-1 text-xs text-muted-foreground">{source.note}</div>}
      </div>
    </li>
  );
}

function List({ title, items, icon: Icon, tone }: { title: string; items: string[]; icon: typeof CheckCircle2; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: tone }}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}

export function OpportunityReport({ analysis }: { analysis: OpportunityAnalysis }) {
  const a = analysis;
  return (
    <div className="space-y-6">
      {/* Verdict + scores */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Opportunity Analysis</div>
            <h2 className="mt-1 text-2xl font-bold">
              {a.businessType.label} · {a.location.displayName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {a.location.geography} · {a.location.radiusMiles} mile radius · {new Date(a.timestamp).toLocaleDateString("en-GB")}
            </p>
          </div>
          <Pill tone={a.verdict.tone}>{a.verdict.label}</Pill>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Dial score={a.overallScore} label="Opportunity Score" />
          <Dial score={a.confidence.score} label={`Confidence · ${a.confidence.level}`} />
        </div>

        {/* Analyses saved before the demand model exists have no demand block. */}
        {a.demand && (
          <div className="mt-5">
            <DemandSummaryStrip
              demand={a.demand}
              overallScore={a.overallScore}
              verdictLabel={a.verdict.label}
              verdictTone={a.verdict.tone}
            />
            <p className="mt-2 text-xs text-muted-foreground">{a.demand.interpretation}</p>
          </div>
        )}

        <div className="mt-5 rounded-xl bg-accent p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Why this verdict</div>
          <p className="mt-1.5 text-sm">{a.interpretation.verdictRationale}</p>
          {a.verdict.conditions.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {a.verdict.conditions.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          <strong>Confidence is not the score.</strong> {a.interpretation.confidenceExplanation}
        </p>
      </Card>

      {a.demand && <DemandIntelligence demand={a.demand} />}

      {/* Category breakdown */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Score breakdown — why?</div>
          <span className="text-xs text-muted-foreground">Found-r model · deterministic</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Each category is scored from published data, then weighted for a {a.businessType.label.toLowerCase()}. Open any row
          to see the figures behind it.
        </p>
        <div className="mt-3">
          {a.categories.map((c) => (
            <CategoryRow key={c.key} category={c} />
          ))}
        </div>
      </Card>

      {/* AI interpretation */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
            <Sparkles className="h-4 w-4" /> Found-r AI · interpretation
          </div>
          <span className="text-xs text-muted-foreground">
            {a.interpretation.generatedBy === "ai" ? "AI reading of the model above" : "Rule-based reading"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <List title="Strengths" items={a.interpretation.strengths} icon={CheckCircle2} tone="var(--success)" />
          <List title="Risks" items={a.interpretation.risks} icon={AlertTriangle} tone="var(--warning)" />
          <List title="Opportunities" items={a.interpretation.opportunities} icon={Compass} tone="var(--brand-dark, currentColor)" />
          <List title="Investigate next" items={a.interpretation.investigateNext} icon={Info} tone="currentColor" />
        </div>
        <div className="mt-4 rounded-xl border border-brand-dark/20 bg-accent p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">What would Found-r do?</div>
          <p className="mt-1.5 text-sm">{a.interpretation.whatWouldFoundrDo}</p>
          <p className="mt-2 text-sm font-semibold">Next step: {a.interpretation.recommendedAction}</p>
        </div>
      </Card>

      {/* Alternatives */}
      {a.alternatives.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
            <MapPin className="h-4 w-4" /> Have you considered…
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Nearby areas scored with the same engine, using ONS evidence and a live competitor scan.
          </p>
          <div className="mt-3 divide-y divide-border">
            {a.alternatives.map((alt) => (
              <div key={`${alt.latitude}-${alt.longitude}`} className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex-1">
                  <div className="font-semibold">{alt.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    ~{alt.distanceMiles} miles away · {alt.advantage} {alt.risk}
                  </div>
                </div>
                <span className="text-lg font-extrabold" style={{ color: scoreColour(alt.score) }}>
                  {alt.score}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sources & gaps */}
      <Card>
        <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Sources & evidence status</div>
        <ul className="mt-3">
          {a.sources.map((s) => (
            <SourceRow key={s.key} source={s} />
          ))}
        </ul>
        {a.evidenceGaps.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-muted p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="h-3.5 w-3.5" /> What Found-r does not know
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {a.evidenceGaps.map((g) => (
                <li key={g}>• {g}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{a.methodology}</p>
      </Card>
    </div>
  );
}
