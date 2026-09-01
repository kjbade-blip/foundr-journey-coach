import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Card, Pill } from "@/components/foundr/ui";
import { GoogleMap, type MapMarker } from "@/components/foundr/GoogleMap";
import { LocationAutocomplete } from "@/components/foundr/LocationAutocomplete";
import { geocodeAddress, getPlaceDetails } from "@/lib/maps.functions";
import { Eye, EyeOff, Globe, Loader2, MapPin, Search, Star, Trash2, Sparkles } from "lucide-react";
import {
  AREAS,
  BUSINESS_TYPES,
  generateCompetitors,
  searchAllCompetitors,
  type MockCompetitor,
} from "@/lib/competitor-mocks";
import { AISearchBar } from "@/components/foundr/AISearchBar";
import { conceptToMockType, describeSearch, searchByConcepts, type ParsedSearch } from "@/lib/ai-search";
import { NO_DIRECT_COMPETITORS_MESSAGE, businessTypeLabel, partitionCandidates } from "@/lib/competition/match";


export const Route = createFileRoute("/_authenticated/app/competitors")({
  head: () => ({
    meta: [
      { title: "Competitor Watchlist · Found-r" },
      { name: "description", content: "Track the top 20 local competitors for your business type and area, and watch any business anywhere in the UK for inspiration." },
      { property: "og:title", content: "Competitor Watchlist · Found-r" },
      { property: "og:description", content: "Rank local competitors, build a watchlist and spot inspiration outside your area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Competitors,
});

const STORAGE_KEY = "foundr.competitor-watchlist.v1";

function useWatchlist() {
  const [items, setItems] = useState<MockCompetitor[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as MockCompetitor[]);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, hydrated]);

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const toggle = (c: MockCompetitor) =>
    setItems((prev) => (prev.some((p) => p.id === c.id) ? prev.filter((p) => p.id !== c.id) : [c, ...prev]));
  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));

  return { items, ids, toggle, remove, hydrated };
}

function Rating({ c }: { c: MockCompetitor }) {
  if (c.rating === null) return <span className="text-xs text-muted-foreground">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold">
      <Star className="h-3.5 w-3.5 fill-[color:var(--warning)] text-[color:var(--warning)]" />
      {c.rating}
      <span className="font-normal text-muted-foreground">({c.reviews ?? 0} reviews)</span>
    </span>
  );
}

