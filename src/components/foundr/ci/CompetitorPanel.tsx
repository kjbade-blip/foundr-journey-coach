import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, MapPin, Star } from "lucide-react";
import { Card, Pill } from "@/components/foundr/ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCompetitorHistory, setCompetitorStatus } from "@/lib/ci.functions";
import { metresToMiles, STATUS_LABEL, type CIBusiness, type CICompetitor, type CompetitorStatus } from "@/lib/ci/types";
import { classifyCandidate } from "@/lib/competition/match";
import { CompetitorSearch } from "@/components/foundr/ci/CompetitorSearch";

const STATUS_TONE: Record<CompetitorStatus, "good" | "brand" | "neutral" | "warn"> = {
  tracked: "brand",
  user_added: "brand",
  identified: "neutral",
  dismissed: "neutral",
  inactive: "warn",
};

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="text-xs text-muted-foreground">Not enough history yet to draw a trend.</p>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 26}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full">
      <polyline points={pts} fill="none" stroke="var(--brand-dark)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CompetitorDetail({ competitor, businessType }: { competitor: CICompetitor; businessType: string }) {
  const historyFn = useServerFn(getCompetitorHistory);
  const { data, isPending } = useQuery({
    queryKey: ["ci-history", competitor.id],
    queryFn: () => historyFn({ data: { competitorId: competitor.id, days: 365 } }),
  });

  const ratings = useMemo(
    () => (data?.snapshots ?? []).map((s) => s.rating).filter((r): r is number => r !== null),
    [data],
  );
  const reviews = useMemo(
    () => (data?.snapshots ?? []).map((s) => s.reviews).filter((r): r is number => r !== null),
    [data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <Pill tone={STATUS_TONE[competitor.status]}>{STATUS_LABEL[competitor.status]}</Pill>
        <span className="rounded-full bg-muted px-3 py-1 font-semibold">{metresToMiles(competitor.distanceM)}</span>
        {competitor.rating !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-semibold">
            <Star className="h-3.5 w-3.5" /> {competitor.rating} · {competitor.reviews ?? 0} reviews
          </span>
        )}
        {competitor.category && <span className="rounded-full bg-muted px-3 py-1 font-semibold">{competitor.category}</span>}
      </div>

      <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Why this is a competitor: </span>
        {classifyCandidate(businessType, { category: competitor.category, name: competitor.name }).reason}
      </p>

      {competitor.address && (
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{competitor.address}</span>
        </div>
      )}

      {isPending ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading observation history…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rating over time</div>
              <Sparkline values={ratings} />
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Review count over time</div>
              <Sparkline values={reviews} />
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Change history</div>
            {(data?.changes ?? []).length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">No changes recorded for this business yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {data!.changes.map((c) => (
                  <li key={c.id} className="rounded-xl border border-border p-3 text-sm">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{c.title}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{c.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <p className="text-[11px] text-muted-foreground">
        Source: Google Places, captured by Found-r at each scan. Figures are as published by the source and are not estimates.
      </p>
    </div>
  );
}

export function CompetitorPanel({ business, competitors }: { business: CIBusiness; competitors: CICompetitor[] }) {
  const statusFn = useServerFn(setCompetitorStatus);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<CICompetitor | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);

  const update = useMutation({
    mutationFn: (v: { competitorId: string; status: CompetitorStatus }) =>
      statusFn({ data: { competitorId: v.competitorId, status: v.status, reason: null } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ci-intelligence", business.id] }),
  });

  const visible = competitors.filter((c) => (showDismissed ? true : c.status !== "dismissed"));

  return (
    <div className="space-y-4">
      <CompetitorSearch business={business} competitors={competitors} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {competitors.filter((c) => c.status === "tracked" || c.status === "user_added").length} tracked ·{" "}
          {competitors.length} found within {business.radiusMiles} miles
        </p>
        <button
          type="button"
          onClick={() => setShowDismissed((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          {showDismissed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showDismissed ? "Hide dismissed" : "Show dismissed"}
        </button>
      </div>

      {visible.length === 0 && (
        <Card>
          <p className="text-sm font-semibold">No high-confidence direct competitors found nearby</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Found-r only tracks businesses confirmed to trade primarily as the same business type. Loosely related businesses
            are deliberately excluded.
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={() => setSelected(c)} className="min-w-0 text-left">
                <h3 className="truncate text-base font-bold">{c.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {metresToMiles(c.distanceM)}
                  </span>
                  {c.rating !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3" /> {c.rating} ({c.reviews ?? 0})
                    </span>
                  )}
                </div>
              </button>
              <Pill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Pill>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Competitor score {c.competitorScore ?? "—"} · relevance {c.relevance}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Why this is a competitor: </span>
              {classifyCandidate(business.businessType, { category: c.category, name: c.name }).reason}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.status !== "tracked" && c.status !== "user_added" && (
                <button
                  type="button"
                  onClick={() => update.mutate({ competitorId: c.id, status: "tracked" })}
                  className="rounded-full bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Track
                </button>
              )}
              {c.status !== "dismissed" ? (
                <button
                  type="button"
                  onClick={() => update.mutate({ competitorId: c.id, status: "dismissed" })}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  Not a competitor
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => update.mutate({ competitorId: c.id, status: "identified" })}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  Restore
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelected(c)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                History
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>Observed history and recorded changes</DialogDescription>
          </DialogHeader>
          {selected && <CompetitorDetail competitor={selected} businessType={business.businessType} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
