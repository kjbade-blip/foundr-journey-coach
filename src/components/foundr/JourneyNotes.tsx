import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Sparkles, Copy, BarChart3, Check } from "lucide-react";
import { getJourneyNotes, saveJourneyNote, generateFounderBrief } from "@/lib/journey-notes.functions";

export const NOTES_KEY = ["journey-notes"];

export function useJourneyNotes() {
  const fn = useServerFn(getJourneyNotes);
  return useQuery({ queryKey: NOTES_KEY, queryFn: () => fn() });
}

export function NoteField({ stageIndex, taskKey, label }: { stageIndex: number; taskKey: string; label: string }) {
  const { data } = useJourneyNotes();
  const saved = data?.notes[`${stageIndex}:${taskKey}`] ?? "";
  const [value, setValue] = useState(saved);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveFn = useServerFn(saveJourneyNote);
  const qc = useQueryClient();
  useEffect(() => setValue(saved), [saved]);

  const save = async () => {
    if (value === saved) return;
    setStatus("saving");
    try {
      await saveFn({ data: { stageIndex, taskKey, note: value } });
      await qc.invalidateQueries({ queryKey: NOTES_KEY });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="px-3.5 pb-3.5 pl-10">
      <textarea
        aria-label={`Notes: ${label}`}
        value={value}
        onChange={(e) => { setValue(e.target.value); setStatus("idle"); }}
        onBlur={save}
        rows={2}
        maxLength={4000}
        placeholder="Your notes…"
        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="mt-1 h-4 text-xs text-muted-foreground">
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved"}
        {status === "error" && <span className="text-destructive">Couldn't save — try again</span>}
      </div>
    </div>
  );
}

export function FounderBriefPanel() {
  const { data } = useJourneyNotes();
  const genFn = useServerFn(generateFounderBrief);
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const gen = useMutation({
    mutationFn: () => genFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
  const brief = data?.brief;
  const hasNotes = Object.entries(data?.notes ?? {}).some(([k, v]) => k.startsWith("0:") && v.trim());

  return (
    <div className="mt-6 rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
        <Sparkles className="h-4 w-4" /> Your founder brief
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Turn your notes into a master prompt, a mission statement and a mini business plan, then run an Opportunity Analysis from it.
      </p>
      <button
        type="button"
        onClick={() => gen.mutate()}
        disabled={gen.isPending || !hasNotes}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {gen.isPending ? "Writing your brief…" : brief ? "Regenerate from my notes" : "Generate from my notes"}
      </button>
      {!hasNotes && <p className="mt-2 text-xs text-muted-foreground">Add notes to at least one task above first.</p>}
      {gen.isError && <p className="mt-2 text-sm text-destructive">{(gen.error as Error).message}</p>}

      {brief && (
        <div className="mt-5 space-y-5">
          <div>
            <h3 className="font-display text-lg font-bold">Mission statement</h3>
            <p className="mt-1 text-sm">{brief.missionStatement}</p>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Mini business plan</h3>
            <dl className="mt-2 space-y-3 text-sm">
              {([
                ["Summary", brief.summary],
                ["What you'll offer", brief.offer],
                ["Target customer", brief.targetCustomer],
                ["Budget and time", brief.budgetAndTime],
                ["Goals", brief.goals],
              ] as const).map(([k, v]) => (
                <div key={k}>
                  <dt className="font-semibold">{k}</dt>
                  <dd className="text-muted-foreground">{v}</dd>
                </div>
              ))}
              <div>
                <dt className="font-semibold">Next steps</dt>
                <dd>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                    {brief.nextSteps.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Master prompt</h3>
              <button
                type="button"
                onClick={() => { void navigator.clipboard.writeText(brief.masterPrompt); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm">{brief.masterPrompt}</p>
          </div>
          <Link
            to="/app/opportunity-finder"
            search={{ type: brief.opportunity.typeKey, ...(brief.opportunity.location ? { location: brief.opportunity.location } : {}) }}
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white"
          >
            <BarChart3 className="h-4 w-4" /> Run Opportunity Analysis
          </Link>
          <p className="text-xs text-muted-foreground">
            Written by Found-r AI from your own notes only — no figures are added. The analysis uses published data.
          </p>
        </div>
      )}
    </div>
  );
}
