import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ExternalLink, Info, List, MapIcon, SlidersHorizontal, X } from "lucide-react";
import { PageHeader, Card } from "@/components/foundr/ui";
import { GoogleMap, type MapMarker } from "@/components/foundr/GoogleMap";
import { RequirementsPanel } from "@/components/foundr/premises/RequirementsPanel";
import { PropertyCard } from "@/components/foundr/premises/PropertyCard";
import { PropertyDetail } from "@/components/foundr/premises/PropertyDetail";
import { AddListingForm } from "@/components/foundr/premises/AddListingForm";
import { FitBadge } from "@/components/foundr/premises/FitBadge";
import { searchPremises } from "@/lib/premises.functions";
import { assessListing, noMatchAdvice, rankAssessed, monthlyRent } from "@/lib/premises/suitability";
import { missingRequirementQuestions, profileForBusinessType, recommendedAreaRange } from "@/lib/premises/profiles";
import { defaultRequirements, usePremisesStore } from "@/lib/premises/store";
import { sourceInfoFor } from "@/lib/premises/sources";
import { PREMISES_DISCLAIMER, type AssessedListing, type PropertyRequirements } from "@/lib/premises/types";

export const Route = createFileRoute("/_authenticated/app/premises")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { type?: string; location?: string; radius?: number; capacity?: number; staff?: number; budget?: number } => {
    const num = (v: unknown) => (v != null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined);
    return {
      ...(typeof s.type === "string" ? { type: s.type } : {}),
      ...(typeof s.location === "string" ? { location: s.location } : {}),
      ...(num(s.radius) != null ? { radius: num(s.radius)! } : {}),
      ...(num(s.capacity) != null ? { capacity: num(s.capacity)! } : {}),
      ...(num(s.staff) != null ? { staff: num(s.staff)! } : {}),
      ...(num(s.budget) != null ? { budget: num(s.budget)! } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Find Premises · Found-r" },
      {
        name: "description",
        content:
          "Search UK commercial units to rent and have every advert checked against what your business actually needs — size, features, budget and operating requirements — with the source link on every result.",
      },
      { property: "og:title", content: "Find Premises · Found-r" },
      {
        property: "og:description",
        content: "Commercial premises search with a business-fit assessment on every listing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PremisesPage,
});

type Tab = "results" | "saved" | "compare";

function PremisesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const store = usePremisesStore();

  const [req, setReq] = useState<PropertyRequirements>(() =>
    defaultRequirements({
      businessTypeKey: search.type ?? "coffee_shop",
      location: search.location ?? "",
      radiusMiles: search.radius ?? 3,
      customerCapacity: search.capacity ?? null,
      staffCount: search.staff ?? null,
      budgetMonthlyMax: search.budget ?? null,
    }),
  );
  const [tab, setTab] = useState<Tab>("results");
  const [view, setView] = useState<"list" | "map">("list");
  const [strongOnly, setStrongOnly] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  // Restore saved requirements once, unless the opportunity flow supplied them.
  useEffect(() => {
    if (!store.hydrated) return;
    if (search.location || search.type) return;
    if (store.requirements) setReq(store.requirements);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.hydrated]);

  const searchFn = useServerFn(searchPremises);
  const run = useMutation({
    mutationFn: (r: PropertyRequirements) => searchFn({ data: r as never }),
    onSuccess: () => store.setRequirements(req),
  });

  useEffect(() => {
    if (store.hydrated && req.location.trim() && !run.data && !run.isPending) run.mutate(req);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.hydrated]);

  const profile = profileForBusinessType(req.businessTypeKey);
  const area = recommendedAreaRange(profile, { staffCount: req.staffCount, customerCapacity: req.customerCapacity });
  const openQuestions = missingRequirementQuestions({
    staffCount: req.staffCount,
    customerCapacity: req.customerCapacity,
    budgetMonthlyMax: req.budgetMonthlyMax,
    profile,
  });

  const allListings = useMemo(
    () => [...store.userListings, ...(run.data?.listings ?? [])],
    [store.userListings, run.data],
  );

  const assessed: AssessedListing[] = useMemo(
    () => rankAssessed(allListings.map((listing) => ({ listing, assessment: assessListing(listing, req, profile) }))),
    [allListings, req, profile],
  );

  const savedAssessed = useMemo(
    () => rankAssessed(store.saved.map((listing) => ({ listing, assessment: assessListing(listing, req, profile) }))),
    [store.saved, req, profile],
  );

  const visible = assessed
    .filter((i) => showHidden || !store.hiddenIds.includes(i.listing.id))
    .filter((i) => !strongOnly || i.assessment.status === "strong");

  const shown = tab === "saved" ? savedAssessed : tab === "compare" ? assessed.filter((i) => store.compareIds.includes(i.listing.id)) : visible;
  const openItem = [...assessed, ...savedAssessed].find((i) => i.listing.id === openId) ?? null;

  const sources = run.data?.sources ?? sourceInfoFor(req);
  const markers: MapMarker[] = shown
    .filter((i) => i.listing.latitude != null && i.listing.longitude != null)
    .map((i) => ({ lat: i.listing.latitude!, lng: i.listing.longitude!, title: i.listing.title }));
  const center = run.data?.center ?? null;

  function checkViability(item: AssessedListing) {
    try {
      window.localStorage.setItem("foundr.premises.viability", JSON.stringify(item));
    } catch {
      /* non-fatal */
    }
    void navigate({
      to: "/app/opportunity-finder",
      search: { location: item.listing.postcode ?? item.listing.addressLine ?? req.location, type: req.businessTypeKey } as never,
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Find Premises"
        title="Find a unit your business can actually trade from"
        subtitle="Found-r checks every advert against the space, features and operating requirements of your business before it talks about rent. Sources, listing dates and gaps in the data are shown on every result."
        actions={
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Desktop filters */}
        <aside className="hidden lg:block">
          <Card>
            <RequirementsPanel
              value={req}
              onChange={setReq}
              onSearch={() => run.mutate(req)}
              searching={run.isPending}
              strongOnly={strongOnly}
              onStrongOnly={setStrongOnly}
            />
          </Card>
        </aside>

        <div className="space-y-6">
          <Card className="border-[color:var(--warning)]/40 bg-[color:var(--warning)]/5">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
              <p className="text-xs text-muted-foreground">{PREMISES_DISCLAIMER}</p>
            </div>
          </Card>

          <Card>
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Your premises brief</div>
            <h2 className="mt-1 text-xl font-bold">
              {profile.label} · {req.location || "location not set"} · {area.min.toLocaleString()}–{area.max.toLocaleString()} sq ft
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {area.basis.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {openQuestions.length > 0 && (
              <div className="mt-3 rounded-xl bg-muted p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Info className="h-3.5 w-3.5" /> Answer these before Found-r will call anything a strong fit
                </div>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {openQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Tabs + view switch */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-full border border-border bg-card p-1 text-xs font-semibold">
              {([
                ["results", `Results (${visible.length})`],
                ["saved", `Saved (${store.saved.length})`],
                ["compare", `Compare (${store.compareIds.length})`],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`rounded-full px-3 py-1.5 ${tab === id ? "bg-brand-dark text-white" : "text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setShowHidden((v) => !v)}
                className="rounded-full border border-border px-3 py-1.5 font-semibold"
              >
                {showHidden ? "Hide hidden" : `Show hidden (${store.hiddenIds.length})`}
              </button>
              <div className="flex gap-1 rounded-full border border-border bg-card p-1 font-semibold">
                <button onClick={() => setView("list")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 ${view === "list" ? "bg-brand-dark text-white" : ""}`}>
                  <List className="h-3.5 w-3.5" /> List
                </button>
                <button onClick={() => setView("map")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 ${view === "map" ? "bg-brand-dark text-white" : ""}`}>
                  <MapIcon className="h-3.5 w-3.5" /> Map
                </button>
              </div>
            </div>
          </div>

          {run.isError && <Card className="text-sm text-destructive">{(run.error as Error).message}</Card>}

          {view === "map" && (
            <Card className="overflow-hidden p-0">
              <div className="h-[420px] w-full bg-muted">
                <GoogleMap
                  center={center}
                  zoom={13}
                  markers={center ? [{ lat: center.lat, lng: center.lng, primary: true, title: run.data?.resolvedLocation ?? req.location }, ...markers] : markers}
                  className="h-full w-full"
                />
              </div>
              <p className="border-t border-border p-4 text-xs text-muted-foreground">
                Units are plotted only where the source publishes a location. Where a full address is withheld, the pin is
                approximate.
              </p>
            </Card>
          )}

          {view === "list" && (
            <div className="space-y-4">
              {shown.map((item) => (
                <PropertyCard
                  key={item.listing.id}
                  item={item}
                  saved={store.saved.some((s) => s.id === item.listing.id)}
                  comparing={store.compareIds.includes(item.listing.id)}
                  hidden={store.hiddenIds.includes(item.listing.id)}
                  onOpen={() => setOpenId(item.listing.id)}
                  onSave={() => store.toggleSave(item.listing)}
                  onHide={() => store.toggleHide(item.listing.id)}
                  onCompare={() => store.toggleCompare(item.listing.id)}
                />
              ))}

              {shown.length === 0 && (
                <Card>
                  <h3 className="text-lg font-bold">
                    {tab === "results" ? "No matching premises to show yet" : tab === "saved" ? "Nothing saved yet" : "Nothing selected to compare"}
                  </h3>
                  {tab === "results" && (
                    <>
                      {(run.data?.notices ?? []).map((n) => (
                        <p key={n} className="mt-2 text-sm text-muted-foreground">
                          {n}
                        </p>
                      ))}
                      <div className="mt-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">What to change</div>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {noMatchAdvice(req, assessed).map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </Card>
              )}
            </div>
          )}

          {tab === "compare" && shown.length > 1 && <CompareTable items={shown} />}

          <AddListingForm onAdd={store.addUserListing} />

          <Card>
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Sources searched</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Found-r only uses official APIs, licensed feeds and publicly accessible search pages. Where a source has no
              approved data agreement in place, it stays in link-out mode and your criteria are carried into its own search.
            </p>
            <ul className="mt-3 divide-y divide-border">
              {sources.map((s) => (
                <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                  <div className="max-w-md">
                    <div className="text-sm font-semibold">
                      {s.name}{" "}
                      <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {s.mode === "feed" ? "Live feed" : "Link out"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.note}</p>
                  </div>
                  {s.searchUrl && (
                    <a
                      href={s.searchUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Search {s.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
            {run.data && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Last checked {new Date(run.data.checkedAt).toLocaleString("en-GB")}
                {run.data.duplicateCount > 0 && ` · ${run.data.duplicateCount} duplicate advert(s) merged`}
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden" role="dialog" aria-modal="true">
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <RequirementsPanel
              value={req}
              onChange={setReq}
              onSearch={() => {
                run.mutate(req);
                setFiltersOpen(false);
              }}
              searching={run.isPending}
              strongOnly={strongOnly}
              onStrongOnly={setStrongOnly}
            />
          </div>
        </div>
      )}

      {openItem && <PropertyDetail item={openItem} onClose={() => setOpenId(null)} onCheckViability={() => checkViability(openItem)} />}
    </div>
  );
}

function CompareTable({ items }: { items: AssessedListing[] }) {
  return (
    <Card className="overflow-x-auto">
      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Side by side</div>
      <table className="mt-3 w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2">Unit</th>
            <th>Fit</th>
            <th>Rent / month</th>
            <th>Size</th>
            <th>Main gap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map(({ listing: l, assessment: a }) => (
            <tr key={l.id}>
              <td className="py-2.5 pr-3 font-medium">{l.title}</td>
              <td className="pr-3">
                <FitBadge status={a.status} score={a.score} />
              </td>
              <td className="pr-3">{monthlyRent(l) != null ? `£${monthlyRent(l)!.toLocaleString()}` : <span className="italic text-muted-foreground">Not stated</span>}</td>
              <td className="pr-3">{l.sizeSqFt != null ? `${l.sizeSqFt.toLocaleString()} sq ft` : <span className="italic text-muted-foreground">Not stated</span>}</td>
              <td className="text-xs text-muted-foreground">{a.gaps[0] ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
