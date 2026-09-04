import { Card, Pill } from "@/components/foundr/ui";
import type { DemandAssessment } from "@/lib/opportunity/types";
import { Info, Users, Swords, Target, Gauge } from "lucide-react";

function bandColour(score: number | null): string {
  if (score === null) return "var(--muted-foreground)";
  if (score >= 70) return "var(--success)";
  if (score >= 45) return "var(--warning)";
  return "var(--destructive, #b91c1c)";
}

/** One headline metric. Reused by the result card and the full analysis. */
export function MetricTile({
  icon: Icon,
  label,
  score,
  caption,
  tone,
}: {
  icon: typeof Users;
  label: string;
  score: number | null;
  caption: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold" style={{ color: bandColour(score) }}>
          {score ?? "—"}
        </span>
        {score !== null && <span className="text-xs font-semibold text-muted-foreground">/100</span>}
      </div>
      <div className="mt-2">
        <Pill tone={tone ?? "neutral"}>{caption}</Pill>
      </div>
    </div>
  );
}

/** Compact four-metric strip: demand, competition, market gap, opportunity. */
export function DemandSummaryStrip({
  demand,
  overallScore,
  verdictLabel,
  verdictTone,
}: {
  demand: DemandAssessment;
  overallScore: number | null;
  verdictLabel: string;
  verdictTone: "good" | "warn" | "bad";
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricTile
        icon={Users}
        label="Perceived Demand"
        score={demand.demandScore}
        caption={demand.demandBand.label}
        tone={demand.demandBand.tone}
      />
      <MetricTile
        icon={Swords}
        label="Competition"
        score={demand.competitionScore}
        caption={demand.competitionLevel ?? "Not scored"}
        tone={demand.competitionLevel === "High" ? "warn" : demand.competitionLevel === "Low" ? "good" : "neutral"}
      />
      <MetricTile
        icon={Target}
        label="Market Gap"
        score={demand.marketGapScore}
        caption={demand.marketGapLabel}
        tone={
          demand.marketGapKey === "strong"
            ? "good"
            : demand.marketGapKey === "potential" || demand.marketGapKey === "competitive"
              ? "warn"
              : demand.marketGapKey === "unknown"
                ? "neutral"
                : "bad"
        }
      />
      <MetricTile icon={Gauge} label="Opportunity" score={overallScore} caption={verdictLabel} tone={verdictTone} />
    </div>
  );
}

function Bar({ label, score, colour }: { label: string; score: number | null; colour: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>{label}</span>
        <span className="text-muted-foreground">{score ?? "—"}/100</span>
      </div>
      <div className="mt-1.5 h-2.5 w-full rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${score ?? 0}%`, background: colour }} />
      </div>
    </div>
  );
}

/** Full "Demand Intelligence" section for the complete analysis. */
export function DemandIntelligence({ demand }: { demand: DemandAssessment }) {
  const available = demand.signals.filter((s) => s.available);
  const missing = demand.signals.filter((s) => !s.available);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Demand Intelligence</div>
        <div className="flex items-center gap-2">
          <Pill tone="neutral">Estimate</Pill>
          <Pill tone={demand.confidence.level === "high" ? "good" : demand.confidence.level === "medium" ? "warn" : "bad"}>
            Demand confidence: {demand.confidence.level}
          </Pill>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div>
          <div className="text-4xl font-extrabold" style={{ color: bandColour(demand.demandScore) }}>
            {demand.demandScore}
            <span className="text-base font-semibold text-muted-foreground">/100</span>
          </div>
          <div className="mt-1 text-sm font-bold">{demand.demandBand.label} perceived demand</div>
        </div>
        <p className="text-sm text-muted-foreground">{demand.interpretation}</p>
      </div>

      {/* Simple demand ↔ competition comparison */}
      <div className="mt-5 space-y-3 rounded-xl border border-border p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Demand ↔ Competition</div>
        <Bar label="Perceived demand" score={demand.demandScore} colour="var(--brand-dark, #4d7c0f)" />
        <Bar label="Competition pressure" score={demand.competitionScore} colour="var(--warning)" />
        <p className="text-xs text-muted-foreground">{demand.competitionDetail}</p>
      </div>

      <div className="mt-4 rounded-xl bg-accent p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-brand-dark">
          Market gap · {demand.marketGapLabel}
          {demand.marketGapScore !== null ? ` · ${demand.marketGapScore}/100` : ""}
        </div>
        <p className="mt-1.5 text-sm">{demand.capacityNote}</p>
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Main demand signals</div>
        <ul className="mt-2 divide-y divide-border">
          {available.map((s) => (
            <li key={s.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
              <span className="w-8 shrink-0 font-extrabold" style={{ color: bandColour(s.score) }}>
                {s.score}
              </span>
              <span className="font-semibold">{s.label}</span>
              <span className="text-muted-foreground">{s.value}</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {s.source} · {s.weight}% weight
              </span>
            </li>
          ))}
        </ul>
        {missing.length > 0 && (
          <p className="mt-3 flex gap-2 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Not available for this location: {missing.map((s) => s.label).join(", ")}. These signals were excluded and their
            weight redistributed — no figure has been estimated in their place.
          </p>
        )}
      </div>

      <details className="group mt-4 rounded-xl border border-border p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold">
          How is this calculated? <span className="text-muted-foreground group-open:hidden">▾</span>
        </summary>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
          <p>
            Perceived Demand is Found-r's estimate of how strong local customer demand may be for this business type. It
            combines available local demographic, business, search and market signals. It is an estimate, not a direct count
            of customers.
          </p>
          <p>{demand.methodology}</p>
          <p>
            Demand and competition are calculated separately. The number of competitors is never used to work out demand, and
            a high competitor count on its own is never treated as proof that a market is saturated.
          </p>
          <p className="text-xs">
            Score version {demand.scoreVersion} · calculated{" "}
            {new Date(demand.calculatedAt).toLocaleString("en-GB")} · {demand.confidence.reason}
          </p>
        </div>
      </details>
    </Card>
  );
}
