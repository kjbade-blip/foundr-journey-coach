import { Card } from "@/components/foundr/ui";
import { GEOGRAPHY_LABELS, type LocationProfile } from "@/lib/ons/types";
import type { ViabilityScore } from "@/lib/ons/viability";

interface Row {
  label: string;
  tooltip?: string;
  read: (p: LocationProfile) => string;
}

const ROWS: Row[] = [
  { label: "Primary geography", read: (p) => `${p.primaryGeography.name} — ${GEOGRAPHY_LABELS[p.primaryGeography.level].split(" (")[0]}` },
  { label: "Population (Census 2021)", read: (p) => (p.population ? p.population.value.toLocaleString("en-GB") : "Unavailable") },
  { label: "Population density", read: (p) => (p.populationDensity ? `${Math.round(p.populationDensity.value).toLocaleString("en-GB")} /km²` : "Unavailable") },
  { label: "Households", read: (p) => (p.households ? p.households.value.toLocaleString("en-GB") : "Unavailable") },
  { label: "Largest age band", read: (p) => p.derived.largestAgeBand ?? "Unavailable" },
  { label: "Working age (20–64)", read: (p) => (p.derived.workingAgePct !== null ? `${p.derived.workingAgePct}%` : "Unavailable") },
  { label: "Aged 65+", read: (p) => (p.derived.age65PlusPct !== null ? `${p.derived.age65PlusPct}%` : "Unavailable") },
  { label: "Under 16", read: (p) => (p.derived.under16Pct !== null ? `${p.derived.under16Pct}%` : "Unavailable") },
  { label: "Employment rate", read: (p) => (p.derived.employmentRatePct !== null ? `${p.derived.employmentRatePct}%` : "Unavailable") },
  { label: "Households with children", read: (p) => (p.derived.householdsWithChildrenPct !== null ? `${p.derived.householdsWithChildrenPct}%` : "Unavailable") },
  { label: "One-person households", read: (p) => (p.derived.onePersonHouseholdPct !== null ? `${p.derived.onePersonHouseholdPct}%` : "Unavailable") },
  { label: "Median weekly pay (LA, full-time)", read: (p) => (p.medianWeeklyPay ? `£${Math.round(p.medianWeeklyPay.value).toLocaleString("en-GB")}` : "Unavailable") },
];

export function LocationCompare({
  profiles,
  scores,
  businessType,
}: {
  profiles: LocationProfile[];
  scores: Array<{ displayName: string; score: ViabilityScore } | null>;
  businessType?: string;
}) {
  if (profiles.length === 0) return null;

  const differences = ROWS.slice(1, 5)
    .map((row) => {
      const values = profiles.map((p) => row.read(p));
      const distinct = new Set(values);
      return distinct.size > 1 ? `${row.label}: ${profiles.map((p, i) => `${p.displayName} ${values[i]}`).join(" · ")}` : null;
    })
    .filter(Boolean) as string[];

  return (
    <Card className="p-0">
      <div className="border-b border-border p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Side-by-side comparison</div>
        <p className="mt-1 text-sm text-muted-foreground">
          All figures are ONS official statistics for the geography shown in each column.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metric</th>
              {profiles.map((p) => (
                <th key={p.cacheKey} className="p-4 text-left font-bold">
                  {p.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scores.some(Boolean) && (
              <tr className="border-b border-border bg-accent/40">
                <td className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Viability score{businessType ? ` — ${businessType}` : ""}
                </td>
                {scores.map((s, i) => (
                  <td key={i} className="p-4 text-xl font-extrabold">
                    {s?.score.overall ?? "—"}
                  </td>
                ))}
              </tr>
            )}
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <td className="p-4 text-muted-foreground">{row.label}</td>
                {profiles.map((p) => (
                  <td key={p.cacheKey} className="p-4 font-semibold">
                    {row.read(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {differences.length > 0 && (
        <div className="border-t border-border p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">
            How these differences may affect your business
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {differences.map((d) => (
              <li key={d}>• {d}</li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Differences in catchment size, density and age profile change how many potential customers are within reach
            and what they are likely to need. They are evidence for a decision, not a prediction of trading performance.
          </p>
        </div>
      )}
    </Card>
  );
}
