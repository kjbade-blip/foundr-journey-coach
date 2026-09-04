import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Loader2, RefreshCw } from "lucide-react";
import { Card, PageHeader, Pill, Stat } from "@/components/foundr/ui";
import { GoogleMap, type MapMarker } from "@/components/foundr/GoogleMap";
import { LocationAutocomplete } from "@/components/foundr/LocationAutocomplete";
import { ChangeFeed } from "@/components/foundr/ci/ChangeFeed";
import { CompetitorPanel } from "@/components/foundr/ci/CompetitorPanel";
import { OpportunityFeed } from "@/components/foundr/ci/OpportunityFeed";
import { CompetitorSearch } from "@/components/foundr/ci/CompetitorSearch";
import {
  createCIBusiness,
  getIntelligence,
  listCIBusinesses,
  runCIScan,
  saveAlertSettings,
} from "@/lib/ci.functions";
import { geocodeAddress } from "@/lib/maps.functions";
import type { CIAlertSettings, CIIntelligence } from "@/lib/ci/types";

export const Route = createFileRoute("/_authenticated/app/intelligence")({
  head: () => ({
    meta: [
      { title: "Competitor Intelligence · Found-r" },
      { name: "description", content: "Search competitors by name, area or type, watch the ones that matter, and see what changed around you each day." },
      { property: "og:title", content: "Competitor Intelligence · Found-r" },
      { property: "og:description", content: "Search, watch and monitor your local competitors in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntelligencePage,
});

const TABS = ["What changed", "Competitors", "Find & watch", "Opportunities", "Alerts"] as const;

function IntelligencePage() {
  const listFn = useServerFn(listCIBusinesses);
  const { data: businesses, isPending } = useQuery({ queryKey: ["ci-businesses"], queryFn: () => listFn({}) });

  if (isPending) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your intelligence workspace…
      </div>
    );
  }

  const business = businesses?.[0];
  if (!business) return <SetupCard />;
  return <Intelligence businessId={business.id} />;
}

function SetupCard() {
  const createFn = useServerFn(createCIBusiness);
  const geocodeFn = useServerFn(geocodeAddress);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");

  const setup = useMutation({
    mutationFn: async () => {
      const geo = await geocodeFn({ data: { address: location } });
      if (!geo) throw new Error("Found-r could not locate that address.");
      return createFn({
        data: {
          name,
          placeId: null,
          address: geo.address,
          lat: geo.lat,
          lng: geo.lng,
          businessType: type,
          searchTerm: type,
          radiusMiles: 1,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ci-businesses"] }),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Competitive Intelligence"
        title="Let Found-r keep an eye on your market."
        subtitle="Tell Found-r what you run and where. It will identify who you're competing with and report what changes."
      />
      <Card className="max-w-xl">
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your business name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kristian's Coffee"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What you do</span>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Coffee shop"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none"
            />
          </label>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Where you trade</span>
            <div className="mt-1.5">
              <LocationAutocomplete value={location} onChange={setLocation} onSelect={setLocation} placeholder="Postcode or address" />
            </div>
          </div>
          <button
            type="button"
            disabled={setup.isPending || !name.trim() || !type.trim() || !location.trim()}
            onClick={() => setup.mutate()}
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {setup.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Start monitoring
          </button>
          {setup.isError && (
            <p className="text-sm text-destructive">{(setup.error as Error).message}</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function Intelligence({ businessId }: { businessId: string }) {
  const intelFn = useServerFn(getIntelligence);
  const scanFn = useServerFn(runCIScan);
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("What changed");

  const { data, isPending } = useQuery({
    queryKey: ["ci-intelligence", businessId],
    queryFn: () => intelFn({ data: { businessId } }) as Promise<CIIntelligence>,
  });

  const scan = useMutation({
    mutationFn: () => scanFn({ data: { businessId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ci-intelligence", businessId] }),
  });

  // Once a day, on the first visit after signing in, Found-r refreshes the
  // competitor landscape automatically. Guarded per business per calendar day.
  const autoScanned = useRef(false);
  const lastRanAt = data?.landscape.ranAt ?? null;
  useEffect(() => {
    if (autoScanned.current || !data || scan.isPending) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `foundr.ci.daily-scan.${businessId}`;
    let done: string | null = null;
    try {
      done = window.localStorage.getItem(key);
    } catch {
      /* storage unavailable */
    }
    const staleData = !lastRanAt || Date.now() - new Date(lastRanAt).getTime() > 24 * 60 * 60 * 1000;
    if (done === today || !staleData) return;
    autoScanned.current = true;
    try {
      window.localStorage.setItem(key, today);
    } catch {
      /* storage unavailable */
    }
    scan.mutate();
  }, [businessId, data, lastRanAt, scan]);


  if (isPending || !data) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your competitive landscape…
      </div>
    );
  }

  const { business, landscape, competitors, changes, opportunities } = data;
  const critical = changes.filter((c) => c.severity === "critical").length;
  const scoreDelta =
    landscape.competitionScore !== null && landscape.previousCompetitionScore !== null
      ? landscape.competitionScore - landscape.previousCompetitionScore
      : null;

  const markers: MapMarker[] = [
    { lat: business.lat, lng: business.lng, primary: true, label: "You", title: business.name },
    ...competitors
      .filter((c) => c.lat !== null && c.lng !== null && c.status !== "dismissed")
      .slice(0, 20)
      .map((c, i) => ({ lat: c.lat!, lng: c.lng!, label: String(i + 1), title: c.name })),
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Competitive Intelligence"
        title="Here's what changed around you."
        subtitle={`${business.name} · ${business.businessType} · ${business.radiusMiles} mile watch area`}
        actions={
          <button
            type="button"
            onClick={() => scan.mutate()}
            disabled={scan.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {scan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {scan.isPending ? "Scanning…" : "Scan now"}
          </button>
        }
      />

      {scan.isError && <p className="mb-4 text-sm text-destructive">{(scan.error as Error).message}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Changes to review" value={changes.length} hint={`${critical} critical`} tone={critical > 0 ? "bad" : "default"} />
        <Stat label="Competitors found" value={landscape.total} hint={`${landscape.tracked} tracked by you`} />
        <Stat
          label="Competitive pressure"
          value={landscape.competitionScore ?? "—"}
          hint={scoreDelta === null ? "No prior scan" : `${scoreDelta >= 0 ? "+" : ""}${scoreDelta} vs last scan`}
        />
        <Stat label="Opportunities" value={opportunities.length} hint="Open, from latest scan" tone={opportunities.length ? "good" : "default"} />
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold">Your competitive landscape</h3>
          <Pill tone="neutral">
            {landscape.ranAt ? `Data as at ${new Date(landscape.ranAt).toLocaleString("en-GB")}` : "Not yet scanned"}
          </Pill>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{landscape.interpretation}</p>
        <div className="mt-4 h-[280px] w-full overflow-hidden rounded-xl bg-muted">
          <GoogleMap center={{ lat: business.lat, lng: business.lng }} zoom={14} markers={markers} className="h-full w-full" />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Source: Google Places, retrieved by Found-r at each scan. Found-r reports only what the source publishes — no revenue,
          footfall or customer figures are held or estimated for other businesses.
        </p>
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-brand-dark text-white" : "border border-border hover:bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "What changed" && <ChangeFeed changes={changes} />}
        {tab === "Competitors" && <CompetitorPanel business={business} competitors={competitors} />}
        {tab === "Opportunities" && <OpportunityFeed opportunities={opportunities} />}
        {tab === "Alerts" && <AlertsPanel businessId={businessId} settings={data.settings} />}
      </div>
    </div>
  );
}

const ALERT_ROWS = [
  ["newCompetitors", "New competitors appear"],
  ["majorChanges", "Major competitor changes"],
  ["closures", "A competitor appears to close"],
  ["opportunities", "Found-r spots an opportunity"],
  ["marketChanges", "Overall market pressure shifts"],
] as const;

function AlertsPanel({ businessId, settings }: { businessId: string; settings: CIAlertSettings }) {
  const saveFn = useServerFn(saveAlertSettings);
  const qc = useQueryClient();
  const [local, setLocal] = useState(settings);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          businessId,
          newCompetitors: local.newCompetitors,
          majorChanges: local.majorChanges,
          closures: local.closures,
          opportunities: local.opportunities,
          marketChanges: local.marketChanges,
          frequency: local.frequency,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ci-intelligence", businessId] }),
  });

  return (
    <Card className="max-w-xl">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <Bell className="h-4 w-4" /> What Found-r should tell you about
      </h3>
      <div className="mt-4 space-y-3">
        {ALERT_ROWS.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 text-sm">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={local[key]}
              onChange={(e) => setLocal({ ...local, [key]: e.target.checked })}
              className="h-4 w-4 accent-[color:var(--brand-dark)]"
            />
          </label>
        ))}
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Summary frequency</span>
          <select
            value={local.frequency}
            onChange={(e) => setLocal({ ...local, frequency: e.target.value as CIAlertSettings["frequency"] })}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none"
          >
            <option value="immediate">As it happens</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="off">Off</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save preferences
        </button>
        {save.isSuccess && <p className="text-xs text-muted-foreground">Preferences saved.</p>}
      </div>
    </Card>
  );
}
