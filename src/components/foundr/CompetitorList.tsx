import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Globe, Loader2, MapPin, Phone, Star } from "lucide-react";
import { getPlaceDetails } from "@/lib/maps.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type Competitor = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  reviews: number | null;
};

const PRICE_LABEL: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "£",
  PRICE_LEVEL_MODERATE: "££",
  PRICE_LEVEL_EXPENSIVE: "£££",
  PRICE_LEVEL_VERY_EXPENSIVE: "££££",
};

function CompetitorDetail({ placeId }: { placeId: string }) {
  const detailsFn = useServerFn(getPlaceDetails);
  const { data, isPending, isError } = useQuery({
    queryKey: ["place-details", placeId],
    queryFn: () => detailsFn({ data: { placeId } }),
  });

  if (isPending) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading competitor details…
      </div>
    );
  }
  if (isError || !data) {
    return <div className="py-8 text-sm text-muted-foreground">Couldn’t load details for this competitor.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {data.rating !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-semibold">
            <Star className="h-3.5 w-3.5" /> {data.rating} · {data.reviews ?? 0} reviews
          </span>
        )}
        {data.category && <span className="rounded-full bg-muted px-3 py-1 font-semibold">{data.category}</span>}
        {data.priceLevel && (
          <span className="rounded-full bg-muted px-3 py-1 font-semibold">
            {PRICE_LABEL[data.priceLevel] ?? data.priceLevel}
          </span>
        )}
        {data.businessStatus && data.businessStatus !== "OPERATIONAL" && (
          <span className="rounded-full bg-muted px-3 py-1 font-semibold">{data.businessStatus.replace(/_/g, " ")}</span>
        )}
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{data.address}</span>
        </div>
        {data.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <a href={`tel:${data.phone}`} className="underline-offset-2 hover:underline">{data.phone}</a>
          </div>
        )}
        {data.website && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <a href={data.website} target="_blank" rel="noreferrer" className="truncate underline-offset-2 hover:underline">
              {data.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}
      </div>

      {data.openingHours.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opening hours</div>
          <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
            {data.openingHours.map((h) => <li key={h}>{h}</li>)}
          </ul>
        </div>
      )}

      {data.topReviews.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent reviews</div>
          <ul className="mt-2 space-y-3">
            {data.topReviews.map((r, i) => (
              <li key={i} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{r.author}</span>
                  <span>{r.rating ? `★ ${r.rating}` : ""} {r.when}</span>
                </div>
                <p className="mt-1.5 text-muted-foreground">{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.mapsUri && (
        <a
          href={data.mapsUri}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-full bg-brand-dark px-4 py-2 text-xs font-semibold text-white"
        >
          View on Google Maps
        </a>
      )}
    </div>
  );
}

export function CompetitorList({ places }: { places: Competitor[] }) {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Competitor | null>(null);

  if (places.length === 0) return null;
  const visible = showAll ? places : places.slice(0, 6);

  return (
    <>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {visible.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setSelected(p)}
              className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:border-brand-dark hover:bg-muted"
            >
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-dark text-xs font-bold text-white">
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground">{p.address}</div>
                {p.rating !== null && (
                  <div className="mt-1 text-xs">★ {p.rating} · {p.reviews ?? 0} reviews</div>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {places.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
        >
          {showAll ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Show top 6</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Show all {places.length} competitors</>
          )}
        </button>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>Competitor intelligence from Google Maps</DialogDescription>
          </DialogHeader>
          {selected && <CompetitorDetail placeId={selected.id} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
