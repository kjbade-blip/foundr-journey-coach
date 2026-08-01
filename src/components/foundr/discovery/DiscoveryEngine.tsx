import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

export type Phase = { key: string; label: string; detail: string };

export const DISCOVERY_PHASES: Phase[] = [
  { key: "identity", label: "Confirming business identity", detail: "Matching your Google Business Profile" },
  { key: "web", label: "Analysing your website", detail: "Products, services, tone of voice and positioning" },
  { key: "social", label: "Scanning digital presence", detail: "Social platforms, directories and review sites" },
  { key: "reviews", label: "Reading customer reviews", detail: "Sentiment, praise, complaints and themes" },
  { key: "market", label: "Mapping your local market", detail: "Catchment, demographics and footfall" },
  { key: "competitors", label: "Profiling nearby competitors", detail: "Ratings, positioning and gaps" },
  { key: "synthesis", label: "Building your intelligence profile", detail: "SWOT, personas and Business Health Score" },
];

export function DiscoveryEngine({
  businessName,
  done,
  onFinished,
}: {
  businessName: string;
  done: boolean;
  onFinished: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= DISCOVERY_PHASES.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 1400);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (done && step >= DISCOVERY_PHASES.length - 2) {
      setStep(DISCOVERY_PHASES.length);
      const t = setTimeout(onFinished, 700);
      return () => clearTimeout(t);
    }
  }, [done, step, onFinished]);

  const pct = Math.round((Math.min(step, DISCOVERY_PHASES.length) / DISCOVERY_PHASES.length) * 100);

  return (
    <div className="mx-auto w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-pop">
      <div className="text-xs font-bold uppercase tracking-widest text-brand-dark">Found-r AI Discovery Engine</div>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Building the profile for {businessName}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We're gathering everything publicly available so you don't have to fill in forms.
      </p>

      <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-right text-xs font-bold text-muted-foreground">{pct}%</div>

      <ul className="mt-6 space-y-3">
        {DISCOVERY_PHASES.map((p, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <li key={p.key} className={`flex items-start gap-3 transition-opacity ${state === "todo" ? "opacity-40" : ""}`}>
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                  state === "done" ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {state === "done" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : state === "active" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <div>
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.detail}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