function WatchButton({ watched, onClick, size = "md" }: { watched: boolean; onClick: () => void; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={watched}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition ${
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } ${
        watched
          ? "bg-brand text-brand-foreground hover:opacity-90"
          : "border border-border bg-card hover:border-brand-dark hover:bg-muted"
      }`}
    >
      {watched ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {watched ? "Unwatch" : "Watch"}
    </button>
  );
}

function CompetitorRow({
  c,
  rank,
  watched,
  onToggle,
  why,
}: {
  c: MockCompetitor;
  rank?: number;
  watched: boolean;
  onToggle: () => void;
  why?: string;
}) {
  return (
    <li
      className={`rounded-2xl border p-4 transition sm:p-5 ${
        watched ? "border-brand bg-brand/5" : "border-border bg-card hover:border-brand-dark/40"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
        {rank !== undefined && (
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-dark text-xs font-bold text-white">
            {rank}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold">{c.name}</h3>
            {watched && <Pill tone="brand">Watching</Pill>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-foreground">{c.category}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {c.address} · {c.distanceMiles} mi
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Rating c={c} />
            {c.website && (
              <a
                href={c.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark underline-offset-2 hover:underline"
              >
                <Globe className="h-3.5 w-3.5" /> {c.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" />
            {c.notable}
          </p>
          {why && (
            <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Why this is a competitor: </span>
              {why}
            </p>
          )}
        </div>
        <div className="w-full sm:w-auto">
          <WatchButton watched={watched} onClick={onToggle} />
        </div>
      </div>
    </li>
  );
}

function Competitors() {
  const { items, ids, toggle, remove, hydrated } = useWatchlist();

  const [areaInput, setAreaInput] = useState("Wakefield");
  const [typeInput, setTypeInput] = useState("Coffee shops");
  const [query, setQuery] = useState({ area: "Wakefield", type: "Coffee shops" });
  const [loading, setLoading] = useState(false);

  const [globalTerm, setGlobalTerm] = useState("");
  const [globalResults, setGlobalResults] = useState<MockCompetitor[] | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  const geocode = useServerFn(geocodeAddress);
  const placeDetails = useServerFn(getPlaceDetails);
  const [geoCenter, setGeoCenter] = useState<{ lat: number; lng: number } | null>(null);

  const [ai, setAi] = useState<ParsedSearch | null>(null);

  const results = useMemo(
    () =>
      ai
        ? searchByConcepts(ai.location || query.area, ai.categories, { hybrid: ai.hybrid, limit: 20 })
        : generateCompetitors(query.area, query.type, 20),
    [query, ai],
  );
  const matched = useMemo(
    () =>
      partitionCandidates(query.type, results, (c) => ({
        category: c.category,
        name: c.name,
        website: c.website,
      })),
    [results, query.type],
  );
  const directResults = useMemo(() => matched.direct.slice(0, 20), [matched]);
  const relatedResults = useMemo(() => matched.related.slice(0, 8), [matched]);

  const center = useMemo(() => {
    if (geoCenter) return geoCenter;
    const key = Object.keys(AREAS).find((a) => a.toLowerCase() === query.area.trim().toLowerCase());
    return key ? { lat: AREAS[key].lat, lng: AREAS[key].lng } : { lat: results[0]?.lat ?? 53.68, lng: results[0]?.lng ?? -1.49 };
  }, [query.area, results, geoCenter]);

  const markers: MapMarker[] = useMemo(
    () => [
      { ...center, primary: true, label: "You", title: `Your area · ${query.area}` },
      ...directResults.slice(0, 8).map((c, i) => ({ lat: c.lat, lng: c.lng, label: String(i + 1), title: `${c.name} · ${c.category}` })),
    ],
    [center, directResults, query.area],
  );

  async function geocodeArea(area: string) {
    try {
      const geo = await geocode({ data: { address: `${area}, UK` } });
      setGeoCenter(geo ? { lat: geo.lat, lng: geo.lng } : null);
    } catch {
      setGeoCenter(null);
    }
  }

  async function runUpdate(areaOverride?: string) {
    const area = (areaOverride ?? areaInput).trim() || "Wakefield";
    setLoading(true);
    setAi(null);
    setQuery({ area, type: typeInput });
    await geocodeArea(area);
    setLoading(false);
  }

  async function runAiSearch(p: ParsedSearch) {
    const area = p.location.trim() || query.area;
    setLoading(true);
    setAi(p);
    setAreaInput(area);
    setQuery({ area, type: p.categories[0] ? conceptToMockType(p.categories[0]) : query.type });
    await geocodeArea(area);
    setLoading(false);
  }


  async function pickGooglePlace(placeId: string, fallbackName: string) {
    setGlobalLoading(true);
    try {
      const p = await placeDetails({ data: { placeId } });
      setGlobalResults([
        {
          id: `g:${p.id}`,
          name: p.name,
          category: p.category ?? "Business",
          area: p.address.split(",").slice(-2).join(",").trim(),
          address: p.address,
          distanceMiles: 0,
          rating: p.rating,
          reviews: p.reviews,
          website: p.website,
          lat: p.lat,
          lng: p.lng,
          notable: p.topReviews[0]?.text
            ? `Recent review: “${p.topReviews[0].text.slice(0, 160)}”`
            : "Live Google Business Profile data.",
        },
      ]);
    } catch {
      setGlobalResults(searchAllCompetitors(fallbackName));
    } finally {
      setGlobalLoading(false);
    }
  }

  function runGlobalSearch() {
    const term = globalTerm.trim();
    if (term.length < 2) {
      setGlobalResults([]);
      return;
    }
    setGlobalLoading(true);
    window.setTimeout(() => {
      setGlobalResults(searchAllCompetitors(term));
      setGlobalLoading(false);
    }, 400);
  }

  return (
    <div className="pb-12">
      <PageHeader
        eyebrow="Competitor Watchlist"
        title="Know exactly who you're up against."
        subtitle="Choose your area and business type to rank local competitors — then watch any business, anywhere, for inspiration."
      />

      <AISearchBar
        onRun={runAiSearch}
        examples={[
          "Are there any bookshops that also trade as wine bars in Wakefield?",
          "Best independent coffee shops in Manchester for inspiration",
          "Which pubs have the highest review volume near Leeds?",
        ]}
        runLabel="Run search"
      />

      {/* Search controls */}
      <Card className="mt-6">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor="area" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Search area
            </label>
            <div className="mt-1.5">
              <LocationAutocomplete
                value={areaInput}
                onChange={setAreaInput}
                onSelect={(v) => runUpdate(v)}
                placeholder="e.g. Wakefield"
              />
            </div>
          </div>
          <div>
            <label htmlFor="type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Business type
            </label>
            <select
              id="type"
              value={typeInput}
              onChange={(e) => setTypeInput(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand-dark"
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => runUpdate()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-dark px-6 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Update results
          </button>
        </div>
        {ai ? (
          <p className="mt-3 text-sm font-semibold text-brand-dark">{describeSearch(ai)}</p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{query.type}</span> in{" "}
            <span className="font-semibold text-foreground">{query.area}</span>. Prototype data — live sources coming next.
          </p>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="h-[300px] w-full bg-muted">
          <GoogleMap center={center} zoom={13} markers={markers} className="h-full w-full" />
        </div>
      </Card>

      {/* My watchlist */}
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-bold">My Watchlist</h2>
          <span className="text-xs text-muted-foreground">{items.length} watched</span>
        </div>
        {!hydrated ? (
          <Card className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your watchlist…
          </Card>
        ) : items.length === 0 ? (
          <Card className="mt-3 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
              <Eye className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 font-semibold">No competitors watched yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap <span className="font-semibold text-foreground">Watch</span> on any competitor below to keep an eye on them.
            </p>
          </Card>
        ) : (
          <ul className="mt-3 grid gap-3">
            {items.map((c) => (
              <li key={c.id} className="rounded-2xl border border-brand bg-brand/5 p-4">
                <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold">{c.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="rounded-full bg-card px-2 py-0.5 font-semibold text-foreground">{c.category}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {c.area}
                      </span>
                      <Rating c={c} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Top 20 */}
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-bold">Direct competitors</h2>
          <span className="text-xs text-muted-foreground">
            High-confidence {businessTypeLabel(query.type).toLowerCase()} matches only
          </span>
        </div>

        {loading ? (
          <ul className="mt-3 grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-muted/50" />
            ))}
          </ul>
        ) : directResults.length === 0 ? (
          <Card className="mt-3 text-center text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{NO_DIRECT_COMPETITORS_MESSAGE}</p>
            <p className="mt-1">
              Found-r only lists businesses confirmed to trade primarily as {businessTypeLabel(query.type).toLowerCase()}s in{" "}
              {query.area}. {matched.related.length + matched.excluded} loosely related businesses were excluded.
            </p>
          </Card>
        ) : (
          <>
            <ul className="mt-3 grid gap-3">
              {directResults.map((c, i) => (
                <CompetitorRow
                  key={c.id}
                  c={c}
                  rank={i + 1}
                  watched={ids.has(c.id)}
                  onToggle={() => toggle(c)}
                  why={c.match.reason}
                />
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {matched.excluded + matched.related.length} nearby businesses were excluded because Found-r could not confirm
              they share the same core business type.
            </p>
          </>
        )}
      </section>

      {relatedResults.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-bold">Related businesses (not competitors)</h2>
            <span className="text-xs text-muted-foreground">Adjacent or complementary — excluded from competitor analysis</span>
          </div>
          <ul className="mt-3 grid gap-3 opacity-90">
            {relatedResults.map((c) => (
              <CompetitorRow key={c.id} c={c} watched={ids.has(c.id)} onToggle={() => toggle(c)} why={c.match.reason} />
            ))}
          </ul>
        </section>
      )}

      {/* Global search */}
      <section className="mt-10">
        <h2 className="text-xl font-bold">Add any competitor</h2>
        <p className="mt-1 text-sm text-muted-foreground">Watch competitors outside your area for inspiration.</p>
        <Card className="mt-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <LocationAutocomplete
                icon="search"
                value={globalTerm}
                onChange={setGlobalTerm}
                onSelectItem={(s) => pickGooglePlace(s.id, s.description)}
                placeholder="Search any business by name, e.g. a Manchester coffee shop"
              />
            </div>
            <button
              type="button"
              onClick={runGlobalSearch}
              disabled={globalLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-brand-foreground disabled:opacity-60"
            >
              {globalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>

          {globalLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching businesses across the UK…
            </div>
          ) : globalResults === null ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Search by business name — results aren't limited to your area or business type.
            </p>
          ) : globalResults.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No businesses matched “{globalTerm}”. Try a shorter or different name.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {globalResults.map((c) => (
                <CompetitorRow key={c.id} c={c} watched={ids.has(c.id)} onToggle={() => toggle(c)} />
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
