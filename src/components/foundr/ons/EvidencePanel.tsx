import { Card } from "@/components/foundr/ui";
import { Linkify } from "@/components/foundr/Linkify";
import { GEOGRAPHY_LABELS, type EvidenceItem } from "@/lib/ons/types";
import { BookOpen } from "lucide-react";

export function EvidencePanel({
  evidence,
  extraSources = [],
}: {
  evidence: EvidenceItem[];
  extraSources?: Array<{ label: string; detail: string; source: string }>;
}) {
  if (evidence.length === 0 && extraSources.length === 0) return null;
  return (
    <Card>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
        <BookOpen className="h-4 w-4" /> Evidence used
      </div>
      <div className="mt-4 divide-y divide-border">
        {evidence.map((e) => (
          <div key={`${e.datasetId}-${e.label}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{e.label}</div>
              <div className="text-xs text-muted-foreground">{e.datasetName}</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>{e.referencePeriod}</div>
              <div>
                {GEOGRAPHY_LABELS[e.geographyLevel].split(" (")[0]}: {e.geographyName}
              </div>
              <div>
                {e.source} · retrieved {new Date(e.retrievedAt).toLocaleDateString("en-GB")}
              </div>
            </div>
          </div>
        ))}
        {extraSources.map((s) => (
          <div key={s.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
            <div>
              <div className="text-sm font-semibold">{s.label}</div>
              <div className="text-xs text-muted-foreground"><Linkify>{s.detail}</Linkify></div>
            </div>
            <div className="text-right text-xs text-muted-foreground">{s.source}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Official statistics are reproduced under the Open Government Licence. Figures are shown for the geography and
        reference period stated; Found-r does not adjust or estimate ONS values.
      </p>
    </Card>
  );
}
