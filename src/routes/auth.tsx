import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/foundr/Logo";
import { getMode } from "@/lib/mode";
import { Loader2, Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Found-r" },
      { name: "description", content: "Sign in or create your Found-r account with Google, Apple or email." },
      { property: "og:title", content: "Sign in · Found-r" },
      { property: "og:description", content: "Sign in or create your Found-r account with Google, Apple or email." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function destination() {
    // Only same-origin in-app paths are honoured.
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      return redirectTo;
    }
    const m = getMode();
    if (!m) return "/onboarding";
    return m === "grow" ? "/app/grow" : "/app/dashboard";
  }

  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      navigate({ to: destination() });
    };

    // Returning from the Google redirect: the session lands slightly after mount,
    // so listen for it instead of only checking once.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });

    // Safety net for the full-page OAuth return in case no event fires.
    const timer = window.setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) go();
      });
    }, 1200);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [navigate]);


  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        setError(result.error.message ?? "Google sign-in failed");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: destination() });
    } catch (e: any) {
      setError(e?.message ?? "Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  async function handleApple() {
    setError(null);
    setAppleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        setError(result.error.message ?? "Apple sign-in failed");
        setAppleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: destination() });
    } catch (e: any) {
      setError(e?.message ?? "Apple sign-in failed");
      setAppleLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { full_name: name },
          },
        });
        if (error) throw error;
        setInfo("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: destination() });
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-4 py-12">
        <div className="w-full">
          <Link to="/" className="mb-8 flex justify-center">
            <Logo className="h-12" />
          </Link>

          <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
            <h1 className="text-center text-2xl font-extrabold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "Sign in to continue your journey." : "Start building with Found-r in seconds."}
            </p>

            {/* Google button — prominent */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-brand-dark px-5 py-3.5 text-base font-semibold text-white shadow-soft transition hover:opacity-95 disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
              <span>{mode === "signin" ? "Continue with Google" : "Sign up with Google"}</span>
            </button>

            <button
              onClick={handleApple}
              disabled={appleLoading}
              className="mt-3 inline-flex w-full items-center justify-center gap-3 rounded-full border border-border bg-background px-5 py-3.5 text-base font-semibold text-foreground shadow-soft transition hover:bg-muted disabled:opacity-60"
            >
              {appleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <AppleIcon className="h-5 w-5" />
              )}
              <span>{mode === "signin" ? "Continue with Apple" : "Sign up with Apple"}</span>
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>or with email</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleEmail} className="space-y-3">
              {mode === "signup" && (
                <Field
                  icon={<UserIcon />}
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={setName}
                  required
                />
              )}
              <Field
                icon={<Mail className="h-4 w-4" />}
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={setEmail}
                required
              />
              <Field
                icon={<Lock className="h-4 w-4" />}
                type="password"
                placeholder="Password"
                value={password}
                onChange={setPassword}
                required
                minLength={6}
              />

              {error && <p className="text-sm text-destructive">{error}</p>}
              {info && <p className="text-sm text-brand-dark">{info}</p>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold hover:bg-muted disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New to Found-r?" : "Already have an account?"}{" "}
              <button
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }}
                className="font-semibold text-brand-dark hover:underline"
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon, type, placeholder, value, onChange, required, minLength,
}: {
  icon: React.ReactNode; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; required?: boolean; minLength?: number;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand">
      <span className="text-muted-foreground">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.13 3.01-.83.96-2.19 1.7-3.31 1.61a3.6 3.6 0 0 1-.03-.42c0-1.1.48-2.24 1.2-3.02.83-.9 2.22-1.58 3.24-1.62.02.15.03.3.03.44zM20.9 17.1c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.38 3.52-4.1 3.53-1.53.02-1.93-1-4.01-.99-2.08.01-2.51 1.01-4.05.99-1.72-.02-3.04-1.78-4.02-3.34C.44 15.86-.06 10.68 1.75 8.02c1.29-1.9 3.32-3.01 5.23-3.01 1.95 0 3.17 1.07 4.78 1.07 1.56 0 2.51-1.07 4.77-1.07 1.7 0 3.5.93 4.79 2.53-4.21 2.31-3.53 8.32.58 9.56z"/>
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.3-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.6 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.7l-6-5.1c-2 1.4-4.4 2.3-7 2.3-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.1 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6 5.1c-.4.4 6.5-4.7 6.5-14.7 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
