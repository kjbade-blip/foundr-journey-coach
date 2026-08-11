import { Loader2, Check, Circle } from "lucide-react";

export interface ProgressStep {
  key: string;
  label: string;
  detail: string;
}

export const ANALYSIS_STEPS: ProgressStep[] = [
  { key: "geography", label: "Resolving the location", detail: "Matching your search to an official ONS geography" },
  { key: "ons", label: "Reading ONS statistics", detail: "Population, age structure, households, employment and earnings" },
  { key: "competition", label: "Scanning competitors", detail: "Live comparable businesses within your radius" },
  { key: "crime", label: "Checking recorded crime", detail: "Home Office street-level data for the last 12 months" },
  { key: "ecosystem", label: "Sampling the business mix", detail: "Building the Business Diversity Index for the area" },
  { key: "market", label: "Checking business formations", detail: "Companies House incorporations and dissolutions" },
  { key: "scoring", label: "Scoring and interpreting", detail: "Deterministic scoring, then the Found-r AI reading" },
];

/**
 * Live checklist shown while an analysis runs. `activeIndex` is time-driven,
 * not fabricated data — it only communicates what the engine is working on.
 */
export function AnalysisProgress({ activeIndex }: { activeIndex: number }) {
  return (
    <ul className="space-y-2.5">
      {ANALYSIS_STEPS.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={s.key} className="flex items-start gap-3">
            {done ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]" />
            ) : active ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-dark" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
            )}
            <div>
              <div className={`text-sm font-semibold ${done || active ? "" : "text-muted-foreground"}`}>{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.detail}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
