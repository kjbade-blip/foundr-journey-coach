import { FIT_LABELS, type FitStatus } from "@/lib/premises/types";

const TONE: Record<FitStatus, string> = {
  strong: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
  possible: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  poor: "bg-muted text-muted-foreground",
  unsuitable: "bg-destructive/10 text-destructive",
};

export function FitBadge({ status, score }: { status: FitStatus; score?: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${TONE[status]}`}>
      {FIT_LABELS[status]}
      {score != null && <span className="opacity-70">{score}/100</span>}
    </span>
  );
}

/** "Not stated" is deliberately distinct from "not available". */
export function NotStated({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground">
      {label}: <span className="italic">Not stated</span>
    </span>
  );
}
