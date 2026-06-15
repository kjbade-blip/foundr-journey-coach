import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill, Bar } from "@/components/foundr/ui";
import { Search, Filter, MapPin, Download, Share2, Sparkles, TrendingUp, AlertTriangle, ShieldCheck, Coins } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/opportunity-finder")({
  head: () => ({ meta: [{ title: "Opportunity Finder · Found-r" }] }),
  component: Finder,
});

const CATEGORIES = ["Coffee Shop","Convenience Store","Gym","Nursery","Dog Grooming","Bakery","Pharmacy","Restaurant"];

function Finder() {
  const [postcode, setPostcode] = useState("SW11");
  const [radius, setRadius] = useState(1);
  const [cat, setCat] = useState("Coffee Shop");
  const [hasResult, setHasResult] = useState(true);

  return (
    <div>
      <PageHeader
        eyebrow="Opportunity Finder"
        title="Search any postcode. Score any opportunity."
        subtitle="The Location Intelligence Engine synthesises demand, competition, property, accessibility and demographics into a single Opportunity Score."
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto]">
          <label className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Postcode or city" className="w-full bg-transparent text-sm outline-none" />
          </label>
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
          <button onClick={() => setHasResult(true)} className="rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white">Analyse</button>
        </div>
      </Card>

      {hasResult && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="overflow-hidden p-0">
            <MapView />
            <div className="border-t border-border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat} · {postcode} · {radius}mi</div>
                  <h3 className="mt-1 text-xl font-bold">12 viable sites · 4 strong opportunities</h3>
                </div>
                <div className="flex gap-2">
                  <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"><Download className="h-3.5 w-3.5" /> PDF</button>
                  <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"><Share2 className="h-3.5 w-3.5" /> Share</button>
                </div>
              </div>
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
      )}

      {hasResult && (
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
      )}
    </div>
  );
}

function MapView() {
  const pins = [
    { t: 84, x: "28%", y: "38%", primary: true },
    { t: 76, x: "62%", y: "30%" },
    { t: 71, x: "70%", y: "62%" },
    { t: 68, x: "44%", y: "70%" },
    { t: 55, x: "20%", y: "68%" },
    { t: 49, x: "82%", y: "45%" },
  ];
  return (
    <div className="relative h-[420px] w-full overflow-hidden bg-[#eef2e6]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,#A7D957_0%,transparent_42%),radial-gradient(circle_at_70%_60%,#22C55E_0%,transparent_38%),radial-gradient(circle_at_50%_80%,#F59E0B_0%,transparent_32%)] opacity-40" />
      <div className="absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(17,17,17,0.07)_95%),linear-gradient(90deg,transparent_95%,rgba(17,17,17,0.07)_95%)] bg-[length:40px_40px]" />
      <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0,50 C20,40 40,60 60,55 S90,45 100,50" stroke="#111" strokeWidth="0.3" fill="none" />
        <path d="M50,0 C45,30 55,60 50,100" stroke="#111" strokeWidth="0.3" fill="none" />
      </svg>
      {pins.map((p, i) => (
        <div key={i} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: p.x, top: p.y }}>
          <div className={`grid h-12 w-12 place-items-center rounded-full rounded-bl-none border-2 border-white text-sm font-extrabold shadow-pop ${p.primary ? "bg-brand text-brand-foreground" : "bg-brand-dark text-white"}`}>
            {p.t}
          </div>
        </div>
      ))}
      <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold backdrop-blur">Interactive map preview</div>
    </div>
  );
}
