import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Building2, Check, Loader2, Rocket, Search, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { Logo } from "@/components/foundr/Logo";
import { ResetDemoButton } from "@/components/foundr/ResetDemoButton";
import { DEMO_OWNER_EMAIL } from "@/lib/demo-business";
import { setMode } from "@/lib/mode";
import { useAuth } from "@/features/auth/auth-context";
import {
  findBusinessMatches,
  enrichBusinessMatch,
  getOnboardingState,
  saveOnboardingProfile,
  setActiveBusiness,
} from "@/lib/onboarding.functions";
import type { ActiveBusiness, BusinessMatch, OnboardingPath } from "@/lib/onboarding/types";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up your profile · Found-r" },
      {
        name: "description",
        content:
          "Tell Found-r whether you're opening a business or growing one, and we'll tailor your dashboard, data and next steps.",
      },
      { property: "og:title", content: "Set up your profile · Found-r" },
      {
        property: "og:description",
        content: "A two-minute setup that personalises your Found-r experience around you and your business.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const DRAFT_KEY = "foundr:onboarding-draft";

interface Draft {
  path: OnboardingPath | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  postcode: string;
  roleTitle: string;
  linkedinUrl: string;
  websiteUrl: string;
  instagramUrl: string;
  xUrl: string;
  otherUrl: string;
}

const EMPTY: Draft = {
  path: null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  postcode: "",
  roleTitle: "",
  linkedinUrl: "",
  websiteUrl: "",
  instagramUrl: "",
  xUrl: "",
  otherUrl: "",
};

function readDraft(): Draft {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function Field({
  label,
  optional,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">
        {label}
        {optional && <span className="ml-1.5 text-xs font-medium text-muted-foreground">Optional</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand/40"
      />
    </label>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          Step {step} of {total}
        </span>
        <span>{Math.round((step / total) * 100)}% complete</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [business, setBusiness] = useState<ActiveBusiness | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadState = useServerFn(getOnboardingState);
  const saveProfile = useServerFn(saveOnboardingProfile);
  const saveBusiness = useServerFn(setActiveBusiness);

  // Restore the local draft first (instant), then reconcile with saved data.
  useEffect(() => {
    setDraft(readDraft());
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || loadedRef.current) return;
    loadedRef.current = true;
    void loadState()
      .then((state) => {
        setBusiness(state.activeBusiness);
        setDraft((d) => ({
          ...d,
          path: d.path ?? state.profile.path,
          firstName: d.firstName || state.profile.firstName,
          lastName: d.lastName || state.profile.lastName,
          email: d.email || state.profile.email || user?.email || "",
          phone: d.phone || state.profile.phone,
          location: d.location || state.profile.location,
          postcode: d.postcode || state.profile.postcode,
          roleTitle: d.roleTitle || state.profile.roleTitle,
          linkedinUrl: d.linkedinUrl || state.profile.linkedinUrl,
          websiteUrl: d.websiteUrl || state.profile.websiteUrl,
          instagramUrl: d.instagramUrl || state.profile.instagramUrl,
          xUrl: d.xUrl || state.profile.xUrl,
          otherUrl: d.otherUrl || state.profile.otherUrl,
        }));
      })
      .catch(() => undefined);
  }, [status, user, loadState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const totalSteps = draft.path === "grow_business" ? 3 : 2;
  const currentStep = step + 1;

  const complete = useMutation({
    mutationFn: async () => {
      await saveProfile({
        data: {
          path: draft.path ?? "open_business",
          firstName: draft.firstName,
          lastName: draft.lastName,
          email: draft.email,
          phone: draft.phone,
          location: draft.location,
          postcode: draft.postcode,
          roleTitle: draft.roleTitle,
          linkedinUrl: draft.linkedinUrl,
          websiteUrl: draft.websiteUrl,
          instagramUrl: draft.instagramUrl,
          xUrl: draft.xUrl,
          otherUrl: draft.otherUrl,
          complete: true,
        },
      });
    },
    onSuccess: () => {
      setMode(draft.path === "grow_business" ? "grow" : "start");
      if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
      void navigate({ to: "/app/dashboard" });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save your profile"),
  });

  function choosePath(path: OnboardingPath) {
    set({ path });
    setStep(1);
  }

  const needsAuth = status === "unauthenticated";

  return (
    <div className="min-h-screen bg-hero-gradient">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-center justify-between gap-4">
          <Logo className="h-10" />
          {step > 0 && (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
        </div>

        <div className="mt-8">
          <Progress step={currentStep} total={totalSteps} />
        </div>

        {needsAuth && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm">
            You'll need a Found-r account to save this.{" "}
            <button
              className="font-semibold text-brand-dark underline"
              onClick={() => void navigate({ to: "/register", search: { redirect: "/onboarding" } })}
            >
              Create your account
            </button>
          </div>
        )}

        {step === 0 && <PathStep selected={draft.path} onSelect={choosePath} />}

        {step === 1 && draft.path === "grow_business" && (
          <BusinessStep
            business={business}
            onSelected={(b) => {
              setBusiness(b);
              set({ websiteUrl: draft.websiteUrl || (b.website ?? ""), postcode: draft.postcode || (b.postcode ?? "") });
              setStep(2);
            }}
            saveBusiness={saveBusiness}
          />
        )}

        {((step === 1 && draft.path === "open_business") || (step === 2 && draft.path === "grow_business")) && (
          <DetailsStep
            draft={draft}
            set={set}
            grow={draft.path === "grow_business"}
            business={business}
            onChangeBusiness={() => setStep(1)}
            onSubmit={() => {
              setError(null);
              complete.mutate();
            }}
            pending={complete.isPending}
            error={error}
          />
        )}

        <ToolsPanel email={user?.email ?? null} business={business} />
      </div>
    </div>
  );
}

/** Quick links to AI Discovery, ownership claiming and (for the demo owner) the demo reset. */
function ToolsPanel({ email, business }: { email: string | null; business: ActiveBusiness | null }) {
  const navigate = useNavigate();
  const isDemoOwner = (email ?? "").trim().toLowerCase() === DEMO_OWNER_EMAIL;

  return (
    <div className="mt-12 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="text-lg">Business tools</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Build your intelligence profile automatically, or prove you're authorised to manage
        {business ? ` ${business.name}` : " your business"}.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void navigate({ to: "/discover" })}
          className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-left transition hover:border-brand-dark/40 hover:bg-muted/40"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">AI Discovery</span>
            <span className="block text-sm text-muted-foreground">
              Find your business and let Found-r build the full profile for you.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => void navigate({ to: "/verify" })}
          className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-left transition hover:border-brand-dark/40 hover:bg-muted/40"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Claim this business</span>
            <span className="block text-sm text-muted-foreground">
              Verify ownership by Google Business Profile, business email or phone.
            </span>
          </span>
        </button>
      </div>

      {isDemoOwner && (
        <div className="mt-5 border-t border-border pt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo controls</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Reset the synthetic demo listing so the claim flow can be tested from a clean slate.
          </p>
          <ResetDemoButton className="mt-3" to="/discover" />
        </div>
      )}
    </div>
  );
}

function PathStep({ selected, onSelect }: { selected: OnboardingPath | null; onSelect: (p: OnboardingPath) => void }) {
  const cards = [
    {
      id: "open_business" as const,
      icon: Rocket,
      title: "Open a business",
      body: "Get set up with the tools and guidance to launch.",
    },
    {
      id: "grow_business" as const,
      icon: TrendingUp,
      title: "Grow my business",
      body: "Tell us about your existing business so we can personalise your Found-r experience.",
    },
  ];
  return (
    <div className="mt-10">
      <h1 className="text-balance text-4xl tracking-tight sm:text-5xl">What are you here to do?</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        This shapes your dashboard, your data and the next steps Found-r puts in front of you. You can change it later.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          const active = selected === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`rounded-3xl border bg-card p-6 text-left shadow-soft transition hover:-translate-y-0.5 sm:p-7 ${
                active ? "border-brand-dark ring-2 ring-brand" : "border-border hover:border-brand-dark/30"
              }`}
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-brand-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-2xl">{c.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-dark">
                Choose this <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BusinessStep({
  business,
  onSelected,
  saveBusiness,
}: {
  business: ActiveBusiness | null;
  onSelected: (b: ActiveBusiness) => void;
  saveBusiness: ReturnType<typeof useServerFn<typeof setActiveBusiness>>;
}) {
  const find = useServerFn(findBusinessMatches);
  const enrich = useServerFn(enrichBusinessMatch);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BusinessMatch[] | null>(null);
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualNumber, setManualNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const search = useMutation({
    mutationFn: async (q: string) => find({ data: { query: q } }),
    onSuccess: (r) => {
      setResults(r);
    },
    onError: () => setError("Search failed — try a different term or enter your details manually."),
  });

  const choose = useMutation({
    mutationFn: async (match: BusinessMatch) => {
      const full = match.placeId
        ? await enrich({
            data: {
              key: match.key,
              name: match.name,
              address: match.address,
              postcode: match.postcode,
              companyNumber: match.companyNumber,
              status: match.status,
              industry: match.industry,
              website: match.website,
              placeId: match.placeId,
              latitude: match.latitude,
              longitude: match.longitude,
              source: match.source,
            },
          })
        : match;
      return saveBusiness({
        data: {
          name: full.name,
          companyNumber: full.companyNumber,
          address: full.address,
          postcode: full.postcode,
          status: full.status,
          industry: full.industry,
          website: full.website,
          placeId: full.placeId,
          latitude: full.latitude,
          longitude: full.longitude,
          source: full.source,
        },
      });
    },
    onSuccess: onSelected,
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save that business"),
  });

  const saveManual = useMutation({
    mutationFn: async () =>
      saveBusiness({
        data: {
          name: manualName.trim(),
          companyNumber: manualNumber.trim() || null,
          address: manualAddress.trim() || null,
          postcode: null,
          status: null,
          industry: null,
          website: null,
          placeId: null,
          latitude: null,
          longitude: null,
          source: "manual",
        },
      }),
    onSuccess: onSelected,
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save that business"),
  });

  const busy = search.isPending || choose.isPending || saveManual.isPending;

  // Autofill: suggest matches as the user types (debounced).
  const lastQueried = useRef("");
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const t = setTimeout(() => {
      if (lastQueried.current === q || search.isPending) return;
      lastQueried.current = q;
      setError(null);
      search.mutate(q);
    }, 400);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <div className="mt-10">
      <h1 className="text-balance text-3xl tracking-tight sm:text-4xl">Find your business</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Search by business name, company number, website or postcode. We'll pull in what's published so you don't have
        to type it.
      </p>

      {business && (
        <div className="mt-6 rounded-3xl border border-brand-dark/30 bg-card p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand text-brand-foreground">
              <Check className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-muted-foreground">Currently selected</div>
              <div className="truncate text-lg font-bold">{business.name}</div>
              {business.address && <div className="text-sm text-muted-foreground">{business.address}</div>}
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (query.trim().length >= 2) search.mutate(query.trim());
        }}
        className="mt-6 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft"
      >
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Kristian's Coffee, 09876543, SW11 3AB"
          autoComplete="organization"
          name="organization"
          aria-label="Business name, company number or postcode"
          className="w-full bg-transparent text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy || query.trim().length < 2}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Search
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {results && results.length > 0 && (
        <ul className="mt-5 space-y-2">
          {results.map((r) => (
            <li key={r.key}>
              <button
                disabled={busy}
                onClick={() => {
                  setError(null);
                  choose.mutate(r);
                }}
                className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-brand-dark/40 hover:bg-muted/40 disabled:opacity-60"
              >
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-dark" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{r.name}</span>
                  {r.address && <span className="block text-sm text-muted-foreground">{r.address}</span>}
                  <span className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {r.companyNumber && <Tag>No. {r.companyNumber}</Tag>}
                    {r.status && <Tag>{r.status}</Tag>}
                    {r.industry && <Tag>{r.industry}</Tag>}
                    <Tag>{r.source === "companies_house" ? "Companies House" : "Google"}</Tag>
                  </span>
                </span>
                {choose.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {results && results.length === 0 && (
        <p className="mt-5 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No matches for that search. Enter your business details manually below — you can refine them later.
        </p>
      )}

      <div className="mt-6">
        {!manual ? (
          <button onClick={() => setManual(true)} className="text-sm font-semibold text-brand-dark underline">
            Can't find it? Enter your business manually
          </button>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="text-lg">Enter your business</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Business name" value={manualName} onChange={setManualName} />
              <Field label="Company number" optional value={manualNumber} onChange={setManualNumber} />
              <div className="sm:col-span-2">
                <Field label="Address or postcode" optional value={manualAddress} onChange={setManualAddress} />
              </div>
            </div>
            <button
              disabled={busy || manualName.trim().length < 2}
              onClick={() => {
                setError(null);
                saveManual.mutate();
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saveManual.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Use this business
            </button>
          </div>
        )}
      </div>

      {business && (
        <button
          onClick={() => onSelected(business)}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted"
        >
          Continue with {business.name} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5">{children}</span>;
}

function DetailsStep({
  draft,
  set,
  grow,
  business,
  onChangeBusiness,
  onSubmit,
  pending,
  error,
}: {
  draft: Draft;
  set: (p: Partial<Draft>) => void;
  grow: boolean;
  business: ActiveBusiness | null;
  onChangeBusiness: () => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
}) {
  const canSubmit = useMemo(
    () => draft.firstName.trim().length > 0 && draft.lastName.trim().length > 0 && draft.email.trim().length > 3,
    [draft],
  );

  return (
    <form
      className="mt-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit && !pending) onSubmit();
      }}
    >
      <h1 className="text-balance text-3xl tracking-tight sm:text-4xl">
        {grow ? "About you" : "Tell us about you"}
      </h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Your profile helps us tailor recommendations and connect your work across Found-r.
      </p>

      {grow && business && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your business</div>
            <div className="truncate font-bold">{business.name}</div>
            {business.address && <div className="truncate text-sm text-muted-foreground">{business.address}</div>}
          </div>
          <button type="button" onClick={onChangeBusiness} className="text-sm font-semibold text-brand-dark underline">
            Change business
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="First name" value={draft.firstName} onChange={(v) => set({ firstName: v })} autoComplete="given-name" />
        <Field label="Last name" value={draft.lastName} onChange={(v) => set({ lastName: v })} autoComplete="family-name" />
        <Field label="Email address" type="email" value={draft.email} onChange={(v) => set({ email: v })} autoComplete="email" />
        <Field label="Mobile number" value={draft.phone} onChange={(v) => set({ phone: v })} autoComplete="tel" />
        {grow ? (
          <Field label="Your role at the business" value={draft.roleTitle} onChange={(v) => set({ roleTitle: v })} />
        ) : (
          <>
            <Field
              label="Location / postcode"
              value={draft.location}
              onChange={(v) => set({ location: v })}
              placeholder="e.g. Wakefield or WF1 1AA"
            />
            <Field label="Role or professional background" value={draft.roleTitle} onChange={(v) => set({ roleTitle: v })} />
          </>
        )}
        <div className={grow ? "" : "sm:col-span-2"}>
          <Field
            label="LinkedIn profile"
            value={draft.linkedinUrl}
            onChange={(v) => set({ linkedinUrl: v })}
            placeholder="linkedin.com/in/…"
          />
        </div>
      </div>

      <details className="mt-6 rounded-2xl border border-border bg-card p-5">
        <summary className="cursor-pointer text-sm font-semibold">Add other profiles (optional)</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Company website" optional value={draft.websiteUrl} onChange={(v) => set({ websiteUrl: v })} />
          <Field label="Instagram" optional value={draft.instagramUrl} onChange={(v) => set({ instagramUrl: v })} />
          <Field label="X / Twitter" optional value={draft.xUrl} onChange={(v) => set({ xUrl: v })} />
          <Field label="Other URL" optional value={draft.otherUrl} onChange={(v) => set({ otherUrl: v })} />
        </div>
      </details>

      <p className="mt-5 text-xs text-muted-foreground">
        {grow
          ? "We use your business details only to personalise your Found-r experience — your analyses, alerts and recommendations. You can edit or remove them at any time in Settings."
          : "You can complete anything you skip later from Settings."}
      </p>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit || pending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-3.5 text-base font-semibold text-white shadow-pop transition hover:opacity-95 disabled:opacity-60 sm:w-auto"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {grow ? "Save profile and continue" : "Continue to Found-r"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
