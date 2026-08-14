import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Building2, Info, Loader2, Sparkles, Store, TrendingUp } from "lucide-react";
import { Card, Pill } from "@/components/foundr/ui";
import { explainChange } from "@/lib/ci.functions";
import type { CIChange, ChangeInterpretation, Severity } from "@/lib/ci/types";
import { SEVERITY_LABEL } from "@/lib/ci/types";

const TONE: Record<Severity, "bad" | "warn" | "good" | "neutral"> = {
  critical: "bad",
  important: "warn",
  opportunity: "good",
  informational: "neutral",
};

function KindIcon({ kind }: { kind: string }) {
  const cls = "h-4 w-4";
  if (kind === "new_competitor") return <Store className={cls} />;
  if (kind === "competitor_closed") return <Building2 className={cls} />;
  if (kind === "rating_change") return <TrendingUp className={cls} />;
  if (kind === "review_growth") return <ArrowUpRight className={cls} />;
  if (kind === "score_change") return <ArrowDownRight className={cls} />;
  if (kind === "market_density") return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

function whenLabel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 31) return `${Math.floor(days / 7)} week${days < 14 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Interpretation({ ai }: { ai: ChangeInterpretation }) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/50 p-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Found-r's reading</div>
        <p className="mt-1 text-sm">{ai.whatThisMeans}</p>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Why it may matter</div>
        <p className="mt-1 text-sm text-muted-foreground">{ai.whyItMatters}</p>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What you could consider</div>
        <ul className="mt-1.5 space-y-1.5">
          {ai.whatYouCouldDo.map((a) => (
            <li key={a} className="flex gap-2 text-sm">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Interpretation only. Found-r holds no revenue, footfall or customer data for other businesses and does not estimate it.
      </p>
    </div>
  );
}

export function ChangeCard({ change }: { change: CIChange }) {
  const explainFn = useServerFn(explainChange);
  const [ai, setAi] = useState<ChangeInterpretation | null>(change.ai);
  const mutation = useMutation({
    mutationFn: () => explainFn({ data: { changeId: change.id } }),
    onSuccess: (res) => setAi(res),
  });

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-brand-dark">
            <KindIcon kind={change.kind} />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight">{change.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{change.detail}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>{whenLabel(change.createdAt)}</span>
              {change.competitorName && <span>· {change.competitorName}</span>}
              <span>· Observed via Google Places</span>
            </div>
          </div>
        </div>
        <Pill tone={TONE[change.severity]}>{SEVERITY_LABEL[change.severity]}</Pill>
      </div>

      {ai ? (
        <Interpretation ai={ai} />
      ) : (
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          What should I do?
        </button>
      )}
      {mutation.isError && <p className="mt-2 text-xs text-destructive">Found-r couldn’t generate an interpretation just now.</p>}
    </Card>
  );
}

export function ChangeFeed({ changes }: { changes: CIChange[] }) {
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const shown = filter === "all" ? changes : changes.filter((c) => c.severity === filter);

  if (changes.length === 0) {
    return (
      <Card>
        <h3 className="text-base font-bold">Nothing has changed yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Found-r has no confirmed changes to report for this area. Run a scan, then check back — differences are only reported once
          Found-r has two observations to compare.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "critical", "important", "opportunity", "informational"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f ? "bg-brand-dark text-white" : "border border-border hover:bg-muted"
            }`}
          >
            {f === "all" ? `All (${changes.length})` : `${SEVERITY_LABEL[f]} (${changes.filter((c) => c.severity === f).length})`}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No changes in this category.</p>
      ) : (
        shown.map((c) => <ChangeCard key={c.id} change={c} />)
      )}
    </div>
  );
}
