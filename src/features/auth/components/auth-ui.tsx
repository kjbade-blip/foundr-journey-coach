import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/foundr/Logo";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-4 py-12">
        <div className="w-full">
          <Link to="/" className="mb-8 flex justify-center">
            <Logo className="h-[60px]" />
          </Link>

          <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
            <h1 className="text-center text-2xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>

          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function TextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder,
  required,
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
      />
    </div>
  );
}

export function FormMessage({ error, info }: { error?: string | null; info?: string | null }) {
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (info) return <p className="text-sm text-brand-dark">{info}</p>;
  return null;
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
