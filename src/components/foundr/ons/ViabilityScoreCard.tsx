import { useState } from "react";
import { Card, Pill, Bar } from "@/components/foundr/ui";
import { scoreBand, type ViabilityScore } from "@/lib/ons/viability";
import { ChevronDown, Gauge } from "lucide-react";

export function ViabilityScoreCard({ score, locationName }: { score: ViabilityScore; locationName: string }) {
  const [showMethod, setShowMethod] = useState(false);

  if (score.overall === null) {
    return (
      <Card>
        <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Location viability score</div>
        <p className="mt-3 text-sm text-muted-foreground">{score.methodology}</p>
      </Card>
    );
  }

  const band = scoreBand(score.overall);
  const weightSum = score.categories.reduce((s, c) => s + c.weight, 0);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
            <Gauge className="h-4 w-4" /> Location viability score
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {score.businessType} · {locationName}
          </div>
        </div>
        <Pill tone={band.tone}>{band.label}</Pill>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="text-6xl font-extrabold">{score.overall}</div>
        <div className="pb-1 text-sm text-muted-foreground">/ 100</div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Modelled assessment — evidence-based indicators, not a prediction of success.
      </div>

      <div className="mt-5 grid gap-3">
        {score.categories.map((c) => (
          <div key={c.key}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-muted-foreground">
                {c.label}{" "}
                <span className="text-[10px] uppercase tracking-wider">
                  · {Math.round((c.weight / weightSum) * 100)}% weight
                </span>
              </span>
              <span className="font-semibold">{c.score}</span>
            </div>
            <div className="mt-1">
              <Bar value={c.score} />
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {c.explanation} <span className="font-semibold">Sources:</span> {c.sources.join(", ")}.
            </div>
          </div>
        ))}
      </div>

      {score.missing.length > 0 && (
        <div className="mt-4 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          Not included because data was unavailable: {score.missing.join(", ")}. The remaining categories were
          re-weighted rather than filled with estimates.
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMethod((v) => !v)}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dark"
      >
        How this score is calculated
        <ChevronDown className={`h-3.5 w-3.5 transition ${showMethod ? "rotate-180" : ""}`} />
      </button>
      {showMethod && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{score.methodology}</p>
      )}
    </Card>
  );
}
