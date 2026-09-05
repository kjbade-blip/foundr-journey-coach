import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Check, Loader2, Plus, Search, ShieldCheck, Star, Trash2 } from "lucide-react";

import { Card, Pill } from "@/components/foundr/ui";
import { discoverCore, searchBusiness } from "@/lib/business-discovery.functions";
import { useBusinessMutations, useBusinessSelection, useMyBusinesses } from "@/lib/businesses";
import { saveProfile, type PlaceSummary } from "@/lib/business-profile";
import { setMode } from "@/lib/mode";
import { ResetDemoButton } from "@/components/foundr/ResetDemoButton";
import { DEMO_OWNER_EMAIL } from "@/lib/demo-business";
import { useAuth } from "@/features/auth/auth-context";

/**
 * "My businesses" management panel: add, remove, set the primary business and
 * tick which ones the Grow screens report on. Extra businesses are a paid add-on.
 */
export function MyBusinesses() {
  const { data, isLoading } = useMyBusinesses();
  const businesses = data?.businesses ?? [];
  const activeId = data?.activeBusinessId ?? null;
  const { add, remove, activate } = useBusinessMutations();
  const { selectedIds, toggle } = useBusinessSelection(businesses);
  const { user } = useAuth();
  const isDemoOwner = (user?.email ?? "").trim().toLowerCase() === DEMO_OWNER_EMAIL;

  const search = useServerFn(searchBusiness);
  const discover = useServerFn(discoverCore);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Discover + claim & verify — the same flow as the "Discover my business" page.
  async function claimAndVerify(placeId: string) {
    setClaiming(placeId);
    setClaimError(null);
    try {
      const out = await discover({ data: { placeId } });
      if (!out) throw new Error("no details");
      saveProfile({ ...out, deep: null, edits: {}, updatedAt: new Date().toISOString() });
      setMode("grow");
      navigate({ to: "/verify" });
    } catch {
      setClaimError("We couldn't reach the business data service. Please try again.");
      setClaiming(null);
    }
  }

  useEffect(() => {
    const q = query.trim();
    if (!adding || q.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      void search({ data: { query: q } })
        .then((r) => {
          if (!cancelled) setResults(r.slice(0, 8));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, adding, search]);

  function addMatch(m: PlaceSummary) {
    const postcode = m.address.toUpperCase().match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/)?.[0] ?? null;
    add.mutate(
      {
        name: m.name,
        address: m.address,
        postcode,
        industry: m.category || null,
        placeId: m.id,
        latitude: m.lat,
        longitude: m.lng,
        source: "places",
        makeActive: businesses.length === 0,
      },
      {
        onSuccess: () => {
          setQuery("");
          setResults([]);
          setAdding(false);
        },
      },
    );
  }

  function addManual() {
    const name = query.trim();
    if (!name) return;
    add.mutate(
      { name, source: "manual", makeActive: businesses.length === 0 },
      { onSuccess: () => { setQuery(""); setResults([]); setAdding(false); } },
    );
  }

  const extras = Math.max(0, businesses.length - 1);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
            <Building2 className="h-4 w-4" /> My businesses
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Add every business you run. Tick the ones you want the Grow screens to report on.
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add a business
        </button>
      </div>

      {adding && (
        <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
          <label htmlFor="add-business" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Search by business name or area — the same search as “Discover my business”
          </label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="add-business"
              name="organization"
              autoComplete="organization"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Kristian's Coffee"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-10 text-sm outline-none focus:border-brand-dark"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>

          {results.length > 0 && (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => addMatch(m)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{m.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[m.address, m.category].filter(Boolean).join(" · ") || "No address listed"}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-brand-dark" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.trim().length >= 3 && !searching && results.length === 0 && (
            <button onClick={addManual} className="mt-3 text-sm font-semibold text-brand-dark hover:underline">
              No match — add “{query.trim()}” manually
            </button>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Your first business is included in your plan. Each additional business is £15 per month (or £150 a year).
          </p>
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your businesses…
          </div>
        ) : businesses.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No businesses added yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {businesses.map((b) => {
              const checked = selectedIds.includes(b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                  <button
                    onClick={() => toggle(b.id)}
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={`Include ${b.name} in Grow screens`}
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                      checked ? "border-brand-dark bg-brand-dark text-white" : "border-border bg-background"
                    }`}
                  >
                    {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{b.name}</span>
                      {b.id === activeId && <Pill tone="brand">Primary</Pill>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[b.address || b.postcode, b.industry].filter(Boolean).join(" · ") || "No details on file"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDemoOwner && (
                      <ResetDemoButton
                        label="Reset listing"
                        placeId={b.placeId ?? b.id}
                        to="/app/business-profile"
                        className="!px-3 !py-1.5 !text-xs"
                      />
                    )}

                    {b.id !== activeId && (
                      <button
                        onClick={() => activate.mutate(b.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        <Star className="h-3.5 w-3.5" /> Make primary
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${b.name} from your profile?`)) remove.mutate(b.id);
                      }}
                      aria-label={`Remove ${b.name}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-[color:var(--destructive,#b91c1c)] hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {extras > 0 && (
        <p className="mt-3 rounded-xl bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
          {extras} additional {extras === 1 ? "business" : "businesses"} on your account — £{extras * 15} per month
          (or £{extras * 150} a year).
        </p>
      )}
    </Card>
  );
}
