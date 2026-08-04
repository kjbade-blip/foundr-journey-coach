import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card } from "@/components/foundr/ui";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { geocodeAddress } from "@/lib/maps.functions";
import { getLocationBDI } from "@/lib/bdi.functions";
import { BDICompare } from "@/components/foundr/bdi/BDICompare";
import { BDIGauge } from "@/components/foundr/bdi/BDIGauge";
import { Loader2, MapPin, Plus, X } from "lucide-react";
import type { BDIResult } from "@/lib/bdi";

export const Route = createFileRoute("/_authenticated/app/bdi-compare")({
  head: () => ({ meta: [{ title: "BDI Compare · Found-r" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  component: BdiCompare,
});

type Entry = { label: string; result: BDIResult; narrative?: string };

function BdiCompare() {
  const search = Route.useSearch();
  const [inputs, setInputs] = useState<string[]>(() => {
    const base = search.q ? [search.q] : ["Horbury", "Wakefield"];
    while (base.length < 2) base.push("");
    return base;
  });
  const [entries, setEntries] = useState<Entry[]>([]);
  const geocodeFn = useServerFn(geocodeAddress);
  const bdiFn = useServerFn(getLocationBDI);

  const run = useMutation({
    mutationFn: async () => {
      const active = inputs.map((s) => s.trim()).filter(Boolean);
      if (active.length < 2) throw new Error("Add at least two locations");
      const out: Entry[] = [];
      for (const q of active) {
        const geo = await geocodeFn({ data: { address: q } });
        if (!geo) continue;
        const { result, narrative } = await bdiFn({ data: { lat: geo.lat, lng: geo.lng, radius: 1200, locationName: geo.address } });
        out.push({ label: geo.address.split(",")[0] || q, result, narrative });
      }
      setEntries(out);
      return out;
    },
  });

  const updateInput = (i: number, v: string) => setInputs((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  const addRow = () => setInputs((p) => (p.length < 4 ? [...p, ""] : p));
  const removeRow = (i: number) => setInputs((p) => (p.length > 2 ? p.filter((_, idx) => idx !== i) : p));

  return (
    <div>
      <PageHeader
        eyebrow="BDI Compare"
        title="Compare Business Diversity across locations."
        subtitle="Benchmark up to four high streets side-by-side to see which is most balanced, resilient and ready to support your business."
      />

      <Card>
        <div className="grid gap-3">
          {inputs.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <label className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <input
                  value={v}
                  onChange={(e) => updateInput(i, e.target.value)}
                  placeholder={`Location ${i + 1} (postcode or town)`}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              {inputs.length > 2 && (
                <button onClick={() => removeRow(i)} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={addRow}
              disabled={inputs.length >= 4}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add location
            </button>
            <button
              onClick={() => run.mutate()}
              disabled={run.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {run.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {run.isPending ? "Comparing" : "Compare BDI"}
            </button>
          </div>
          {run.isError && <div className="text-sm text-destructive">{(run.error as Error).message}</div>}
        </div>
      </Card>

      {entries.length > 0 && (
        <div className="mt-6 grid gap-4">
          <div className={`grid gap-4 ${entries.length === 2 ? "sm:grid-cols-2" : entries.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
            {entries.map((e) => (
              <Card key={e.label}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</div>
                    <div className="mt-0.5 font-semibold">{e.label}</div>
                  </div>
                  <BDIGauge score={e.result.overall} band={e.result.band} size={110} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground line-clamp-4">{e.narrative || e.result.summary}</p>
              </Card>
            ))}
          </div>

          <Card>
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Factor-by-factor</div>
            <div className="mt-4">
              <BDICompare entries={entries.map((e) => ({ label: e.label, result: e.result }))} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
