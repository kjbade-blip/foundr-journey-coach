import { useState } from "react";
import { Sparkles, Loader2, X, Plus, RefreshCw, Wand2 } from "lucide-react";
import { LocationAutocomplete } from "@/components/foundr/LocationAutocomplete";
import {
  CONCEPT_LABELS,
  INTENT_LABEL,
  describeSearch,
  parseNaturalSearch,
  type ParsedSearch,
  type SearchIntent,
} from "@/lib/ai-search";

type Props = {
  /** Called whenever an interpreted search should be run (first parse or rerun after edits). */
  onRun: (parsed: ParsedSearch) => void;
  placeholder?: string;
  examples?: string[];
  /** Label for the run/rerun action shown on the criteria panel. */
  runLabel?: string;
  className?: string;
};

export function AISearchBar({
  onRun,
  placeholder = "Ask in your own words, e.g. “Are there any bookshops that also trade as wine bars in Wakefield?”",
  examples = [
    "Are there any bookshops that also trade as wine bars in Wakefield?",
    "Best independent coffee shops in Manchester for inspiration",
    "Is there room for a bakery and coffee shop in Leeds?",
  ],
  runLabel = "Rerun search",
  className = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [parsed, setParsed] = useState<ParsedSearch | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  function interpret(q: string) {
    const text = q.trim();
    if (text.length < 3) return;
    setThinking(true);
    window.setTimeout(() => {
      const p = parseNaturalSearch(text);
      setParsed(p);
      setThinking(false);
      onRun(p);
    }, 650);
  }

  function update(patch: Partial<ParsedSearch>) {
    setParsed((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  const toneClass =
    parsed?.confidence === "high"
      ? "bg-brand/15 text-brand-dark"
      : parsed?.confidence === "medium"
        ? "bg-[color:var(--warning)]/15 text-foreground"
        : "bg-muted text-muted-foreground";

  return (
    <div className={className}>
      <div className="rounded-3xl border border-brand/40 bg-gradient-to-br from-brand/10 via-card to-card p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
          <Sparkles className="h-4 w-4" /> AI search
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Wand2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") interpret(query);
              }}
              placeholder={placeholder}
              aria-label="Ask Found-r in your own words"
              className="h-12 w-full rounded-2xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-brand-dark"
            />
          </div>
          <button
            type="button"
            onClick={() => interpret(query)}
            disabled={thinking || query.trim().length < 3}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-dark px-6 text-sm font-semibold text-white disabled:opacity-60"
          >
            {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Ask Found-r
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                interpret(ex);
              }}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-brand-dark hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {thinking && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Interpreting your question…
        </div>
      )}

      {parsed && !thinking && (
        <div className="mt-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{describeSearch(parsed)}</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${toneClass}`}>
              {parsed.confidence} confidence
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Interpreted from: “{parsed.raw}” · Intent: {INTENT_LABEL[parsed.intent]}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</label>
              <div className="mt-1.5">
                <LocationAutocomplete
                  value={parsed.location}
                  onChange={(v) => update({ location: v })}
                  onSelect={(v) => update({ location: v })}
                  placeholder="Add a town, city or postcode"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Intent</label>
              <select
                value={parsed.intent}
                onChange={(e) => update({ intent: e.target.value as SearchIntent })}
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand-dark"
              >
                {(Object.keys(INTENT_LABEL) as SearchIntent[]).map((k) => (
                  <option key={k} value={k}>
                    {INTENT_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categories</label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {parsed.categories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1.5 text-xs font-semibold text-brand-dark">
                  {c}
                  <button
                    type="button"
                    aria-label={`Remove ${c}`}
                    onClick={() => update({ categories: parsed.categories.filter((x) => x !== c) })}
                    className="rounded-full p-0.5 hover:bg-brand/25"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {parsed.categories.length === 0 && (
                <span className="text-xs text-muted-foreground">No categories yet — add one.</span>
              )}
              {addOpen ? (
                <select
                  autoFocus
                  defaultValue=""
                  onBlur={() => setAddOpen(false)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) update({ categories: [...parsed.categories, v] });
                    setAddOpen(false);
                  }}
                  className="h-9 rounded-full border border-border bg-background px-3 text-xs outline-none focus:border-brand-dark"
                >
                  <option value="" disabled>
                    Choose a category…
                  </option>
                  {CONCEPT_LABELS.filter((c) => !parsed.categories.includes(c)).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold hover:border-brand-dark"
                >
                  <Plus className="h-3 w-3" /> Add category
                </button>
              )}
            </div>
          </div>

          {parsed.notes.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {parsed.notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={parsed.hybrid}
                onChange={(e) => update({ hybrid: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-[color:var(--brand-dark)]"
              />
              Treat as one blended concept
            </label>
            <button
              type="button"
              onClick={() => onRun(parsed)}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground"
            >
              <RefreshCw className="h-4 w-4" /> {runLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
