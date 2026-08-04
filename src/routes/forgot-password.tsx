import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import {
  AuthLayout,
  FormMessage,
  SubmitButton,
  TextField,
} from "@/features/auth/components/auth-ui";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password · Found-r" },
      { name: "description", content: "Request a password reset link for your Found-r account." },
      { property: "og:title", content: "Reset your password · Found-r" },
      { property: "og:description", content: "Request a password reset link for your Found-r account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      await requestPasswordReset(email.trim());
      setInfo("If that email has an account, a reset link is on its way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset email");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="We'll email you a secure link to set a new one."
      footer={
        <Link to="/login" className="font-semibold text-brand-dark hover:underline">
          Back to sign in
        </Link>
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
        <FormMessage error={error} info={info} />
        <SubmitButton pending={pending}>Send reset link</SubmitButton>
      </form>
    </AuthLayout>
  );
}
