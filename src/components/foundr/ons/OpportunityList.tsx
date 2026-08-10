import { Card, Pill } from "@/components/foundr/ui";
import type { OpportunitySuggestion } from "@/lib/ons/types";
import { scoreBand } from "@/lib/ons/viability";

export function OpportunityList({
  opportunities,
  onSelect,
}: {
  opportunities: OpportunitySuggestion[];
  onSelect?: (key: string) => void;
}) {
  if (opportunities.length === 0) return null;
  return (
    <Card>
      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Top potential opportunities</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Ranked from the local ONS profile plus a live competitor scan. These are indicators worth exploring, not
        forecasts — each one still needs further validation.
      </p>
      <div className="mt-4 space-y-3">
        {opportunities.map((o) => {
          const band = scoreBand(o.score);
          return (
            <div key={o.key} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold">{o.businessType}</div>
                <div className="flex items-center gap-2">
                  <Pill tone={band.tone}>{band.label}</Pill>
                  <span className="text-lg font-extrabold">{o.score}<span className="text-xs font-semibold text-muted-foreground">/100</span></span>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{o.rationale}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {o.drivers.map((d) => (
                  <span key={d.label} className="rounded-full bg-muted px-2.5 py-1 font-semibold">
                    {d.label}: {d.value}
                  </span>
                ))}
                {o.crimeScore !== null && (
                  <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">
                    Crime score {o.crimeScore}/100 (Police.uk, modelled)
                  </span>
                )}
                {o.competition && (
                  <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">
                    {o.competition.count} similar businesses within {o.competition.radiusMiles} mi (Google Places)
                  </span>
                )}
              </div>
              {onSelect && (
                <button
                  onClick={() => onSelect(o.key)}
                  className="mt-3 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  Run a full analysis for this business type
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
