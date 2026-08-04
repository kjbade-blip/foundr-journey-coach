import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import {
  AuthLayout,
  FormMessage,
  SubmitButton,
  TextField,
} from "@/features/auth/components/auth-ui";
import { DEFAULT_AUTHENTICATED_PATH } from "@/features/auth/use-auth-redirect";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password · Found-r" },
      { name: "description", content: "Choose a new password for your Found-r account." },
      { property: "og:title", content: "Set a new password · Found-r" },
      { property: "og:description", content: "Choose a new password for your Found-r account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { status, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Those passwords don't match");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await updatePassword(password);
      await navigate({ to: DEFAULT_AUTHENTICATED_PATH, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password");
    } finally {
      setPending(false);
    }
  }

  if (status === "unauthenticated") {
    return (
      <AuthLayout
        title="Link expired"
        subtitle="This password reset link is no longer valid."
        footer={
          <Link to="/forgot-password" className="font-semibold text-brand-dark hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-center text-sm text-muted-foreground">
          Reset links can only be used once and expire after a short time.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password you don't use elsewhere.">
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          id="password"
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          minLength={8}
        />
        <TextField
          id="confirm-password"
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          required
          minLength={8}
        />
        <FormMessage error={error} />
        <SubmitButton pending={pending || status === "loading"}>Update password</SubmitButton>
      </form>
    </AuthLayout>
  );
}
