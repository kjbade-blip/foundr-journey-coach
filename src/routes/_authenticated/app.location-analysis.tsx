import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MapPin, Plus, X } from "lucide-react";
import { z } from "zod";

import { PageHeader, Card } from "@/components/foundr/ui";
import { LocationAutocomplete } from "@/components/foundr/LocationAutocomplete";
import { LocationProfileCard } from "@/components/foundr/ons/LocationProfileCard";
import { ViabilityScoreCard } from "@/components/foundr/ons/ViabilityScoreCard";
import { InterpretationCard } from "@/components/foundr/ons/InterpretationCard";
import { EvidencePanel } from "@/components/foundr/ons/EvidencePanel";
import { OpportunityList } from "@/components/foundr/ons/OpportunityList";
import { LocationCompare } from "@/components/foundr/ons/LocationCompare";
import { BUSINESS_TYPES } from "@/lib/ons/business-relevance";
import { analyseLocation, findLocationOpportunities, compareLocations } from "@/lib/ons.functions";

const searchSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/app/location-analysis")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Location Analysis · Found-r" },
      {
        name: "description",
        content:
          "Analyse any UK location with official ONS statistics: population, age, households, employment and earnings, scored for your business type.",
      },
      { property: "og:title", content: "Location Analysis · Found-r" },
      {
        property: "og:description",
        content: "Official ONS neighbourhood data, a transparent viability score and evidence for every figure.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LocationAnalysis,
});

function LocationAnalysis() {
  const search = Route.useSearch();
  const [query, setQuery] = useState(search.q ?? "");
  const [businessType, setBusinessType] = useState(search.type ?? "");
  const [compareOn, setCompareOn] = useState(false);
  const [others, setOthers] = useState<string[]>([""]);

  const analyseFn = useServerFn(analyseLocation);
  const opportunitiesFn = useServerFn(findLocationOpportunities);
  const compareFn = useServerFn(compareLocations);

  const runAnalysis = useMutation({
    mutationFn: async (typeOverride?: string) => {
      const type = typeOverride ?? businessType;
      if (type) setBusinessType(type);
      if (!type) {
        const data = await opportunitiesFn({ data: { query } });
        return { kind: "opportunities" as const, ...data };
      }
      const data = await analyseFn({ data: { query, businessType: type } });
      return { kind: "analysis" as const, ...data };
    },
  });

  const runCompare = useMutation({
    mutationFn: async () => {
      const queries = [query, ...others].map((q) => q.trim()).filter(Boolean);
      return compareFn({ data: { queries: queries.slice(0, 3), businessType: businessType || undefined } });
    },
  });

  const result = runAnalysis.data;
  const busy = runAnalysis.isPending || runCompare.isPending;
  const error = (runAnalysis.error ?? runCompare.error) as Error | undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Location Intelligence"
        title="Official data. Honest analysis. Clarity before commitment."
        subtitle="Found-r reads live Office for National Statistics data for the exact neighbourhood you choose, then shows you what it means for your business idea — with every figure sourced."
      />

      <Card>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_auto]">
          <LocationAutocomplete value={query} onChange={setQuery} />
          <label className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="">Not sure yet — show me opportunities</option>
              {BUSINESS_TYPES.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => (compareOn ? runCompare.mutate() : runAnalysis.mutate(undefined))}
              disabled={busy || !query.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Analysing" : compareOn ? "Compare" : "Analyse"}
            </button>
            <button
              onClick={() => setCompareOn((v) => !v)}
              className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              {compareOn ? "Single" : "Compare"}
            </button>
          </div>
        </div>

        {compareOn && (
          <div className="mt-3 grid gap-2">
            {others.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <LocationAutocomplete
                    value={o}
                    onChange={(v) => setOthers((prev) => prev.map((p, idx) => (idx === i ? v : p)))}
                  />
                </div>
                {others.length > 1 && (
                  <button
                    onClick={() => setOthers((prev) => prev.filter((_, idx) => idx !== i))}
                    className="grid h-9 w-9 place-items-center rounded-full border border-border"
                    aria-label="Remove location"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {others.length < 2 && (
              <button
                onClick={() => setOthers((prev) => [...prev, ""])}
                className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-brand-dark"
              >
                <Plus className="h-3.5 w-3.5" /> Add another location
              </button>
            )}
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Enter a postcode, town or area. Found-r matches it to the smallest ONS geography available and tells you which
          one each figure comes from.
        </p>

        {error && (
          <div className="mt-3 text-sm text-[color:var(--destructive,#b91c1c)]">{error.message}</div>
        )}
      </Card>

      {runCompare.data && (
        <div className="mt-6 space-y-6">
          <LocationCompare
            profiles={runCompare.data.profiles}
            scores={runCompare.data.scores}
            businessType={runCompare.data.businessType ?? undefined}
          />
          <EvidencePanel evidence={runCompare.data.profiles.flatMap((p) => p.evidence)} />
        </div>
      )}

      {result?.kind === "opportunities" && (
        <div className="mt-6 space-y-6">
          <LocationProfileCard profile={result.profile} />
          <OpportunityList
            opportunities={result.opportunities}
            onSelect={(key) => runAnalysis.mutate(key)}
          />
          <EvidencePanel evidence={result.profile.evidence} />
        </div>
      )}

      {result?.kind === "analysis" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          <div className="space-y-6">
            <ViabilityScoreCard score={result.score} locationName={result.profile.displayName} />
            <InterpretationCard interpretation={result.interpretation} businessType={result.businessType} />
          </div>
          <div className="space-y-6">
            <LocationProfileCard profile={result.profile} />
            <EvidencePanel
              evidence={result.profile.evidence}
              extraSources={
                result.competition
                  ? [
                      {
                        label: `Competitor scan — ${result.competition.count} businesses within ${result.competition.radiusMiles} miles`,
                        detail: "Live search of nearby comparable businesses",
                        source: "Google Places",
                      },
                    ]
                  : []
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
