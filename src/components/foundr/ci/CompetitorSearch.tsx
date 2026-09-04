import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2, MapPin, Search, Star } from "lucide-react";
import { Card, Pill } from "@/components/foundr/ui";
import { LocationAutocomplete } from "@/components/foundr/LocationAutocomplete";
import { addCompetitorByPlace, setCompetitorStatus } from "@/lib/ci.functions";
import { geocodeAddress, searchPlacesNearby } from "@/lib/maps.functions";
import type { CIBusiness, CICompetitor } from "@/lib/ci/types";

type Found = {
  id: string;
  name: string;
  address: string;
  category: string | null;
  rating: number | null;
  reviews: number | null;
};

export function CompetitorSearch({
  business,
  competitors,
}: {
  business: CIBusiness;
  competitors: CICompetitor[];
}) {
  const searchFn = useServerFn(searchPlacesNearby);
  const geocodeFn = useServerFn(geocodeAddress);
  const addFn = useServerFn(addCompetitorByPlace);
  const statusFn = useServerFn(setCompetitorStatus);
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [type, setType] = useState(business.businessType);
  const [area, setArea] = useState("");
  const [results, setResults] = useState<Found[] | null>(null);

  const watched = new Map(
    competitors
      .filter((c) => c.placeId && (c.status === "tracked" || c.status === "user_added"))
      .map((c) => [c.placeId!, c]),
  );

  const search = useMutation({
    mutationFn: async () => {
      const term = [name.trim(), type.trim()].filter(Boolean).join(" ").trim() || business.businessType;
      let center = { lat: business.lat, lng: business.lng };
      if (area.trim()) {
        const geo = await geocodeFn({ data: { address: `${area.trim()}, UK` } });
        if (geo) center = { lat: geo.lat, lng: geo.lng };
      }
      const places = await searchFn({
        data: { query: area.trim() ? `${term} in ${area.trim()}` : term, lat: center.lat, lng: center.lng, radius: 15000 },
      });
      return places.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        category: p.category,
        rating: p.rating,
        reviews: p.reviews,
      })) as Found[];
    },
    onSuccess: (r) => setResults(r),
  });

  const watch = useMutation({
    mutationFn: (placeId: string) => addFn({ data: { businessId: business.id, placeId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ci-intelligence", business.id] }),
  });

  const unwatch = useMutation({
    mutationFn: (competitorId: string) =>
      statusFn({ data: { competitorId, status: "dismissed", reason: "Unwatched by user" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ci-intelligence", business.id] }),
  });

  const busy = watch.isPending || unwatch.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-base font-bold">Search businesses to watch</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Start typing a business name for instant suggestions, or search by type and area, then watch the ones you want
          Found-r to monitor.
        </p>
        {watchedName && (
          <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm font-semibold">
            {watchedName} added to your watchlist.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search.mutate();
          }}
          className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
        >
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Business name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Any business name"
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand-dark"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Business type</span>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. Coffee shop"
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand-dark"
            />
          </label>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Area</span>
            <div className="mt-1.5">
              <LocationAutocomplete
                value={area}
                onChange={setArea}
                onSelect={setArea}
                placeholder={`Defaults to your ${business.radiusMiles} mile watch area`}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={search.isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-dark px-6 text-sm font-semibold text-white disabled:opacity-60"
          >
            {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
          </button>
        </form>
        {search.isError && <p className="mt-3 text-sm text-destructive">{(search.error as Error).message}</p>}
      </Card>

      {results !== null && (
        results.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">No businesses matched that search. Try a different name or area.</p>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {results.map((r) => {
              const existing = watched.get(r.id);
              return (
                <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold">{r.name}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {r.address}
                        </span>
                        {r.rating !== null && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3" /> {r.rating} ({r.reviews ?? 0})
                          </span>
                        )}
                      </div>
                    </div>
                    {existing && <Pill tone="brand">Watching</Pill>}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => (existing ? unwatch.mutate(existing.id) : watch.mutate(r.id))}
                    className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                      existing
                        ? "bg-brand text-brand-foreground hover:opacity-90"
                        : "border border-border hover:border-brand-dark hover:bg-muted"
                    }`}
                  >
                    {existing ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {existing ? "Unwatch" : "Watch"}
                  </button>
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
