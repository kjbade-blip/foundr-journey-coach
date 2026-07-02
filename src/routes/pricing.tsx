import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/foundr/Logo";
import { ArrowRight, Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Found-r" },
      { name: "description", content: "Simple plans for new and existing business owners. Start free, upgrade as you grow. Plus business coach message bundles." },
      { property: "og:title", content: "Pricing — Found-r" },
      { property: "og:description", content: "Free, Startup (£24/pm), Found-r (£49/pm) and Pro (£125/pm). Plus business coach bundles from 15p per message." },
    ],
  }),
  component: PricingPage,
});

type Tier = {
  name: string;
  tagline: string;
  price: string;
  priceNote?: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  audience: "new" | "existing" | "all";
};

const TIERS: Tier[] = [
  {
    name: "Free",
    tagline: "Scale your idea effortlessly with starter credits and dedicated support.",
    price: "£0",
    features: [
      "25 Opportunity searches /pm",
      "Found-r Journey Steps 1–2",
      "25 Found-r Coach Messages /pm",
    ],
    cta: "Start free",
    audience: "all",
  },
  {
    name: "Startup",
    tagline: "Start your business the right way with location-led opportunities.",
    price: "£24",
    priceNote: "/pm*",
    features: [
      "50 Opportunity searches /pm",
      "Found-r Journey Steps 3–11",
      "100 Found-r Coach Messages /pm",
      "Partner scheme",
      "Marketplace",
    ],
    cta: "Choose Startup",
    audience: "new",
  },
  {
    name: "Found-r",
    tagline: "Scale your business, track competitor success & insights.",
    price: "£49",
    priceNote: "/pm*",
    highlight: true,
    features: [
      "100 Opportunity searches /pm",
      "Found-r Journey Steps 3–11",
      "300 Found-r Coach Messages /pm",
      "Marketplace",
      "Community forum",
      "Competitor Intelligence",
    ],
    cta: "Choose Found-r",
    audience: "existing",
  },
  {
    name: "Pro",
    tagline: "Your all-inclusive business coach.",
    price: "£125",
    priceNote: "/pm*",
    features: [
      "Unlimited Opportunity searches /pm",
      "Found-r Journey Steps 3–11",
      "Unlimited Found-r Coach Messages /pm",
      "Marketplace",
      "Community forum",
      "Competitor Intelligence",
    ],
    cta: "Choose Pro",
    audience: "existing",
  },
];

const BUNDLES = [
  { qty: "25 Messages", price: "£4.99", cpm: "20p" },
  { qty: "50 Messages", price: "£8.99", cpm: "18p" },
  { qty: "75 Messages", price: "£11.99", cpm: "16p" },
  { qty: "100 Messages", price: "£14.99", cpm: "15p" },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-[77px]" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/" hash="product" className="hover:text-foreground">Product</Link>
            <Link to="/" hash="journey" className="hover:text-foreground">Journey</Link>
            <Link to="/" hash="intelligence" className="hover:text-foreground">Intelligence</Link>
            <Link to="/pricing" className="text-foreground">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:inline-flex">Sign in</Link>
            <Link to="/onboarding" className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-brand">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-soft">
              <Sparkles className="h-3 w-3 text-brand-dark" /> Pricing
            </span>
            <h1 className="mt-6 text-balance text-5xl font-extrabold tracking-tight text-brand-foreground sm:text-6xl">
              Plans that grow with your business.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-brand-foreground/80">
              Start free. Step up to Startup, Found-r or Pro as you launch and scale. All prices in GBP.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6">
        {/* Audience labels */}
        <div className="mb-6 hidden grid-cols-4 gap-6 lg:grid">
          <div />
          <div className="col-span-1 border-b-2 border-dashed border-border pb-2 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            For new business owners
          </div>
          <div className="col-span-2 border-b-2 border-dashed border-border pb-2 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            For existing business owners
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-3xl border p-7 shadow-soft transition ${
                t.highlight
                  ? "border-brand-dark bg-card ring-2 ring-brand-dark"
                  : "border-border bg-card"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-dark px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-2xl font-extrabold tracking-tight">{t.name}</h3>
              <p className="mt-2 min-h-[48px] text-sm text-muted-foreground">{t.tagline}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-5xl font-extrabold tracking-tight">{t.price}</span>
                {t.priceNote && <span className="pb-2 text-sm font-medium text-muted-foreground">{t.priceNote}</span>}
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" strokeWidth={3} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-8">
                <Link
                  to="/onboarding"
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-bold transition ${
                    t.highlight
                      ? "bg-brand-dark text-white hover:opacity-90"
                      : "bg-brand text-brand-foreground hover:opacity-90"
                  }`}
                >
                  {t.cta} <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="mt-3 min-h-[1em] text-center text-[11px] text-muted-foreground">
                  {t.priceNote && "*Plus VAT"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bundles */}
      <section className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-soft sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-dark">Top-ups</span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Business Coach Bundles
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Available on Startup & Found-r tiers only. Cheaper per message the more you buy.
              </p>
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-brand-dark">Bundle</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-brand-dark">Price</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-brand-dark">Cost per message</th>
                </tr>
              </thead>
              <tbody>
                {BUNDLES.map((b, i) => (
                  <tr key={b.qty} className={i % 2 ? "bg-background" : "bg-card"}>
                    <td className="px-5 py-3 font-semibold">{b.qty}</td>
                    <td className="px-5 py-3">{b.price}</td>
                    <td className="px-5 py-3">{b.cpm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-brand-dark text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Ready to find your next opportunity?</h3>
            <p className="mt-2 text-white/70">Start free — no credit card required.</p>
          </div>
          <Link to="/onboarding" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-bold text-brand-foreground hover:opacity-95">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo className="h-[34px]" />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Found-r. Clarity before commitment.</p>
        </div>
      </footer>
    </div>
  );
}
