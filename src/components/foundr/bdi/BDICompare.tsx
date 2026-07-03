import type { BDIResult } from "@/lib/bdi";
import { bdiColor } from "./BDIGauge";

export function BDICompare({
  entries,
}: {
  entries: Array<{ label: string; result: BDIResult }>;
}) {
  if (!entries.length) return null;
  const factors = entries[0].result.factors.map((f) => f.key);
  const labels = new Map(entries[0].result.factors.map((f) => [f.key, f.label] as const));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Factor</th>
            {entries.map((e) => (
              <th key={e.label} className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{e.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-3 pr-4 font-semibold">Overall BDI</td>
            {entries.map((e) => {
              const best = Math.max(...entries.map((x) => x.result.overall));
              const isBest = e.result.overall === best;
              return (
                <td key={e.label} className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold" style={{ color: bdiColor(e.result.overall) }}>{e.result.overall}</span>
                    <span className="text-xs text-muted-foreground">{e.result.band}</span>
                    {isBest && entries.length > 1 && <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">BEST</span>}
                  </div>
                </td>
              );
            })}
          </tr>
          {factors.map((key) => {
            const scores = entries.map((e) => e.result.factors.find((f) => f.key === key)?.score ?? 0);
            const best = Math.max(...scores);
            return (
              <tr key={key} className="border-b border-border/60">
                <td className="py-2.5 pr-4 text-xs text-muted-foreground">{labels.get(key)}</td>
                {entries.map((e, i) => (
                  <td key={e.label} className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${scores[i]}%`, background: bdiColor(scores[i]) }} />
                      </div>
                      <span className={`text-xs font-semibold ${scores[i] === best && entries.length > 1 ? "text-brand-dark" : ""}`}>{scores[i]}</span>
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
