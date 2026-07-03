import type { BDIFactor } from "@/lib/bdi";
import { bdiColor } from "./BDIGauge";

export function BDIBreakdown({ factors }: { factors: BDIFactor[] }) {
  return (
    <div className="grid gap-3">
      {factors.map((f) => (
        <div key={f.key}>
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold text-foreground">{f.label}</span>
            <span className="text-muted-foreground">
              <span className="font-bold text-foreground">{f.score}</span> · {Math.round(f.weight * 100)}%
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${f.score}%`, background: bdiColor(f.score) }}
            />
          </div>
          {f.detail && <div className="mt-1 text-[11px] text-muted-foreground">{f.detail}</div>}
        </div>
      ))}
    </div>
  );
}
