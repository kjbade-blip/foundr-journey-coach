import { Lightbulb } from "lucide-react";
import { Card, Pill } from "@/components/foundr/ui";
import type { CIOpportunity } from "@/lib/ci/types";

export function OpportunityFeed({ opportunities }: { opportunities: CIOpportunity[] }) {
  if (opportunities.length === 0) {
    return (
      <Card>
        <h3 className="text-base font-bold">No gaps identified yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Found-r only reports an opportunity when the observed data supports it. Run a scan to look again.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {opportunities.map((o) => (
        <Card key={o.id}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex items-start gap-2 text-base font-bold">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
              {o.title}
            </h3>
            <Pill tone={o.confidence === "high" ? "good" : o.confidence === "medium" ? "warn" : "neutral"}>
              {o.confidence} confidence
            </Pill>
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What Found-r found</div>
              <p className="mt-1 text-sm">{o.whatWeFound}</p>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Why it may matter</div>
              <p className="mt-1 text-sm text-muted-foreground">{o.whyItMatters}</p>
            </div>
            {o.whatToConsider.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What to consider</div>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {o.whatToConsider.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
