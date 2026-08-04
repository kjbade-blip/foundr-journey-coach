import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/foundr/ui";
import { Star, MessageSquare } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/app/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace · Found-r" }] }),
  component: Marketplace,
});

const CATS = ["All","Accountants","Banks","Insurers","Solicitors","Finance","Marketing","Commercial Agents","POS","Utilities","Web & SEO","Recruiters"];

const PARTNERS = [
  { name: "Ledger & Co", cat: "Accountants", tag: "Small business specialists", rating: 4.9, reviews: 312, price: "From £79/mo" },
  { name: "BrightBank", cat: "Banks", tag: "Free business account", rating: 4.7, reviews: 1240, price: "£0 setup" },
  { name: "ShieldSure", cat: "Insurers", tag: "Hospitality & retail cover", rating: 4.8, reviews: 521, price: "From £24/mo" },
  { name: "GrowthLab", cat: "Marketing", tag: "Local SEO + paid social", rating: 4.6, reviews: 188, price: "From £950/mo" },
  { name: "Cornerstone Property", cat: "Commercial Agents", tag: "UK high-street units", rating: 4.5, reviews: 94, price: "Negotiated" },
  { name: "Stripe Terminal Pro", cat: "POS", tag: "Card readers + dashboards", rating: 4.9, reviews: 2200, price: "From £29/mo" },
  { name: "Watt&Wire", cat: "Utilities", tag: "Multi-site energy procurement", rating: 4.4, reviews: 76, price: "Free quote" },
  { name: "Found Talent", cat: "Recruiters", tag: "Hourly hospitality hiring", rating: 4.7, reviews: 405, price: "12% placement" },
];

function Marketplace() {
  const [cat, setCat] = useState("All");
  const filtered = cat === "All" ? PARTNERS : PARTNERS.filter((p) => p.cat === cat);
  return (
    <div>
      <PageHeader eyebrow="Marketplace" title="Vetted partners for every stage." subtitle="Accountants to commercial agents — pre-screened, transparently priced." />

      <div className="mb-6 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${cat === c ? "border-brand-dark bg-brand-dark text-white" : "border-border bg-card hover:bg-muted"}`}>{c}</button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.name} className="flex flex-col">
            <div className="flex items-start justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-lg font-extrabold text-brand-foreground">{p.name[0]}</div>
              <Pill>{p.cat}</Pill>
            </div>
            <h3 className="mt-4 text-lg font-bold">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.tag}</p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-[color:var(--warning)] text-[color:var(--warning)]" />
              <span className="font-semibold">{p.rating}</span>
              <span className="text-muted-foreground">({p.reviews})</span>
            </div>
            <div className="mt-1 text-sm font-semibold">{p.price}</div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Get quote</button>
              <button className="grid h-9 w-9 place-items-center rounded-full border border-border"><MessageSquare className="h-4 w-4" /></button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
