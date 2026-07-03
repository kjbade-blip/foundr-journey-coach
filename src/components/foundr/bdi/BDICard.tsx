import { useState, type ReactNode } from "react";
import { Card, Pill } from "@/components/foundr/ui";
import { BDIGauge, bdiColor } from "./BDIGauge";
import { BDIBreakdown } from "./BDIBreakdown";
import type { BDIResult } from "@/lib/bdi";
import { Info, Sparkles, TrendingUp, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

export function BDICard({
  result,
  narrative,
  locationName,
  compact = false,
  actions,
}: {
  result: BDIResult;
  narrative?: string;
  locationName?: string;
  compact?: boolean;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(!compact);
  const tone = result.tone === "good" ? "good" : result.tone === "warn" ? "warn" : "bad";
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: bdiColor(result.overall) }}>
            <Sparkles className="h-3.5 w-3.5" /> Business Diversity Index
          </div>
          {locationName && <div className="mt-0.5 text-sm text-muted-foreground">{locationName}</div>}
          <div className="mt-2 flex items-center gap-2">
            <Pill tone={tone as never}>{result.band}</Pill>
            <span className="text-xs text-muted-foreground">{result.sampleSize} businesses sampled</span>
          </div>
        </div>
        <BDIGauge score={result.overall} band={undefined} size={compact ? 120 : 152} />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground">
        {narrative || result.summary}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-accent/40 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--success)]">
            <TrendingUp className="h-3 w-3" /> Strengths
          </div>
          <ul className="mt-1.5 space-y-0.5 text-xs">
            {result.strengths.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-muted p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--warning)]">
            <ShieldAlert className="h-3 w-3" /> Watch
          </div>
          <ul className="mt-1.5 space-y-0.5 text-xs">
            {result.weaknesses.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        </div>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline"
      >
        {open ? <><ChevronUp className="h-3.5 w-3.5" /> Hide factor breakdown</> : <><ChevronDown className="h-3.5 w-3.5" /> View factor breakdown</>}
      </button>

      {open && (
        <div className="mt-4 border-t border-border pt-4">
          <BDIBreakdown factors={result.factors} />
        </div>
      )}

      {(result.recommended.length > 0 || result.avoid.length > 0) && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-brand-dark">Recommendations</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.recommended.map((r) => (
              <span key={r} className="inline-flex items-center rounded-full bg-[color:var(--success)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--success)]">{r}</span>
            ))}
            {result.avoid.map((r) => (
              <span key={r} className="inline-flex items-center rounded-full bg-[color:var(--warning)]/15 px-2.5 py-1 text-xs font-semibold text-[color:var(--warning)]">Avoid: {r}</span>
            ))}
          </div>
        </div>
      )}

      {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}

      <div className="mt-4 flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>Found-r's proprietary index of high-street health, blending sector diversity, concentration, chain balance, vacancy, hospitality, essential services, evening economy, complementarity and footfall.</span>
      </div>
    </Card>
  );
}
