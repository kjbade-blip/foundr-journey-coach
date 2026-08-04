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

export const Route = createFileRoute("/register")({
  ssr: false,
  validateSearch: validateAuthSearch,
  head: () => ({
    meta: [
      { title: "Create your account · Found-r" },
      { name: "description", content: "Create a Found-r account and start building your business with clarity before commitment." },
      { property: "og:title", content: "Create your account · Found-r" },
      { property: "og:description", content: "Create a Found-r account and start building your business with clarity before commitment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { redirect } = Route.useSearch();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  useRedirectIfAuthenticated(redirect);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      const { needsEmailConfirmation } = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim() || undefined,
      });
      if (needsEmailConfirmation) {
        setInfo("Check your inbox to confirm your email address, then sign in.");
      } else {
        await navigate({ to: safeRedirect(redirect), replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start building with Found-r in seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" search={{ redirect }} className="font-semibold text-brand-dark hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          id="full-name"
          label="Full name"
          value={fullName}
          onChange={setFullName}
          autoComplete="name"
          placeholder="Your name"
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          minLength={8}
        />
        <FormMessage error={error} info={info} />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
    </AuthLayout>
  );
}
