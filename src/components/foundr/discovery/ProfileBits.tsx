import { Sparkles, Pencil, Check, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Linkify } from "@/components/foundr/Linkify";

export function AIBadge({ label = "AI inferred" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-dark">
      <Sparkles className="h-3 w-3" /> {label}
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--success)]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--success)]">
      <Check className="h-3 w-3" /> Verified
    </span>
  );
}

export function EditableField({
  label,
  value,
  ai = true,
  multiline = false,
  onSave,
}: {
  label: string;
  value: string;
  ai?: boolean;
  multiline?: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
          {ai ? <AIBadge /> : <VerifiedBadge />}
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label={`Edit ${label}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-2">
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-input bg-card p-2 text-sm outline-none focus:border-brand-dark"
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-lg border border-input bg-card p-2 text-sm outline-none focus:border-brand-dark"
            />
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => { onSave(draft); setEditing(false); }}
              className="inline-flex items-center gap-1 rounded-full bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Check className="h-3 w-3" /> Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 whitespace-pre-line text-sm text-foreground"><Linkify>{value || "—"}</Linkify></p>
      )}
    </div>
  );
}

export function Section({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Chips({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "good" | "bad" | "brand" }) {
  const map = {
    neutral: "bg-muted text-foreground",
    good: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
    bad: "bg-destructive/10 text-destructive",
    brand: "bg-brand/25 text-brand-dark",
  } as const;
  if (!items?.length) return <p className="text-sm text-muted-foreground">Nothing detected yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[tone]}`}>{i}</span>
      ))}
    </div>
  );
}

export function BulletList({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "good" | "bad" }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">Still researching…</p>;
  const dot = tone === "good" ? "var(--success)" : tone === "bad" ? "var(--destructive)" : "var(--brand)";
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}
