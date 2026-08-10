import { useState } from "react";
import { ChevronDown, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";

import { Card, Pill, Bar } from "@/components/foundr/ui";
import { InfoTip, SourceLine, formatNumber } from "@/components/foundr/ons/InfoTip";
import type { CrimeProfile, CrimeRisk } from "@/lib/crime/types";

function Sparkline({ points }: { points: Array<{ month: string; total: number }> }) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.total)) || 1;
  return (
    <div className="mt-2 flex h-16 items-end gap-1">
      {points.map((p) => (
        <div key={p.month} className="flex-1" title={`${p.month}: ${p.total.toLocaleString()} recorded crimes`}>
          <div
            className="w-full rounded-t-sm bg-brand"
            style={{ height: `${Math.max(4, (p.total / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function CrimeRiskCard({
  profile,
  risk,
  locationName,
}: {
  profile: CrimeProfile;
  risk: CrimeRisk;
  locationName: string;
}) {
  const [showMethod, setShowMethod] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const categories = showAll ? profile.categories : profile.categories.slice(0, 6);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
            <ShieldAlert className="h-4 w-4" /> Crime &amp; safety
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {locationName} · within {profile.radiusMiles} mile · {profile.windowLabel}
          </div>
        </div>
        <Pill tone={risk.band.tone}>{risk.band.label}</Pill>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recorded crimes
            <InfoTip text="Every crime the police recorded within about a mile of this point over the window shown. This is a published figure, not an estimate." />
          </div>
          <div className="mt-1 text-3xl font-extrabold">{profile.totalCrimes.toLocaleString()}</div>
          <SourceLine>
            {profile.monthsReturned} months · {formatNumber(profile.averagePerMonth)} a month
          </SourceLine>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Per 1,000 residents
            <InfoTip text="Calculated by Found-r: recorded crimes over the window divided by the ONS resident population of the surrounding neighbourhood. The two areas are not identical, so treat this as indicative." />
          </div>
          <div className="mt-1 text-3xl font-extrabold">
            {profile.rate ? formatNumber(profile.rate.value) : "—"}
          </div>
          <SourceLine>
            {profile.rate
              ? `Population ${profile.rate.population.toLocaleString()} — ${profile.rate.populationGeography} (ONS)`
              : "No ONS population figure available for this area"}
          </SourceLine>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Crime score for {risk.businessType.toLowerCase()}
            <InfoTip text="Found-r model. 100 means the lowest measured crime load. Each police category is weighted by how much it matters to this type of business." />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold">{risk.score}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <SourceLine>Modelled · {risk.confidence} confidence</SourceLine>
        </div>
      </div>

      {profile.trendPct !== null && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 p-3 text-xs">
          {profile.trendPct > 0 ? (
            <TrendingUp className="h-4 w-4 text-destructive" />
          ) : (
            <TrendingDown className="h-4 w-4 text-[color:var(--success)]" />
          )}
          <span className="text-muted-foreground">
            Recorded crime in the last 6 months is{" "}
            <span className="font-semibold text-foreground">
              {profile.trendPct > 0 ? "up" : "down"} {Math.abs(profile.trendPct)}%
            </span>{" "}
            on the 6 months before. Calculated by Found-r from published monthly counts.
          </span>
        </div>
      )}

      <Sparkline points={profile.monthly} />
      <SourceLine>Monthly recorded crimes across the window.</SourceLine>

      <div className="mt-5">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">
          What is actually being recorded
        </div>
        <div className="mt-3 grid gap-3">
          {categories.map((c) => {
            const driver = risk.drivers.find((d) => d.slug === c.slug);
            return (
              <div key={c.slug}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {c.name}
                    {driver && (
                      <span className="ml-1 text-[10px] uppercase tracking-wider">
                        · {driver.contribution}% of this business's weighted risk
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">
                    {c.count.toLocaleString()} <span className="text-muted-foreground">({c.share}%)</span>
                  </span>
                </div>
                <div className="mt-1">
                  <Bar value={c.share} max={Math.max(...profile.categories.map((x) => x.share))} />
                </div>
                {c.businessRelevance && (
                  <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{c.businessRelevance}</div>
                )}
              </div>
            );
          })}
        </div>
        {profile.categories.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-3 text-xs font-semibold text-brand-dark"
          >
            {showAll ? "Show fewer categories" : `Show all ${profile.categories.length} categories`}
          </button>
        )}
      </div>

      {profile.benchmark && (
        <div className="mt-4 rounded-xl border border-border p-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">How this compares.</span> Weighted for a{" "}
          {risk.businessType.toLowerCase()}, this area has a higher crime load than{" "}
          <span className="font-semibold text-foreground">{profile.benchmark.percentile}%</span> of{" "}
          {profile.benchmark.comparedWith} Found-r reference areas measured over the same months. Median reference
          area: {formatNumber(profile.benchmark.medianPerMonth)} weighted crimes a month
          {profile.benchmark.lowestArea && profile.benchmark.highestArea && (
            <>
              {" "}
              (lowest {profile.benchmark.lowestArea.name}, highest {profile.benchmark.highestArea.name})
            </>
          )}
          .
        </div>
      )}

      {profile.unavailable.length > 0 && (
        <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          Not available for this location: {profile.unavailable.join(" ")}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMethod((v) => !v)}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dark"
      >
        How the crime score is calculated
        <ChevronDown className={`h-3.5 w-3.5 transition ${showMethod ? "rotate-180" : ""}`} />
      </button>
      {showMethod && (
        <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>{risk.method}</p>
          <p>{risk.confidenceReason}</p>
          <p>
            Counts are police-recorded crime, which reflects what was reported and recorded — not everything that
            happened. Locations are snapped by the police to an anonymised nearby point, so figures describe the area,
            never an individual address.
          </p>
        </div>
      )}

      <SourceLine>
        Source: {profile.source} ·{" "}
        <a href={profile.sourceUrl} target="_blank" rel="noreferrer" className="underline">
          method
        </a>{" "}
        · retrieved {new Date(profile.retrievedAt).toLocaleDateString("en-GB")}
      </SourceLine>
    </Card>
  );
}
