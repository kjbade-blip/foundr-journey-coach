import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck, Star, MapPin, Loader2, Mail, Phone, ArrowLeft, ChevronRight, Lock, AlertCircle,
} from "lucide-react";
import { Logo } from "@/components/foundr/Logo";
import { VerificationSuccess } from "@/components/foundr/VerificationSuccess";
import { ResetDemoButton } from "@/components/foundr/ResetDemoButton";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { loadProfile, type BusinessProfile } from "@/lib/business-profile";
import { DEMO_CODE, isDemoPlace } from "@/lib/demo-business";
import {
  saveLocalVerification, type VerificationMethod, type VerificationMethodId, type VerificationTarget,
} from "@/lib/verification";
import { ALREADY_CLAIMED_MESSAGE, type BusinessClaim } from "@/lib/claims";
import { startBusinessClaim, requestManualReview } from "@/lib/claims.functions";
import {
  getVerificationMethods, getVerificationState, verifyWithGoogle,
  requestVerificationCode, confirmVerificationCode,
} from "@/lib/verification.functions";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify business ownership · Found-r" },
      { name: "description", content: "Verify that you're authorised to manage this business with Google Business Profile, business email or telephone verification." },
      { property: "og:title", content: "Verify business ownership · Found-r" },
      { property: "og:description", content: "Secure, enterprise-grade business ownership verification on Found-r." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: VerifyPage,
});

type Stage = "loading" | "signin" | "methods" | "code" | "done" | "blocked" | "manual" | "review_sent";

