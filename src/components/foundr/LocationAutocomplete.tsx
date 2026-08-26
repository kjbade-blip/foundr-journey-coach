import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { autocompleteLocation } from "@/lib/maps.functions";

type Suggestion = { id: string; description: string; main: string; secondary: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (v: string) => void;
  onSelectItem?: (s: Suggestion) => void;
  placeholder?: string;
  icon?: "pin" | "search";
};

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  onSelectItem,
  placeholder = "Postcode or city",
  icon = "pin",
}: Props) {
  const Icon = icon === "search" ? Search : MapPin;
  const acFn = useServerFn(autocompleteLocation);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const skipRef = useRef(false);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await acFn({ data: { input: q } });
        if (cancelled) return;
        setItems(res);
        setOpen(res.length > 0);
        setActive(-1);
      } catch {
        if (!cancelled) {
          setItems([]);
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (s: Suggestion) => {
    skipRef.current = true;
    onChange(s.description);
    setOpen(false);
    setItems([]);
    onSelect?.(s.description);
    onSelectItem?.(s);
  };

  return (
    <div ref={boxRef} className="relative">
      <label className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              pick(items[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="w-full bg-transparent text-sm outline-none"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
      </label>

      {open && items.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-border bg-card p-1 shadow-soft"
        >
          {items.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(s)}
                className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left ${i === active ? "bg-muted" : ""}`}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{s.main}</span>
                  {s.secondary && (
                    <span className="block truncate text-xs text-muted-foreground">{s.secondary}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
