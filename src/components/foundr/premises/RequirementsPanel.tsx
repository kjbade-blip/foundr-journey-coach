import { LocationAutocomplete } from "@/components/foundr/LocationAutocomplete";
import { PREMISES_PROFILES, profileForBusinessType, recommendedAreaRange } from "@/lib/premises/profiles";
import {
  FEATURE_LABELS,
  PROPERTY_TYPE_LABELS,
  type FeatureKey,
  type PropertyRequirements,
  type PropertyType,
} from "@/lib/premises/types";

export function RequirementsPanel({
  value,
  onChange,
  onSearch,
  searching,
  strongOnly,
  onStrongOnly,
}: {
  value: PropertyRequirements;
  onChange: (next: PropertyRequirements) => void;
  onSearch: () => void;
  searching: boolean;
  strongOnly: boolean;
  onStrongOnly: (v: boolean) => void;
}) {
  const profile = profileForBusinessType(value.businessTypeKey);
  const area = recommendedAreaRange(profile, { staffCount: value.staffCount, customerCapacity: value.customerCapacity });
  const set = (patch: Partial<PropertyRequirements>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5 text-sm">
      <Group label="Business type / intended use">
        <select
          value={profile.key}
          onChange={(e) => set({ businessTypeKey: e.target.value })}
          className="w-full rounded-xl border border-border bg-background px-3 py-2"
        >
          {PREMISES_PROFILES.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
          <option value="generic">Something else</option>
        </select>
        <p className="mt-1.5 text-xs text-muted-foreground">{profile.sizeNote}</p>
      </Group>

      <Group label="Location or postcode">
        <LocationAutocomplete value={value.location} onChange={(v) => set({ location: v })} />
        <label className="mt-2 block text-xs text-muted-foreground">
          Search radius: {value.radiusMiles} miles
          <input
            type="range"
            min={0.5}
            max={25}
            step={0.5}
            value={value.radiusMiles}
            onChange={(e) => set({ radiusMiles: Number(e.target.value) })}
            className="mt-1 w-full accent-[color:var(--brand-dark,#1f4d2b)]"
          />
        </label>
      </Group>

      <Group label="Rent budget (£ per month, excluding rates)">
        <div className="grid grid-cols-2 gap-2">
          <Num placeholder="Min" value={value.budgetMonthlyMin} onChange={(n) => set({ budgetMonthlyMin: n })} />
          <Num placeholder="Max" value={value.budgetMonthlyMax} onChange={(n) => set({ budgetMonthlyMax: n })} />
        </div>
        {value.budgetMonthlyMax != null && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            About £{(value.budgetMonthlyMax * 12).toLocaleString()} per year before rates, service charge and VAT.
          </p>
        )}
      </Group>

      <Group label="Floor area (sq ft)">
        <div className="grid grid-cols-2 gap-2">
          <Num placeholder={`Min (${area.min.toLocaleString()})`} value={value.minSqFt} onChange={(n) => set({ minSqFt: n })} />
          <Num placeholder={`Max (${area.max.toLocaleString()})`} value={value.maxSqFt} onChange={(n) => set({ maxSqFt: n })} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Found-r recommends {area.min.toLocaleString()}–{area.max.toLocaleString()} sq ft for this concept.
        </p>
      </Group>

      <Group label="Scale of operation">
        <div className="grid grid-cols-2 gap-2">
          <Num placeholder="Staff on site" value={value.staffCount} onChange={(n) => set({ staffCount: n })} />
          <Num placeholder="Peak customers" value={value.customerCapacity} onChange={(n) => set({ customerCapacity: n })} />
        </div>
      </Group>

      <Group label="Property type">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
            <Toggle
              key={t}
              on={value.propertyTypes.includes(t)}
              onClick={() =>
                set({
                  propertyTypes: value.propertyTypes.includes(t)
                    ? value.propertyTypes.filter((x) => x !== t)
                    : [...value.propertyTypes, t],
                })
              }
            >
              {PROPERTY_TYPE_LABELS[t]}
            </Toggle>
          ))}
        </div>
      </Group>

      <Group label="Required features">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((f) => (
            <Toggle
              key={f}
              on={value.requiredFeatures.includes(f)}
              onClick={() =>
                set({
                  requiredFeatures: value.requiredFeatures.includes(f)
                    ? value.requiredFeatures.filter((x) => x !== f)
                    : [...value.requiredFeatures, f],
                })
              }
            >
              {FEATURE_LABELS[f]}
            </Toggle>
          ))}
        </div>
      </Group>

      <Group label="Lease and timing">
        <div className="grid grid-cols-2 gap-2">
          <Num placeholder="Preferred lease (yrs)" value={value.leaseLengthYears} onChange={(n) => set({ leaseLengthYears: n })} />
          <input
            type="date"
            value={value.moveInBy ?? ""}
            onChange={(e) => set({ moveInBy: e.target.value || null })}
            className="rounded-xl border border-border bg-background px-3 py-2"
            aria-label="Move-in by"
          />
        </div>
      </Group>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={strongOnly} onChange={(e) => onStrongOnly(e.target.checked)} className="h-4 w-4" />
        Show only strong matches
      </label>

      <button
        onClick={onSearch}
        disabled={searching || value.location.trim().length === 0}
        className="w-full rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {searching ? "Searching sources…" : "Search premises"}
      </button>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-brand-dark">{label}</div>
      {children}
    </div>
  );
}

function Num({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      value={value ?? ""}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="w-full rounded-xl border border-border bg-background px-3 py-2"
    />
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${on ? "border-brand-dark bg-accent" : "border-border"}`}
    >
      {children}
    </button>
  );
}
