import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/foundr/ui";
import { Filter, Download, ArrowRight, ArrowLeft, Loader2, Building2 } from "lucide-react";
import { profileForBusinessType, recommendedAreaRange } from "@/lib/premises/profiles";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { analyseOpportunity } from "@/lib/opportunity.functions";
import { BUSINESS_TYPES } from "@/lib/ons/business-relevance";
import { GoogleMap, type MapMarker } from "@/components/foundr/GoogleMap";
import { LocationAutocomplete } from "@/components/foundr/LocationAutocomplete";
import { AISearchBar } from "@/components/foundr/AISearchBar";
import { conceptToTypeKey, describeSearch } from "@/lib/ai-search";
import { BDICard } from "@/components/foundr/bdi/BDICard";
import { LocationProfileCard } from "@/components/foundr/ons/LocationProfileCard";
import { CrimeRiskCard } from "@/components/foundr/crime/CrimeRiskCard";
import { OpportunityReport } from "@/components/foundr/opportunity/OpportunityReport";
import { AnalysisProgress, ANALYSIS_STEPS } from "@/components/foundr/opportunity/AnalysisProgress";


export const Route = createFileRoute("/_authenticated/app/opportunity-finder")({
  validateSearch: (s: Record<string, unknown>): { type?: string; location?: string } => ({
    ...(typeof s.type === "string" ? { type: s.type } : {}),
    ...(typeof s.location === "string" ? { location: s.location } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Opportunity Finder · Found-r" },
      {
        name: "description",
        content:
          "Score any UK location for any business type against ONS, Companies House, police and live competitor data — with every figure sourced.",
      },
    ],
  }),
  component: Finder,
});

