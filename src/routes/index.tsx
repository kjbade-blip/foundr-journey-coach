import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/foundr/Logo";
import { ArrowRight, MapPin, Sparkles, BarChart3, Users, ShieldCheck, Zap, Brain, Building2, Rocket, TrendingUp, Compass } from "lucide-react";
import { GoogleMap } from "@/components/foundr/GoogleMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Found-r — Clarity Before Commitment" },
      { name: "description", content: "The AI-powered operating system to discover, validate, launch and grow brick-and-mortar businesses." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-[77px]" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#product" className="hover:text-foreground">Product</a>
            <a href="#journey" className="hover:text-foreground">Journey</a>
            <a href="#intelligence" className="hover:text-foreground">Intelligence</a>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:px-4">Sign in</Link>
            <Link to="/onboarding" className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:px-4">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-brand relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Now in preview — AI-powered business intelligence
            </span>
            <h1 className="mt-6 text-balance text-5xl font-extrabold tracking-tight text-brand-foreground sm:text-6xl lg:text-7xl">
              Clarity <span className="italic text-brand-foreground/70">before</span> commitment.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-brand-foreground/80 sm:text-xl">
              Found-r is the AI operating system for brick-and-mortar businesses — discover, validate, launch and grow with the data and guidance of a top-tier consulting team.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/onboarding" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-3.5 text-base font-semibold text-white shadow-pop transition hover:opacity-95 sm:w-auto">
                Start your journey <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/app/opportunity-finder" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/40 bg-card px-6 py-3.5 text-base font-semibold text-foreground hover:bg-muted sm:w-auto">
                Try Opportunity Finder
              </Link>
            </div>
            <p className="mt-4 text-xs text-brand-foreground/60">No credit card • Free tier forever</p>
          </div>

          {/* Hero preview */}
          <div className="relative mx-auto mt-16 max-w-6xl">
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-pop">
              <HeroPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Three promises */}
      <section id="product" className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-px bg-border md:grid-cols-3">
          {[
            { icon: Compass, title: "What should I do next?", body: "Personalised guidance through every stage of starting and running a business.", tag: "Guidance" },
            { icon: BarChart3, title: "What does the data say?", body: "Location, market and competitor intelligence with an Opportunity Score out of 100.", tag: "Intelligence" },
            { icon: Users, title: "Who can help me?", body: "A vetted marketplace of accountants, agencies, finance providers and trades.", tag: "Marketplace" },
          ].map((c) => (
            <div key={c.title} className="bg-card p-8 sm:p-10">
              <span className="inline-flex rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">{c.tag}</span>
              <c.icon className="mt-6 h-7 w-7 text-brand-dark" strokeWidth={2.25} />
              <h3 className="mt-3 text-2xl font-bold">{c.title}</h3>
              <p className="mt-2 text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Journey */}
      <section id="journey" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-dark">My Business Journey</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">From a hunch to a humming high-street business — in 11 guided stages.</h2>
          <p className="mt-4 text-lg text-muted-foreground">Each stage has tasks, AI specialists, recommended suppliers and a measurable output — so you always know what to do next.</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s, i) => (
            <div key={s.title} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-bold text-brand-foreground">{i + 1}</span>
                <h3 className="font-semibold">{s.title}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{s.body}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {s.ai.map((a) => (
                  <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Brain className="mr-1 inline h-3 w-3" />{a}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Intelligence */}
      <section id="intelligence" className="bg-brand-dark text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 py-24 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand">Location Intelligence Engine</span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">An Opportunity Score for every postcode you consider.</h2>
            <p className="mt-4 text-lg text-white/70">Combine population, demand, competition, property, accessibility, demographics and local economy signals into a single, defensible score out of 100.</p>
            <ul className="mt-8 space-y-3">
              {["Market demand & spending power","Competitor density, ratings & reviews","Commercial rent & vacancies","Demographics & local economy","Revenue, startup cost & breakeven estimates"].map((x) => (
                <li key={x} className="flex items-start gap-3">
                  <span className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-brand text-brand-foreground"><Zap className="h-3 w-3" strokeWidth={3} /></span>
                  <span className="text-white/90">{x}</span>
                </li>
              ))}
            </ul>
          </div>
          <ScorePreview />
        </div>
      </section>

      {/* Two experiences */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-dark">Two experiences, one platform</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Wherever you are in your journey.</h2>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <ExperienceCard
            tone="light"
            icon={Rocket}
            title="Start a Business"
            body="For prospective founders. Discover opportunities, validate them with data, and follow an 11-stage launch roadmap."
            features={["Founder Readiness Score","Opportunity Finder","Validation reports","Funding & launch plans"]}
            cta="Plan my launch"
          />
          <ExperienceCard
            tone="dark"
            icon={TrendingUp}
            title="Grow My Business"
            body="For existing operators. Monitor competitors, react to market alerts, and let the AI Growth Advisor surface your next move."
            features={["Business Health Score","Competitor intelligence","Market & planning alerts","AI Growth Advisor"]}
            cta="Grow my business"
          />
        </div>
      </section>

      {/* Marketplace strip */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-dark">Marketplace</span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Vetted partners, one click away.</h2>
            </div>
            <Link to="/app/marketplace" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark hover:underline">
              Browse marketplace <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Accountants","Banks","Insurers","Solicitors","Finance","Marketing","Commercial Agents","POS","Utilities","Web & SEO","Recruiters"].map((c) => (
              <span key={c} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-10 shadow-soft sm:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <ShieldCheck className="h-8 w-8 text-brand-dark" />
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight">Built for serious operators.</h2>
              <p className="mt-4 text-muted-foreground">Start free. Upgrade as you unlock premium intelligence, alerts and full report exports.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Free","Starter","Professional","Growth","Enterprise"].map((t) => (
                  <span key={t} className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{t}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-brand-dark p-8 text-white">
              <Sparkles className="h-6 w-6 text-brand" />
              <h3 className="mt-3 text-2xl font-bold">Find your next business in under 10 minutes.</h3>
              <p className="mt-2 text-white/70">Try the Opportunity Finder with a postcode and a category — get a full report instantly.</p>
              <Link to="/onboarding" className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-foreground">
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-[34px]" />
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Found-r. Clarity before commitment.</p>
        </div>
      </footer>
    </div>
  );
}

const STAGES = [
  { title: "Explore", body: "Founder Readiness Score, profile and recommended industries.", ai: ["Founder Coach"] },
  { title: "Discover Opportunities", body: "Opportunity shortlist and rankings tailored to you.", ai: ["Opportunity Engine"] },
  { title: "Validate", body: "Opportunity Score, SWOT and a defensible Go / No-Go.", ai: ["Location","Competitor","Business"] },
  { title: "Plan", body: "Business plan, funding plan and launch roadmap.", ai: ["Business Planner"] },
  { title: "Build Foundations", body: "Company setup and compliance checklists.", ai: ["Compliance Advisor"] },
  { title: "Secure Funding", body: "Recommendations across grants, loans and equity.", ai: ["Funding Advisor"] },
  { title: "Find Premises", body: "Property scoring and site comparison reports.", ai: ["Location Selection"] },
  { title: "Fit Out & Setup", body: "Launch Readiness Score and supplier shortlists.", ai: ["Setup Advisor"] },
  { title: "Create Presence", body: "Brand pack, website plan and SEO plan.", ai: ["Brand","Marketing"] },
  { title: "Pre-Launch Marketing", body: "Launch campaign, social content and calendar.", ai: ["Marketing Manager"] },
  { title: "Launch", body: "Launch checklist and opening-day dashboard.", ai: ["Launch Coach"] },
];

function ExperienceCard({ tone, icon: Icon, title, body, features, cta }: any) {
  const dark = tone === "dark";
  return (
    <div className={`rounded-3xl border p-8 sm:p-10 ${dark ? "border-brand-dark bg-brand-dark text-white" : "border-border bg-card"}`}>
      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${dark ? "bg-brand text-brand-foreground" : "bg-accent text-accent-foreground"}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-3xl font-extrabold">{title}</h3>
      <p className={`mt-2 ${dark ? "text-white/70" : "text-muted-foreground"}`}>{body}</p>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f: string) => (
          <li key={f} className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-brand" : "bg-brand-dark"}`} />{f}
          </li>
        ))}
      </ul>
      <Link to="/onboarding" className={`mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold ${dark ? "bg-brand text-brand-foreground" : "bg-brand-dark text-white"}`}>
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="grid gap-px bg-border md:grid-cols-[1.2fr_1fr]">
      <div className="bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-brand-dark" /> Opportunity Finder
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">SW11 · 1 mile</span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">Speciality Coffee Shop</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { l: "Opportunity", v: 84, c: "var(--brand)" },
            { l: "Competition", v: 41 },
            { l: "Growth", v: 72 },
            { l: "Risk", v: 28 },
          ].map((m) => (
            <div key={m.l} className="rounded-xl border border-border bg-background p-3">
              <div className="text-[11px] font-medium uppercase text-muted-foreground">{m.l}</div>
              <div className="mt-1 text-2xl font-extrabold">{m.v}</div>
              <div className="mt-2 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${m.v}%`, background: m.c || "#111" }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-border bg-background p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">AI Recommendation</div>
          <p className="mt-1 text-sm">Strong demand and weak premium-coffee supply within 0.5mi. Target a 38–45 sqm unit on the north side of the high street. Estimated breakeven month 9.</p>
        </div>
      </div>
      <div className="relative min-h-[360px] overflow-hidden bg-muted">
        <GoogleMap
          center={{ lat: 51.4655, lng: -0.1696 }}
          zoom={14}
          markers={[
            { lat: 51.4655, lng: -0.1696, primary: true, label: "84", title: "Speciality Coffee · SW11" },
            { lat: 51.4690, lng: -0.1620, label: "72", title: "Site B" },
            { lat: 51.4620, lng: -0.1740, label: "61", title: "Site C" },
            { lat: 51.4680, lng: -0.1780, label: "48", title: "Site D" },
          ]}
          className="h-full min-h-[360px] w-full"
        />
      </div>
    </div>
  );
}

function ScorePreview() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Opportunity Score</span>
        <Building2 className="h-5 w-5 text-brand" />
      </div>
      <div className="mt-4 flex items-end gap-3">
        <div className="text-7xl font-extrabold text-brand">84</div>
        <div className="pb-2 text-sm text-white/70">/ 100 · Strong</div>
      </div>
      <div className="mt-6 grid gap-3">
        {[
          ["Market Demand", 88],
          ["Competition", 62],
          ["Property", 74],
          ["Accessibility", 91],
          ["Demographics", 86],
          ["Local Economy", 79],
        ].map(([l, v]) => (
          <div key={l as string}>
            <div className="flex justify-between text-xs text-white/70">
              <span>{l}</span><span>{v}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand" style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
