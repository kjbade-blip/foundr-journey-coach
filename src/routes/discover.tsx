import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, MapPin, Star, ArrowRight, Loader2, Building2, Globe, Phone } from "lucide-react";
import { Logo } from "@/components/foundr/Logo";
import { searchBusiness, discoverCore } from "@/lib/business-discovery.functions";
import { saveProfile, type PlaceSummary } from "@/lib/business-profile";
import { setMode } from "@/lib/mode";
import { DiscoveryEngine } from "@/components/foundr/discovery/DiscoveryEngine";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover your business · Found-r" },
      { name: "description", content: "Search for your business and let the Found-r AI Discovery Engine build your complete intelligence profile automatically." },
      { property: "og:title", content: "Discover your business · Found-r" },
      { property: "og:description", content: "Search for your business and let Found-r build your complete AI business profile in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

function Discover() {
  const navigate = useNavigate();
  const search = useServerFn(searchBusiness);
  const discover = useServerFn(discoverCore);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<PlaceSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (picked || q.trim().length < 3) { setResults([]); return; }
    const id = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await search({ data: { query: q.trim() } });
        if (seq.current === id) setResults(r);
      } finally {
        if (seq.current === id) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, picked, search]);

  async function confirm(p: PlaceSummary) {
    setRunning(true);
    setError(null);
    try {
      const out = await discover({ data: { placeId: p.id } });
      if (!out) throw new Error("no details");
      saveProfile({ ...out, deep: null, edits: {}, updatedAt: new Date().toISOString() });
      setReady(true);
    } catch {
      setError("We couldn't reach the business data service. Please try again.");
      setRunning(false);
    }
  }

  function finish() {
    setMode("grow");
    navigate({ to: "/app/business-profile" });
  }

  return (
    <div className="min-h-screen bg-hero-gradient">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-12 sm:px-6">
        <Logo className="h-10" />

        {running ? (
          <div className="mt-14 w-full">
            <DiscoveryEngine businessName={picked?.name ?? "your business"} done={ready} onFinished={finish} />
          </div>
        ) : picked ? (
          <div className="mt-12 w-full max-w-xl rounded-3xl border border-border bg-card p-7 shadow-pop">
            <div className="text-xs font-bold uppercase tracking-widest text-brand-dark">Step 1 · Confirm</div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Is this your business?</h1>
            <div className="mt-5 rounded-2xl border border-border bg-background p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-lg font-bold">{picked.name}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {picked.address}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">{picked.category}</span>
                    {picked.rating != null && (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Star className="h-3.5 w-3.5 fill-current text-[color:var(--warning)]" />
                        {picked.rating} · {picked.reviews ?? 0} reviews
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => confirm(picked)}
                className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white"
              >
                Yes, this is my business <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setPicked(null); setError(null); }}
                className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
              >
                Search again
              </button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Next, Found-r AI will research your website, socials, reviews, market and competitors — no forms required.
            </p>
          </div>
        ) : (
          <div className="mt-12 w-full">
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-brand-dark">Step 1 · Discover</div>
              <h1 className="mt-2 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
                Find your business
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                Start typing your business name. We'll match it to your Google Business Profile and build the rest for you.
              </p>
            </div>

            <div className="mx-auto mt-8 w-full max-w-xl">
              <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-4 shadow-pop">
                {searching ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Search className="h-5 w-5 text-muted-foreground" />}
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g. The Blue Door Café, Clapham"
                  className="w-full bg-transparent text-base outline-none"
                />
              </div>

              {results.length > 0 && (
                <ul className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => setPicked(r)}
                        className="flex w-full items-start gap-3 border-b border-border px-5 py-4 text-left last:border-b-0 hover:bg-muted"
                      >
                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-brand-dark" />
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{r.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{r.address}</div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">{r.category}</span>
                            {r.rating != null && <span>{r.rating}★ · {r.reviews ?? 0}</span>}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {q.trim().length >= 3 && !searching && results.length === 0 && (
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  No matches yet — try adding your town or postcode.
                </p>
              )}

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Globe, t: "Website analysed", d: "Products, services, tone" },
                  { icon: Star, t: "Reviews read", d: "Sentiment and themes" },
                  { icon: Phone, t: "Listings checked", d: "Contact and hours" },
                ].map((f) => (
                  <div key={f.t} className="rounded-2xl border border-border bg-card p-4">
                    <f.icon className="h-4 w-4 text-brand-dark" />
                    <div className="mt-2 text-sm font-bold">{f.t}</div>
                    <div className="text-xs text-muted-foreground">{f.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
