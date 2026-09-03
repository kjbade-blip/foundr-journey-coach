import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2, MapPin, Star, Globe, Phone, Clock, Loader2, RefreshCw, Sparkles, Users, Target, ShieldAlert, Lock,
} from "lucide-react";
import { PageHeader, Card, Stat } from "@/components/foundr/ui";
import { HealthScore } from "@/components/foundr/discovery/HealthScore";
import { AIBadge, VerifiedBadge, EditableField, Section, Chips, BulletList } from "@/components/foundr/discovery/ProfileBits";
import { discoverDeep } from "@/lib/business-discovery.functions";
import { loadLocalVerification, METHOD_LABEL, type VerificationRecord } from "@/lib/verification";
import {
  loadProfile, saveProfile, scoreColor, scoreTone, type BusinessProfile,
} from "@/lib/business-profile";
import { ResetDemoButton } from "@/components/foundr/ResetDemoButton";
import { isDemoPlace } from "@/lib/demo-business";

export const Route = createFileRoute("/_authenticated/app/business-profile")({
  head: () => ({
    meta: [
      { title: "Business Profile · Found-r" },
      { name: "description", content: "Your AI-built business intelligence profile: health score, customer sentiment, market intelligence, competitors and growth recommendations." },
      { property: "og:title", content: "Business Profile · Found-r" },
      { property: "og:description", content: "Your AI-built business intelligence profile with health score and growth recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessProfilePage,
});

function BusinessProfilePage() {
  const runDeep = useServerFn(discoverDeep);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [verification, setVerification] = useState<VerificationRecord | null>(null);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    const v = loadLocalVerification();
    setVerification(v && p && v.placeId === p.place.id ? v : null);
  }, []);

  useEffect(() => {
    if (!profile || profile.deep || enriching) return;
    setEnriching(true);
    (async () => {
      try {
        const deep = await runDeep({
          data: { place: profile.place, core: profile.core, competitors: profile.competitors },
        });
        const next = { ...profile, deep, updatedAt: new Date().toISOString() };
        saveProfile(next);
        setProfile(next);
      } finally {
        setEnriching(false);
      }
    })();
  }, [profile, enriching, runDeep]);

  function update(mutate: (p: BusinessProfile) => BusinessProfile) {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = mutate(prev);
      saveProfile(next);
      return next;
    });
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-2xl font-extrabold">No business profile yet</h1>
        <p className="mt-2 text-muted-foreground">Search for your business and let the Found-r AI Discovery Engine build your profile.</p>
        <Link to="/discover" className="mt-6 inline-flex rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white">
          Discover my business
        </Link>
      </div>
    );
  }

  const { place, core, deep, competitors } = profile;
  const health = deep?.health.overall ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="AI Business Profile"
        title={core.tradingName || place.name}
        subtitle={place.address}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isDemoPlace(place.id) && <ResetDemoButton label="Reset demo listing" />}
            <Link to="/discover" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold">
              <RefreshCw className="h-4 w-4" /> Re-discover
            </Link>
          </div>
        }
      />

      {enriching && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-brand/15 px-5 py-3 text-sm font-semibold text-brand-dark">
          <Loader2 className="h-4 w-4 animate-spin" />
          Found-r AI is still researching in the background — deeper intelligence is being added to this profile.
        </div>
      )}

      {/* Hero: health + snapshot */}
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center">
          {deep ? <HealthScore score={health} /> : <div className="grid h-[180px] w-[180px] place-items-center text-sm text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          <div className="mt-3 text-center text-xs text-muted-foreground">Business Health Score</div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-brand-foreground"><Building2 className="h-5 w-5" /></span>
            <div className="text-lg font-bold">{place.name}</div>
            {verification ? (
              <VerifiedBadge />
            ) : (
              <Link to="/verify" className="inline-flex items-center gap-1 rounded-full bg-[color:var(--warning)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--warning)]">
                <ShieldAlert className="h-3 w-3" /> Unverified · verify now
              </Link>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info icon={MapPin} label="Address" value={place.address} />
            <Info icon={Star} label="Google rating" value={place.rating ? `${place.rating} ★ · ${place.reviews ?? 0} reviews` : "No rating yet"} />
            <Info icon={Globe} label="Website" value={place.website ?? "Not found"} />
            <Info icon={Phone} label="Phone" value={place.phone ?? "Not listed"} />
            <Info icon={Clock} label="Opening hours" value={place.openingHours[0] ? place.openingHours.join(" · ") : "Not listed"} />
            <Info icon={Target} label="Category" value={place.category} />
          </div>
        </Card>
      </div>

      {/* Signature scores */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Customer Sentiment" value={core.customer.sentiment} tone={scoreTone(core.customer.sentiment)} hint={core.customer.trend} />
        <Stat label="Market Opportunity" value={deep?.scores.marketOpportunity ?? "—"} tone={scoreTone(deep?.scores.marketOpportunity ?? 0)} hint="AI estimate" />
        <Stat label="Competition" value={deep?.scores.competition ?? "—"} tone={scoreTone(deep?.scores.competition ?? 0)} hint={`${competitors.length} nearby comparables`} />
        <Stat label="Growth Potential" value={deep?.scores.growthPotential ?? "—"} tone={scoreTone(deep?.scores.growthPotential ?? 0)} hint="AI estimate" />
      </div>

      {/* Executive summary */}
      <div className="mt-6">
        <Section title="Executive Summary" subtitle="Consultant-grade overview of your business" action={<AIBadge label="AI generated" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Summary label="What this business does" text={core.executive.whatItDoes} />
            <Summary label="Who it serves" text={core.executive.whoItServes} />
            <Summary label="Why customers choose it" text={core.executive.whyChosen} />
            <Summary label="Competitive position" text={core.executive.competitivePosition} />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <SwotBlock title="Strengths" items={core.executive.strengths} tone="good" />
            <SwotBlock title="Weaknesses" items={core.executive.weaknesses} tone="bad" />
            <SwotBlock title="Opportunities" items={core.executive.opportunities} tone="neutral" />
            <SwotBlock title="Threats" items={core.executive.threats} tone="bad" />
          </div>
        </Section>
      </div>

      {/* Business information (editable) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section
          title="Business Information"
          subtitle={verification ? "Everything Found-r found or inferred — edit anything" : "Verify ownership to unlock editing"}
        >
          {!verification && (
            <Link to="/verify" className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm font-semibold">
              <Lock className="h-4 w-4 shrink-0 text-[color:var(--warning)]" />
              Editing is locked until you verify ownership of this business.
            </Link>
          )}
          <div className={`grid gap-3 ${verification ? "" : "pointer-events-none select-none opacity-60"}`}>
            <EditableField label="Description" value={core.description} multiline onSave={(v) => update((p) => ({ ...p, core: { ...p.core, description: v } }))} />
            <EditableField label="Trading name" value={core.tradingName} ai={false} onSave={(v) => update((p) => ({ ...p, core: { ...p.core, tradingName: v } }))} />
            <EditableField label="Industry" value={core.industry} onSave={(v) => update((p) => ({ ...p, core: { ...p.core, industry: v } }))} />
            <EditableField label="Sub-category" value={core.subcategory} onSave={(v) => update((p) => ({ ...p, core: { ...p.core, subcategory: v } }))} />
            <EditableField label="Brand positioning" value={core.brandPositioning} onSave={(v) => update((p) => ({ ...p, core: { ...p.core, brandPositioning: v } }))} />
            <EditableField label="Tone of voice" value={core.toneOfVoice} onSave={(v) => update((p) => ({ ...p, core: { ...p.core, toneOfVoice: v } }))} />
            <EditableField label="Pricing position" value={core.pricingPosition} onSave={(v) => update((p) => ({ ...p, core: { ...p.core, pricingPosition: v } }))} />
            <EditableField label="Years trading" value={core.yearsTrading} onSave={(v) => update((p) => ({ ...p, core: { ...p.core, yearsTrading: v } }))} />
          </div>
        </Section>

        <div className="grid gap-6">
          <Section title="Products & Services" action={<AIBadge />}>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Products</div>
            <div className="mt-2"><Chips items={core.products} /></div>
            <div className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Services</div>
            <div className="mt-2"><Chips items={core.services} /></div>
            <div className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Unique selling points</div>
            <div className="mt-2"><Chips items={core.usps} tone="brand" /></div>
          </Section>

          <Section title="Digital Presence" subtitle="Where your business shows up online">
            <div className="grid gap-2 sm:grid-cols-2">
              {core.socials.map((s) => (
                <div key={s.platform} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
                  <span className="text-sm font-semibold">{s.platform}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background: `color-mix(in oklab, ${s.found ? "var(--success)" : "var(--muted-foreground)"} 15%, transparent)`,
                      color: s.found ? "var(--success)" : "var(--muted-foreground)",
                    }}
                  >
                    {s.found ? "Found" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Customer intelligence */}
      <div className="mt-6">
        <Section title="Customer Intelligence" subtitle="Synthesised from public reviews" action={<AIBadge />}>
          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <div className="rounded-2xl border border-border bg-background p-5 text-center">
              <div className="text-5xl font-extrabold" style={{ color: scoreColor(core.customer.sentiment) }}>{core.customer.sentiment}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Sentiment / 100</div>
              <div className="mt-2 text-xs text-muted-foreground">Trend: {core.customer.trend}</div>
            </div>
            <div>
              <p className="text-sm">{core.customer.summary}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Most praised</div>
                  <div className="mt-2"><BulletList items={core.customer.praised} tone="good" /></div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Common complaints</div>
                  <div className="mt-2"><BulletList items={core.customer.complaints} tone="bad" /></div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frequently mentioned</div>
                  <div className="mt-2"><Chips items={core.customer.mentioned} /></div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Improvement opportunities</div>
                  <div className="mt-2"><BulletList items={core.customer.improvements} /></div>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Health breakdown */}
      {deep && (
        <div className="mt-6">
          <Section title="Business Health Breakdown" subtitle="Seven weighted health categories with actions" action={<AIBadge />}>
            <div className="grid gap-4 sm:grid-cols-2">
              {deep.health.categories.map((c) => (
                <div key={c.label} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold">{c.label}</span>
                    <span className="text-sm font-extrabold" style={{ color: scoreColor(c.score) }}>{c.score}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: scoreColor(c.score) }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{c.recommendation}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Market + competitors */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Market Intelligence" subtitle="Your catchment, demand and demographics" action={<AIBadge />}>
          {deep ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ["Market saturation", deep.market.saturation],
                ["Demand", deep.market.demand],
                ["Footfall", deep.market.footfall],
                ["Population", deep.market.population],
                ["Household income", deep.market.householdIncome],
                ["Age profile", deep.market.ageProfile],
                ["Spending power", deep.market.spendingPower],
                ["Tourism", deep.market.tourism],
                ["Nearby retail", deep.market.nearbyRetail],
                ["Offices", deep.market.offices],
                ["Schools", deep.market.schools],
                ["Parking", deep.market.parking],
                ["Transport", deep.market.transport],
              ] as const).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-border bg-background p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="mt-1 text-sm">{v}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Researching your local market…</p>
          )}
        </Section>

        <Section title="Nearby Competitors" subtitle={`${competitors.length} comparable businesses found`}>
          <ul className="divide-y divide-border">
            {competitors.slice(0, 10).map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.address}</div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="font-bold">{c.rating ?? "—"}★</div>
                  <div className="text-muted-foreground">{c.reviews ?? 0} reviews</div>
                </div>
              </li>
            ))}
            {competitors.length === 0 && <li className="py-3 text-sm text-muted-foreground">No comparable businesses returned.</li>}
          </ul>
        </Section>
      </div>

      {/* Strategy */}
      {deep && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Section title="Competitive Advantages" action={<AIBadge />}>
            <BulletList items={deep.advantages} tone="good" />
          </Section>
          <Section title="Risk Factors" action={<AIBadge />}>
            <BulletList items={deep.risks} tone="bad" />
          </Section>
          <Section title="Growth Recommendations" action={<AIBadge />}>
            <BulletList items={deep.growth} />
          </Section>
          <Section title="Marketing Opportunities" action={<AIBadge />}>
            <BulletList items={deep.marketing} />
          </Section>
        </div>
      )}

      {/* Personas */}
      {deep && deep.personas.length > 0 && (
        <div className="mt-6">
          <Section title="Customer Personas" subtitle={deep.targetAudience} action={<AIBadge />}>
            <div className="grid gap-4 sm:grid-cols-3">
              {deep.personas.map((p) => (
                <div key={p.name} className="rounded-2xl border border-border bg-background p-5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-foreground"><Users className="h-4 w-4" /></span>
                  <div className="mt-3 text-sm font-bold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.age}</div>
                  <p className="mt-2 text-sm">{p.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground"><strong>Motivation:</strong> {p.motivation}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Immediate actions */}
      <div className="mt-6">
        <Section title="Immediate Recommendations" subtitle="What to do first" action={<Sparkles className="h-4 w-4 text-brand-dark" />}>
          <BulletList items={core.executive.recommendations} />
        </Section>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Confidence: {deep?.scores.aiConfidence ?? "—"}/100 · Last updated {new Date(profile.updatedAt).toLocaleString()}
        {verification && (
          <> · Verified via {METHOD_LABEL[verification.method]} on {new Date(verification.verifiedAt).toLocaleDateString()} ({verification.confidence}% confidence)</>
        )}
      </p>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-background p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="break-words text-sm"><Linkify>{value}</Linkify></div>
      </div>
    </div>
  );
}

function Summary({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <p className="mt-1 text-sm"><Linkify>{text}</Linkify></p>
    </div>
  );
}

function SwotBlock({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" | "neutral" }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-2"><BulletList items={items} tone={tone} /></div>
    </div>
  );
}
