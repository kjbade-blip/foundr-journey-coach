import type { BDIBand } from "@/lib/bdi";

export function bdiColor(score: number): string {
  if (score >= 75) return "var(--success)";
  if (score >= 40) return "var(--warning)";
  return "var(--destructive)";
}

export function BDIGauge({
  score,
  band,
  size = 168,
}: {
  score: number;
  band?: BDIBand;
  size?: number;
}) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = bdiColor(score);
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-extrabold leading-none" style={{ color }}>{score}</div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">/ 100</div>
        {band && (
          <div className="mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>
            {band}
          </div>
        )}
      </div>
    </div>
  );
}
