import { useState } from "react";
import { Loader2 } from "lucide-react";

import { lovable } from "@/integrations/lovable";
import { FormMessage } from "./auth-ui";
import { PENDING_REDIRECT_KEY } from "../use-auth-redirect";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l4.01-3.1z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M16.36 12.72c-.02-2.4 1.96-3.55 2.05-3.61-1.12-1.63-2.86-1.86-3.48-1.88-1.48-.15-2.89.87-3.64.87-.75 0-1.91-.85-3.14-.83-1.61.02-3.1.94-3.93 2.38-1.68 2.9-.43 7.2 1.2 9.56.8 1.15 1.75 2.44 3 2.39 1.21-.05 1.67-.78 3.13-.78 1.46 0 1.87.78 3.14.75 1.3-.02 2.12-1.17 2.91-2.33.92-1.34 1.3-2.63 1.32-2.7-.03-.01-2.53-.97-2.56-3.82zM14.02 4.7c.66-.81 1.11-1.93.99-3.05-.95.04-2.11.64-2.8 1.44-.62.71-1.16 1.85-1.02 2.94 1.06.08 2.15-.54 2.83-1.33z" />
    </svg>
  );
}

export function SocialAuthButtons({ redirect }: { redirect?: string }) {
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: "google" | "apple") {
    setPending(provider);
    setError(null);
    try {
      if (redirect) sessionStorage.setItem(PENDING_REDIRECT_KEY, redirect);
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/login`,
      });
      if (result.error) {
        setError(result.error.message ?? "Could not sign you in");
        setPending(null);
        return;
      }
      if (result.redirected) return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign you in");
      setPending(null);
    }
  }

  const base =
    "inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-muted disabled:opacity-60";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button type="button" onClick={() => void signIn("google")} disabled={pending !== null} className={base}>
        {pending === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => void signIn("apple")}
        disabled={pending !== null}
        className={`${base} bg-foreground text-background hover:opacity-90`}
      >
        {pending === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleIcon />}
        Continue with Apple
      </button>

      <FormMessage error={error} />
    </div>
  );
}