function VerifyPage() {
  const navigate = useNavigate();
  const loadMethods = useServerFn(getVerificationMethods);
  const loadState = useServerFn(getVerificationState);
  const runGoogle = useServerFn(verifyWithGoogle);
  const sendCode = useServerFn(requestVerificationCode);
  const checkCode = useServerFn(confirmVerificationCode);
  const openClaim = useServerFn(startBusinessClaim);
  const sendManualReview = useServerFn(requestManualReview);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [methods, setMethods] = useState<VerificationMethod[]>([]);
  const [busy, setBusy] = useState<VerificationMethodId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<{ method: "email" | "phone"; masked: string; targetId: string } | null>(null);
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [claim, setClaim] = useState<BusinessClaim | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  useEffect(() => { setProfile(loadProfile()); }, []);

  const ctx = useCallback(() => {
    if (!profile) return null;
    return {
      placeId: profile.place.id,
      businessName: profile.core.tradingName || profile.place.name,
      website: profile.place.website,
      phone: profile.place.phone,
      email: profile.core.email,
    };
  }, [profile]);

  useEffect(() => {
    const base = ctx();
    if (!base) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) { setStage("signin"); return; }
      try {
        // The claim record is written to the database before any verification runs.
        const claimOut = await openClaim({ data: { businessId: base.placeId, businessName: base.businessName } });
        if (cancelled) return;
        if (!claimOut.ok) {
          if (claimOut.alreadyClaimed) { setStage("blocked"); return; }
          setError(claimOut.error ?? "We couldn't create your ownership claim. Please try again.");
          setStage("blocked");
          return;
        }
        setClaim(claimOut.claim);
        if (claimOut.claim.status === "verified") { setStage("done"); return; }

        const existing = await loadState({ data: { placeId: base.placeId } });
        if (cancelled) return;
        if (existing) {
          saveLocalVerification(existing);
          setStage("done");
          return;
        }
        const m = await loadMethods({ data: base });
        if (cancelled) return;
        setMethods(m);
        setStage("methods");
      } catch {
        if (!cancelled) { setError("We couldn't load verification options. Please try again."); setStage("methods"); }
      }
    })();
    return () => { cancelled = true; };
  }, [ctx, loadMethods, loadState, openClaim]);

  async function submitManualReview() {
    const base = ctx();
    if (!base || reviewMessage.trim().length < 10) return;
    setReviewBusy(true); setError(null);
    try {
      const out = await sendManualReview({
        data: { businessId: base.placeId, businessName: base.businessName, message: reviewMessage.trim() },
      });
      if (!out.ok) { setError(out.error ?? "We couldn't submit your review request."); return; }
      setStage("review_sent");
    } catch {
      setError("We couldn't submit your review request. Please try again.");
    } finally { setReviewBusy(false); }
  }


  async function signIn() {
    setError(null);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/verify`,
    });
    if (res.error) { setError("Google sign-in failed. Please try again."); return; }
    if (!res.redirected) window.location.reload();
  }

  async function doGoogle() {
    const base = ctx();
    if (!base) return;
    setBusy("google"); setError(null);
    try {
      const out = await runGoogle({ data: base });
      if (!out.ok) { setError(out.error); return; }
      saveLocalVerification(out.record);
      setSuccess(true);
    } catch {
      setError("Verification failed. Please try another method.");
    } finally { setBusy(null); }
  }

  async function startCode(method: "email" | "phone", target: VerificationTarget) {
    const base = ctx();
    if (!base) return;
    setBusy(method); setError(null);
    try {
      const out = await sendCode({ data: { ...base, method, targetId: target.id } });
      if (!out.ok) { setError(out.error); return; }
      setActive({ method, masked: out.masked, targetId: target.id });
      setCode("");
      setStage("code");
    } catch {
      setError("We couldn't send that code. Please try another method.");
    } finally { setBusy(null); }
  }

  async function submitCode() {
    const base = ctx();
    if (!base || code.replace(/\D/g, "").length !== 6) return;
    setBusy(active?.method ?? "email"); setError(null);
    try {
      const out = await checkCode({ data: { placeId: base.placeId, businessName: base.businessName, code } });
      if (!out.ok) { setError(out.error); return; }
      saveLocalVerification(out.record);
      setSuccess(true);
    } catch {
      setError("We couldn't check that code. Please try again.");
    } finally { setBusy(null); }
  }

  if (!profile) {
    return (
      <Shell>
        <div className="mt-16 text-center">
          <h1 className="text-2xl font-extrabold">No business to verify yet</h1>
          <p className="mt-2 text-muted-foreground">Find your business first and we'll build your profile.</p>
          <Link to="/discover" className="mt-6 inline-flex rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white">
            Discover my business
          </Link>
        </div>
      </Shell>
    );
  }

  const place = profile.place;

  return (
    <Shell>
      {success && (
        <VerificationSuccess
          businessName={profile.core.tradingName || place.name}
          onDone={() => navigate({ to: "/app/business-profile" })}
        />
      )}

      <div className="mt-10 w-full max-w-2xl">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-brand-dark">Step 3 · Verify</div>
          <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">Verify business ownership</h1>
        </div>

        {/* Business summary */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-pop">
          <div className="flex items-start gap-4 p-6">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand text-brand-foreground">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <div className="text-lg font-bold">{place.name}</div>
              <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{place.address}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">{place.category}</span>
                {place.rating != null && (
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Star className="h-3.5 w-3.5 fill-current text-[color:var(--warning)]" />
                    {place.rating} · {place.reviews ?? 0} reviews
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 rounded-2xl border border-border bg-brand/12 px-5 py-4 text-sm font-semibold text-brand-dark">
          To protect business owners and maintain the integrity of the Found-r platform, we need to verify that you're
          authorised to manage this business.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {stage === "loading" && (
          <div className="mt-8 grid gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        )}

        {stage === "signin" && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-lg font-bold">Sign in to continue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Verification is tied to your Found-r account so only you can manage this business.
            </p>
            <button
              onClick={signIn}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white"
            >
              Continue with Google
            </button>
          </div>
        )}

        {stage === "methods" && (
          <>
            <p className="mt-6 text-sm text-muted-foreground">
              Choose one of the available verification methods below. The quickest option is Google Business Profile verification.
            </p>
            <div className="mt-4 grid gap-3">
              {methods.map((m) => (
                <MethodCard
                  key={m.id}
                  method={m}
                  busy={busy === m.id}
                  onGoogle={doGoogle}
                  onTarget={(t) => startCode(m.id as "email" | "phone", t)}
                />
              ))}
            </div>
            <button
              onClick={() => { setStage("manual"); setError(null); }}
              className="mt-3 w-full rounded-2xl border border-dashed border-border bg-card p-5 text-left"
            >
              <span className="text-sm font-bold">Request manual review</span>
              <p className="mt-1 text-sm text-muted-foreground">
                Can't use any of the options above? Our team will review documentary evidence of ownership.
              </p>
            </button>
            {claim && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Claim reference {claim.id.slice(0, 8).toUpperCase()} · recorded {new Date(claim.createdAt).toLocaleDateString()}
              </p>
            )}
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Contact details are never shown in full. Every attempt is logged and rate-limited.
            </p>
            {isDemoPlace(place.id) && (
              <div className="mt-4 flex justify-center">
                <ResetDemoButton label="Reset demo listing" />
              </div>
            )}
          </>
        )}

        {stage === "blocked" && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
            <ShieldCheck className="h-9 w-9 text-[color:var(--warning)]" />
            <h2 className="mt-3 text-lg font-bold">This business has already been claimed</h2>
            <p className="mt-2 text-sm text-muted-foreground">{ALREADY_CLAIMED_MESSAGE}</p>
            <button
              onClick={() => { setStage("manual"); setError(null); }}
              className="mt-5 inline-flex rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white"
            >
              Submit a review request
            </button>
          </div>
        )}

        {stage === "manual" && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-lg font-bold">Request manual ownership review</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us how you're connected to this business. Include anything that proves ownership — company number,
              website, invoices or trading history.
            </p>
            <textarea
              value={reviewMessage}
              onChange={(e) => setReviewMessage(e.target.value.slice(0, 2000))}
              rows={5}
              placeholder="I'm the registered director of…"
              className="mt-4 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-dark"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={submitManualReview}
                disabled={reviewBusy || reviewMessage.trim().length < 10}
                className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {reviewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit review request
              </button>
              <button
                onClick={() => { setStage("methods"); setError(null); }}
                className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            </div>
          </div>
        )}

        {stage === "review_sent" && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
            <ShieldCheck className="mx-auto h-10 w-10 text-[color:var(--success)]" />
            <h2 className="mt-3 text-lg font-bold">Review request submitted</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your request is recorded against this business. We'll email you once our team has reviewed it. Ownership
              stays unverified until then.
            </p>
          </div>
        )}


        {stage === "code" && active && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-brand-foreground">
              {active.method === "email" ? <Mail className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </span>
            <h2 className="mt-4 text-lg font-bold">Enter your verification code</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a 6-digit code to <strong>{active.masked}</strong>. It expires in 10 minutes.
            </p>
            {isDemoPlace(place.id) && (
              <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm font-semibold">
                Demo business — use code {DEMO_CODE}
              </p>
            )}

            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="000000"
              className="mt-5 w-full rounded-2xl border border-border bg-background px-5 py-4 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-brand-dark"
            />
            <button
              onClick={submitCode}
              disabled={code.length !== 6 || busy !== null}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify
            </button>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <button
                onClick={() => {
                  const m = methods.find((x) => x.id === active.method);
                  const t = m?.targets.find((x) => x.id === active.targetId);
                  if (m && t) void startCode(active.method, t);
                }}
                className="font-semibold text-brand-dark"
              >
                Resend code
              </button>
              <button onClick={() => { setStage("methods"); setError(null); }} className="font-semibold text-muted-foreground">
                Use another method
              </button>
            </div>
            <button
              onClick={() => { setStage("methods"); setError(null); }}
              className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        )}

        {stage === "done" && !success && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
            <ShieldCheck className="mx-auto h-10 w-10 text-[color:var(--success)]" />
            <h2 className="mt-3 text-lg font-bold">This business is already verified</h2>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link to="/app/business-profile" className="inline-flex rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white">
                Go to my business profile
              </Link>
              {isDemoPlace(place.id) && <ResetDemoButton label="Reset & claim again" />}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function MethodCard({
  method, busy, onGoogle, onTarget,
}: {
  method: VerificationMethod;
  busy: boolean;
  onGoogle: () => void;
  onTarget: (t: VerificationTarget) => void;
}) {
  const disabled = !method.available || busy;
  return (
    <div className={`rounded-2xl border p-5 transition-colors ${method.available ? "border-border bg-card" : "border-border/60 bg-muted/40"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">{method.title}</span>
        {method.recommended && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-foreground">
            ⭐ Recommended
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{method.description}</p>

      {!method.available && method.reason && (
        <p className="mt-3 text-xs font-semibold text-muted-foreground">{method.reason}</p>
      )}

      {method.available && method.id === "google" && (
        <button
          onClick={onGoogle}
          disabled={disabled}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify with Google
        </button>
      )}

      {method.available && method.id !== "google" && (
        <ul className="mt-4 grid gap-2">
          {method.targets.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => onTarget(t)}
                disabled={disabled}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-semibold hover:bg-muted disabled:opacity-50"
              >
                <span className="truncate">{t.masked}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                  {t.source} <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-hero-gradient">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-12 sm:px-6">
        <Logo className="h-10" />
        {children}
      </div>
    </div>
  );
}