function Finder() {
  const search = Route.useSearch();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typeKey, setTypeKey] = useState(
    search.type && BUSINESS_TYPES.some((t) => t.key === search.type) ? search.type : BUSINESS_TYPES[0]!.key,
  );
  const [postcode, setPostcode] = useState(search.location ?? "SW11");
  const [radius, setRadius] = useState(1);
  const [tick, setTick] = useState(0);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const analyseFn = useServerFn(analyseOpportunity);
  const analyse = useMutation({
    mutationFn: (vars?: { query?: string; businessType?: string; radiusMiles?: number }) =>
      analyseFn({
        data: {
          query: vars?.query ?? postcode,
          businessType: vars?.businessType ?? typeKey,
          radiusMiles: vars?.radiusMiles ?? radius,
          includeAlternatives: true,
        },
      }),
    onSuccess: () => setStep(2),
  });

  const resultsRef = useRef<HTMLDivElement>(null);

  function runAiSearch(p: import("@/lib/ai-search").ParsedSearch) {
    const key = p.categories.map(conceptToTypeKey).find((k) => k && BUSINESS_TYPES.some((t) => t.key === k)) ?? typeKey;
    const where = p.location.trim() || postcode;
    setTypeKey(key);
    setPostcode(where);
    setAiSummary(describeSearch(p));
    // Show the live progress panel while the engine works.
    setStep(1);
    analyse.mutate({ query: where, businessType: key, radiusMiles: radius });
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }




  // Drives the live checklist while the engine works. Purely presentational.
  useEffect(() => {
    if (!analyse.isPending) {
      setTick(0);
      return;
    }
    const id = setInterval(() => setTick((t) => Math.min(t + 1, ANALYSIS_STEPS.length - 1)), 1800);
    return () => clearInterval(id);
  }, [analyse.isPending]);

  const a = analyse.data ?? null;
  const type = BUSINESS_TYPES.find((t) => t.key === typeKey)!;

  const center = a?.location.latitude != null && a.location.longitude != null
    ? { lat: a.location.latitude, lng: a.location.longitude }
    : null;
  const markers: MapMarker[] = center ? [{ lat: center.lat, lng: center.lng, primary: true, title: a!.location.displayName }] : [];

  return (
    <div>
      <PageHeader
        eyebrow="Opportunity Finder"
        title="Search any postcode. Score any opportunity."
        subtitle="One analysis, built from published data. Every figure is traceable, every gap is stated, and the score is separated from how confident Found-r is in it."
        actions={
          step === 2 ? (
            <button
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" /> New analysis
            </button>
          ) : undefined
        }
      />

      <AISearchBar
        onRun={runAiSearch}
        examples={[
          "Are there any bookshops that also trade as wine bars in Wakefield?",
          "Open a speciality coffee shop in Manchester",
          "Best location for a bakery in Leeds",
        ]}
        runLabel="Run analysis"
      />

      {aiSummary && (
        <Card className="mt-4">
          <p className="text-sm font-semibold text-brand-dark">{aiSummary}</p>
          <p className="mt-1 text-xs text-muted-foreground">You can still edit the type, location and radius below.</p>
        </Card>
      )}

      {/* Stepper */}
      <div ref={resultsRef} className="mb-6 flex scroll-mt-24 flex-wrap items-center gap-2 text-xs font-semibold">
        {["What are you opening?", "Where?", "Your analysis"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full ${
                step >= i ? "bg-brand-dark text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className={step >= i ? "" : "text-muted-foreground"}>{label}</span>
            {i < 2 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Step 1</div>
          <h2 className="mt-1 text-2xl font-bold">What kind of business are you considering?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Found-r weights the evidence differently for each type — a nursery lives on the age profile, a convenience store on
            density and crime.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTypeKey(t.key);
                  setStep(1);
                }}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-dark/40 ${
                  typeKey === t.key ? "border-brand-dark bg-accent" : "border-border bg-card"
                }`}
              >
                <div className="font-semibold">{t.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.rationale}</div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Step 2</div>
          <h2 className="mt-1 text-2xl font-bold">Where are you thinking of opening a {type.label.toLowerCase()}?</h2>
          <p className="mt-1 text-sm text-muted-foreground">A postcode, town or street will do. Found-r resolves it to an official ONS geography.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
            <LocationAutocomplete value={postcode} onChange={setPostcode} />
            <label className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full bg-transparent text-sm outline-none"
              >
                {[0.5, 1, 2, 5].map((r) => (
                  <option key={r} value={r}>
                    {r} mi radius
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => analyse.mutate(undefined)}
              disabled={analyse.isPending || postcode.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {analyse.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {analyse.isPending ? "Analysing" : "Run analysis"}
            </button>
          </div>

          <button onClick={() => setStep(0)} className="mt-4 text-xs font-semibold text-muted-foreground hover:underline">
            ← Change business type
          </button>

          {analyse.isPending && (
            <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Building your analysis</div>
              <div className="mt-3">
                <AnalysisProgress activeIndex={tick} />
              </div>
            </div>
          )}

          {analyse.isError && (
            <div className="mt-4 text-sm text-[color:var(--destructive,#b91c1c)]">{(analyse.error as Error).message}</div>
          )}
        </Card>
      )}

      {step === 2 && a && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="overflow-hidden p-0">
              <div className="h-[360px] w-full bg-muted">
                <GoogleMap center={center} zoom={14} markers={markers} className="h-full w-full" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {a.businessType.label} · {a.location.displayName} · {a.location.radiusMiles}mi
                  </div>
                  <h3 className="mt-1 text-xl font-bold">
                    {a.evidence.competition
                      ? `${a.evidence.competition.count} direct competitors · ${a.evidence.competition.strongCount} highly rated`
                      : "Competitor scan unavailable for this area"}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <Pill tone={a.verdict.tone}>{a.verdict.label}</Pill>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                  >
                    <Download className="h-3.5 w-3.5" /> Save as PDF
                  </button>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Direct competitors found</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Only businesses confirmed to trade primarily as the same business type are counted.
              </p>
              {a.evidence.competition && a.evidence.competition.examples.length > 0 ? (
                <ul className="mt-3 divide-y divide-border">
                  {a.evidence.competition.examples.map((p) => (
                    <li key={p.name} className="py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.rating ? `★ ${p.rating}` : "No rating"}
                          {p.reviews ? ` · ${p.reviews} reviews` : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Why this is a competitor: </span>
                        {p.matchReason}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No high-confidence direct competitors found nearby. Loosely related businesses are deliberately excluded, and
                  Found-r has not substituted an estimate.
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Source: Google Places, live listing data.</p>
            </Card>
          </div>

          <OpportunityReport analysis={a} />

          <PremisesStep typeKey={typeKey} location={a.location.displayName} radiusMiles={a.location.radiusMiles} />


          {a.evidence.crime && (
            <CrimeRiskCard
              profile={a.evidence.crime.profile}
              risk={a.evidence.crime.risk}
              locationName={a.location.displayName}
            />
          )}

          {a.evidence.businessDiversity && (
            <BDICard
              result={a.evidence.businessDiversity.result}
              narrative={a.evidence.businessDiversity.narrative}
              locationName={a.location.displayName}
            />
          )}

          {a.evidence.ons && <LocationProfileCard profile={a.evidence.ons} />}
        </div>
      )}
    </div>
  );
}

/**
 * Optional bridge from an opportunity into the premises search. The search is
 * pre-filled from the opportunity context and the user can refine it first.
 */
function PremisesStep({ typeKey, location, radiusMiles }: { typeKey: string; location: string; radiusMiles: number }) {
  const navigate = useNavigate();
  const profile = profileForBusinessType(typeKey);
  const [capacity, setCapacity] = useState<string>("");
  const [staff, setStaff] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const area = recommendedAreaRange(profile, {
    customerCapacity: capacity ? Number(capacity) : null,
    staffCount: staff ? Number(staff) : null,
  });

  return (
    <Card>
      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Optional next step</div>
      <h3 className="mt-1 text-xl font-bold">Find suitable premises for this opportunity</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Found-r will carry this analysis into the premises search: {profile.label.toLowerCase()} in {location}, within{" "}
        {radiusMiles} miles, sized at {area.min.toLocaleString()}–{area.max.toLocaleString()} sq ft. Refine anything below
        before you search.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <input
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          inputMode="numeric"
          placeholder="Peak customers"
          aria-label="Expected customers at peak"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          inputMode="numeric"
          placeholder="Staff on site"
          aria-label="Staff on site"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          inputMode="numeric"
          placeholder="Rent budget £/month"
          aria-label="Rent budget per month"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={() =>
            navigate({
              to: "/app/premises",
              search: {
                type: profile.key,
                location,
                radius: Math.max(radiusMiles, 3),
                capacity: capacity ? Number(capacity) : undefined,
                staff: staff ? Number(staff) : undefined,
                budget: budget ? Number(budget) : undefined,
              },
            })
          }
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white"
        >
          <Building2 className="h-4 w-4" /> Find premises
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Premises results are checked against operational fit — ceiling height, extraction, toilets, access and size — not
        just rent and postcode.
      </p>
    </Card>
  );
}
