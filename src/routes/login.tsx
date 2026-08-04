import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import {
  AuthLayout,
  FormMessage,
  SubmitButton,
  TextField,
} from "@/features/auth/components/auth-ui";
import { SocialAuthButtons } from "@/features/auth/components/social-auth";
import {
  safeRedirect,
  useRedirectIfAuthenticated,
  validateAuthSearch,
} from "@/features/auth/use-auth-redirect";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: validateAuthSearch,
  head: () => ({
    meta: [
      { title: "Sign in · Found-r" },
      { name: "description", content: "Sign in to your Found-r account to discover, validate, launch and grow your business." },
      { property: "og:title", content: "Sign in · Found-r" },
      { property: "og:description", content: "Sign in to your Found-r account to discover, validate, launch and grow your business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  useRedirectIfAuthenticated(redirect);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signIn({ email: email.trim(), password });
      await navigate({ to: safeRedirect(redirect), replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign you in");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your journey."
      footer={
        <>
          New to Found-r?{" "}
          <Link to="/register" search={{ redirect }} className="font-semibold text-brand-dark hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
        <FormMessage error={error} />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>

      <div className="mt-5">
        <SocialAuthButtons redirect={redirect} />
      </div>


      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-muted-foreground hover:underline">
          Forgot your password?
        </Link>
      </p>
    </AuthLayout>
  );
}
