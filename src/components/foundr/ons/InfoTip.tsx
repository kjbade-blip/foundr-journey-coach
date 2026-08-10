import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";

/** Small inline explainer used on every ONS metric. */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="What does this mean?"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="text-muted-foreground transition hover:text-brand-dark"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl border border-border bg-card p-3 text-xs font-normal leading-relaxed text-muted-foreground shadow-soft">
          {text}
        </span>
      )}
    </span>
  );
}

export function SourceLine({ children }: { children: ReactNode }) {
  return <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{children}</div>;
}

export function formatNumber(value: number, unit?: string): string {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  const n = rounded.toLocaleString("en-GB");
  if (!unit) return n;
  if (unit.startsWith("£")) return `£${n}`;
  if (unit === "%" || unit === "% change") return `${n}%`;
  return n;
}
