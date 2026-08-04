import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { initialsFor } from "@/features/auth/profile";
import { Loader2, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/account")({
  head: () => ({
    meta: [
      { title: "Account settings · Found-r" },
      { name: "description", content: "Manage your Found-r account details, display name and profile photo." },
      { property: "og:title", content: "Account settings · Found-r" },
      { property: "og:description", content: "Manage your Found-r account details, display name and profile photo." },
    ],
  }),
  component: AccountPage,
});

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  email: "Email & password",
};

function AccountPage() {
  const { user, profile, provider, updateProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      setSaved(true);
    } catch (err: any) {
      setError(err?.message ?? "Could not save your changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-extrabold tracking-tight">Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your Found-r profile is stored securely in your account and used across the platform.
      </p>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? "Profile photo"}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full bg-brand text-lg font-bold text-brand-foreground">
              {initialsFor(profile, user?.email)}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">{profile?.full_name ?? "Your account"}</div>
            <div className="truncate text-sm text-muted-foreground">{profile?.email ?? user?.email}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Signed in with {PROVIDER_LABEL[provider ?? "email"] ?? provider}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-semibold" htmlFor="full-name">Full name</label>
            <input
              id="full-name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setSaved(false); }}
              placeholder="Your name"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="avatar-url">Profile photo URL</label>
            <input
              id="avatar-url"
              value={avatarUrl}
              onChange={(e) => { setAvatarUrl(e.target.value); setSaved(false); }}
              placeholder="https://…"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saved && !saving && <Check className="h-4 w-4" />}
            {saved && !saving ? "Saved" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
