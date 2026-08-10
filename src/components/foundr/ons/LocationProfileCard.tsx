import { Card } from "@/components/foundr/ui";
import { InfoTip, SourceLine, formatNumber } from "./InfoTip";
import { GEOGRAPHY_LABELS, type LocationProfile, type OnsBreakdown, type OnsMetric } from "@/lib/ons/types";
import { AlertCircle } from "lucide-react";

function Metric({
  label,
  metric,
  tooltip,
  suffix,
}: {
  label: string;
  metric: OnsMetric | null;
  tooltip: string;
  suffix?: string;
}) {
  if (!metric) return null;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label} <InfoTip text={tooltip} />
      </div>
      <div className="mt-1 text-2xl font-extrabold">
        {formatNumber(metric.value, metric.unit)}
        {suffix && <span className="ml-1 text-sm font-semibold text-muted-foreground">{suffix}</span>}
      </div>
      <SourceLine>
        ONS — {metric.referencePeriod}
        <br />
        {GEOGRAPHY_LABELS[metric.geographyLevel].split(" (")[0]}: {metric.geographyName}
        {metric.derivation && <> · {metric.derivation}</>}
      </SourceLine>
    </div>
  );
}

function DerivedStat({ label, value, unit, tooltip }: { label: string; value: number | null; unit: string; tooltip: string }) {
  if (value === null) return null;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label} <InfoTip text={tooltip} />
      </div>
      <div className="mt-1 text-2xl font-extrabold">{formatNumber(value, unit)}</div>
      <SourceLine>Calculated by Found-r from ONS Census 2021 tables</SourceLine>
    </div>
  );
}

function BreakdownChart({ breakdown, title, limit = 8 }: { breakdown: OnsBreakdown | null; title: string; limit?: number }) {
  if (!breakdown) return null;
  const rows = [...breakdown.categories].sort((a, b) => b.value - a.value).slice(0, limit);
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">{title}</div>
      <div className="mt-3 space-y-2">
        {rows.map((c) => (
          <div key={c.label}>
            <div className="flex justify-between gap-3 text-xs">
              <span className="truncate text-muted-foreground">{c.label}</span>
              <span className="shrink-0 font-semibold">
                {c.value.toLocaleString("en-GB")} · {c.share}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-brand-dark" style={{ width: `${Math.min(100, c.share)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <SourceLine>
        ONS — {breakdown.referencePeriod} · {GEOGRAPHY_LABELS[breakdown.geographyLevel].split(" (")[0]}:{" "}
        {breakdown.geographyName}
      </SourceLine>
    </div>
  );
}

export function LocationProfileCard({ profile }: { profile: LocationProfile }) {
  const d = profile.derived;
  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Local market profile</div>
          <h3 className="mt-1 text-2xl font-extrabold">{profile.displayName}</h3>
          <div className="mt-1 text-xs text-muted-foreground">
            Neighbourhood statistics for {profile.primaryGeography.name} ·{" "}
            {GEOGRAPHY_LABELS[profile.primaryGeography.level]}
          </div>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          Retrieved {new Date(profile.retrievedAt).toLocaleDateString("en-GB")}
          <br />
          Source: Office for National Statistics
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          label="Population"
          metric={profile.population}
          tooltip="The number of usual residents ONS counted in this neighbourhood. It is your immediate resident catchment, not a footfall figure."
        />
        <Metric
          label="Population density"
          metric={profile.populationDensity}
          tooltip="Residents per square kilometre. Denser areas typically place more customers within walking distance."
        />
        <Metric
          label="Local authority population"
          metric={profile.populationEstimate}
          tooltip="ONS mid-year estimate for the whole local authority. Useful for the wider market, but it covers a much larger area than the neighbourhood figures."
        />
        <Metric
          label="Population change"
          metric={profile.populationChange}
          tooltip="Change in the local authority population between two ONS mid-year estimates. Found-r calculates this percentage; the underlying figures are ONS."
        />
        <Metric
          label="Households"
          metric={profile.households}
          tooltip="Number of households in the neighbourhood. Household counts often predict demand better than population for home-related services."
        />
        <Metric
          label="Median weekly pay"
          metric={profile.medianWeeklyPay}
          tooltip="ONS Annual Survey of Hours and Earnings: median gross weekly pay for full-time residents of this local authority. This is earnings, not household income, and it is measured at local authority level."
        />
        <DerivedStat
          label="Working age (20–64)"
          value={d.workingAgePct}
          unit="%"
          tooltip="Share of residents in the main working-age bands, added up by Found-r from the ONS five-year age bands."
        />
        <DerivedStat
          label="Aged 65+"
          value={d.age65PlusPct}
          unit="%"
          tooltip="Share of residents aged 65 and over, added up by Found-r from the ONS five-year age bands."
        />
        <DerivedStat
          label="Under 16"
          value={d.under16Pct}
          unit="%"
          tooltip="Share of residents aged under 16, added up by Found-r from the ONS five-year age bands."
        />
        <DerivedStat
          label="Employment rate"
          value={d.employmentRatePct}
          unit="%"
          tooltip="Share of residents aged 16+ recorded as in employment in the ONS economic activity table."
        />
        <DerivedStat
          label="Households with children"
          value={d.householdsWithChildrenPct}
          unit="%"
          tooltip="Share of households containing dependent children, from the ONS household composition table."
        />
        <DerivedStat
          label="One-person households"
          value={d.onePersonHouseholdPct}
          unit="%"
          tooltip="Share of households with a single occupant, from the ONS household composition table."
        />
        <DerivedStat
          label="Average household size"
          value={d.averageHouseholdSize}
          unit=""
          tooltip="Population divided by household count, both from ONS Census 2021."
        />
      </div>

      {d.largestAgeBand && (
        <div className="mt-3 rounded-xl bg-accent/60 p-4 text-sm">
          <span className="font-semibold">Largest age group:</span> {d.largestAgeBand}{" "}
          <span className="text-muted-foreground">(ONS Census 2021 age bands, as published)</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <BreakdownChart breakdown={profile.ageBands} title="Age structure (ONS bands)" limit={20} />
        <BreakdownChart breakdown={profile.householdComposition} title="Household composition" limit={6} />
        <BreakdownChart breakdown={profile.economicActivity} title="Economic activity" limit={6} />
        <BreakdownChart breakdown={profile.industry} title="Industry of employment" limit={8} />
      </div>

      {profile.unavailable.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5" /> Currently unavailable
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {profile.unavailable.map((u) => (
              <li key={u.metric}>
                <span className="font-semibold">{u.metric}:</span> {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
