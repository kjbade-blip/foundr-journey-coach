import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill, Bar } from "@/components/foundr/ui";
import { Search, Filter, Download, Share2, Sparkles, TrendingUp, AlertTriangle, ShieldCheck, Coins, Loader2 } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { geocodeAddress, searchPlacesNearby } from "@/lib/maps.functions";
import { getLocationBDI } from "@/lib/bdi.functions";
import { GoogleMap, type MapMarker } from "@/components/foundr/GoogleMap";
import { LocationAutocomplete } from "@/components/foundr/LocationAutocomplete";
import { BDICard } from "@/components/foundr/bdi/BDICard";
import { CompetitorList } from "@/components/foundr/CompetitorList";

import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/opportunity-finder")({
  head: () => ({ meta: [{ title: "Opportunity Finder · Found-r" }] }),
  component: Finder,
});

const CATEGORIES = ["Coffee Shop","Convenience Store","Gym","Nursery","Dog Grooming","Bakery","Pharmacy","Restaurant"];

function Finder() {
  const [postcode, setPostcode] = useState("SW11");
  const [radius, setRadius] = useState(1);
  const [cat, setCat] = useState("Coffee Shop");

  const geocodeFn = useServerFn(geocodeAddress);
  const searchFn = useServerFn(searchPlacesNearby);
  const bdiFn = useServerFn(getLocationBDI);

  const analyse = useMutation({
    mutationFn: async () => {
      const geo = await geocodeFn({ data: { address: postcode } });
      if (!geo) throw new Error("Location not found");
      const [places, bdi] = await Promise.all([
        searchFn({ data: { query: cat, lat: geo.lat, lng: geo.lng, radius: Math.round(radius * 1609) } }),
        bdiFn({ data: { lat: geo.lat, lng: geo.lng, radius: Math.max(800, Math.round(radius * 1609)), locationName: geo.address } }),
      ]);
      return { geo, places, bdi };
    },
  });

  // Auto-run once on mount with defaults
  // (kept explicit via button to avoid surprise API spend)

  const center = analyse.data?.geo ? { lat: analyse.data.geo.lat, lng: analyse.data.geo.lng } : null;
  const markers: MapMarker[] = center
    ? [
        { lat: center.lat, lng: center.lng, primary: true, title: analyse.data!.geo.address },
        ...(analyse.data?.places ?? []).map((p, i) => ({
          lat: p.lat,
          lng: p.lng,
          title: `${p.name}${p.rating ? ` · ★ ${p.rating}` : ""}`,
          label: String(i + 1),
        })),
      ]
    : [];

  const places = analyse.data?.places ?? [];
  const strong = places.filter((p) => (p.rating ?? 0) >= 4.3).length;

  return (
    <div>
      <PageHeader
        eyebrow="Opportunity Finder"
        title="Search any postcode. Score any opportunity."
        subtitle="The Location Intelligence Engine synthesises demand, competition, property, accessibility and demographics into a single Opportunity Score."
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto]">
          <LocationAutocomplete
            value={postcode}
            onChange={setPostcode}
          />

          <label className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full bg-transparent text-sm outline-none">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full bg-transparent text-sm outline-none">
              {[0.5,1,2,5].map((r) => <option key={r} value={r}>{r} mi</option>)}
            </select>
          </label>
          <button
            onClick={() => analyse.mutate()}
            disabled={analyse.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {analyse.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {analyse.isPending ? "Analysing" : "Analyse"}
          </button>
        </div>
        {analyse.isError && (
          <div className="mt-3 text-sm text-[color:var(--destructive,#b91c1c)]">
            {(analyse.error as Error).message}
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="relative h-[420px] w-full bg-muted">
            <GoogleMap center={center} zoom={14} markers={markers} className="h-full w-full" />
            {!center && !analyse.isPending && (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Press <span className="mx-1 rounded bg-background px-2 py-0.5 font-semibold">Analyse</span> to load the map
              </div>
            )}
          </div>
          <div className="border-t border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat} · {postcode} · {radius}mi</div>
                <h3 className="mt-1 text-xl font-bold">
                  {places.length
                    ? `${places.length} competitors · ${strong} highly rated`
                    : "Run an analysis to see live competitors"}
                </h3>
              </div>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"><Download className="h-3.5 w-3.5" /> PDF</button>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"><Share2 className="h-3.5 w-3.5" /> Share</button>
              </div>
            </div>

            <CompetitorList places={places} />

          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Opportunity Score</div>
              <Pill tone="good">Strong</Pill>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <div className="text-6xl font-extrabold">84</div>
              <div className="pb-1 text-sm text-muted-foreground">/ 100</div>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["Market Demand", 88], ["Competition", 62], ["Property", 74],
                ["Accessibility", 91], ["Demographics", 86], ["Local Economy", 79],
              ].map(([l, v]) => (
                <div key={l as string}>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">{l}</span><span className="font-semibold">{v}</span></div>
                  <div className="mt-1"><Bar value={v as number} /></div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card><div className="text-xs font-semibold uppercase text-muted-foreground">Revenue Potential</div><div className="mt-1 text-2xl font-extrabold">£312k</div><div className="text-xs text-muted-foreground">/ year</div></Card>
            <Card><div className="text-xs font-semibold uppercase text-muted-foreground">Startup Cost</div><div className="mt-1 text-2xl font-extrabold">£78k</div><div className="text-xs text-muted-foreground">fit-out + working capital</div></Card>
            <Card><div className="text-xs font-semibold uppercase text-muted-foreground">Profit (Yr 2)</div><div className="mt-1 text-2xl font-extrabold text-[color:var(--success)]">£64k</div></Card>
            <Card><div className="text-xs font-semibold uppercase text-muted-foreground">Breakeven</div><div className="mt-1 text-2xl font-extrabold">Mo 9</div></Card>
          </div>
        </div>
      </div>

      {analyse.data?.bdi && (
        <div className="mt-6">
          <BDICard
            result={analyse.data.bdi.result}
            narrative={analyse.data.bdi.narrative}
            locationName={analyse.data.geo.address}
            actions={
              <Link
                to="/app/bdi-compare"
                search={{ q: postcode }}
                className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Compare with another location
              </Link>
            }
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark"><Sparkles className="h-4 w-4" /> AI Recommendation</div>
          <p className="mt-3">Open a 38–45 sqm speciality coffee unit on the north side of the high street. Demand is strong (88/100) and premium-coffee supply is thin within 0.5 mi. Aim for a 22-seat layout, focused brunch menu and partnership with two local bakers.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill tone="brand">Go</Pill>
            <Pill tone="good">High confidence</Pill>
            <Pill tone="warn">Watch: parking constraints</Pill>
          </div>
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">SWOT</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {[
              { i: TrendingUp, l: "Strengths", c: "good", items: ["Affluent commuter base","Weak premium supply"] },
              { i: AlertTriangle, l: "Weaknesses", c: "warn", items: ["High commercial rent","Limited parking"] },
              { i: ShieldCheck, l: "Opportunities", c: "brand", items: ["WFH brunch crowd","Local supplier links"] },
              { i: Coins, l: "Threats", c: "bad", items: ["Two large chains within 1mi","Rising milk costs"] },
            ].map((q) => (
              <div key={q.l} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <q.i className="h-3.5 w-3.5" />{q.l}
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {q.items.map((it) => <li key={it} className="text-muted-foreground">• {it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
