import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, Check, ChevronDown } from "lucide-react";

import { useBusinessSelection, useMyBusinesses } from "@/lib/businesses";

/**
 * Grow-mode business picker. Lets a user tick one or more of their businesses
 * so every Grow screen reports on the same selection.
 */
export function BusinessSelector() {
  const { data, isLoading } = useMyBusinesses();
  const businesses = data?.businesses ?? [];
  const { selectedIds, toggle, selectAll } = useBusinessSelection(businesses);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (isLoading) return null;

  const label =
    businesses.length === 0
      ? "Add a business"
      : selectedIds.length === businesses.length && businesses.length > 1
        ? `All businesses (${businesses.length})`
        : selectedIds.length === 1
          ? (businesses.find((b) => b.id === selectedIds[0])?.name ?? "Select business")
          : `${selectedIds.length} businesses`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex max-w-[240px] items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
      >
        <Building2 className="h-4 w-4 shrink-0 text-brand-dark" />
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-pop">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My businesses</span>
            {businesses.length > 1 && (
              <button onClick={selectAll} className="text-xs font-semibold text-brand-dark hover:underline">
                Select all
              </button>
            )}
          </div>

          {businesses.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              You haven&apos;t added a business yet.
            </p>
          ) : (
            <ul className="max-h-72 overflow-auto py-1">
              {businesses.map((b) => {
                const checked = selectedIds.includes(b.id);
                return (
                  <li key={b.id}>
                    <button
                      onClick={() => toggle(b.id)}
                      role="menuitemcheckbox"
                      aria-checked={checked}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted"
                    >
                      <span
                        className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded border ${
                          checked ? "border-brand-dark bg-brand-dark text-white" : "border-border bg-background"
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{b.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {b.address || b.postcode || b.industry || "No address on file"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            to="/app/business-profile"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-2.5 text-sm font-semibold text-brand-dark hover:bg-muted"
          >
            Manage my businesses
          </Link>
        </div>
      )}
    </div>
  );
}
