import { useState } from "react";
import { PROPERTY_TYPE_LABELS, FEATURE_LABELS, type FeatureKey, type PropertyListing, type PropertyType } from "@/lib/premises/types";

/**
 * Lets the user paste an advert they found themselves so Found-r can assess it.
 * Nothing is inferred: any field left blank stays "Not stated".
 */
export function AddListingForm({ onAdd }: { onAdd: (l: PropertyListing) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [type, setType] = useState<PropertyType>("retail");
  const [size, setSize] = useState("");
  const [rent, setRent] = useState("");
  const [features, setFeatures] = useState<Partial<Record<FeatureKey, boolean>>>({});

  function submit() {
    if (!url.trim() || !title.trim()) return;
    let host = "Advert you added";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* keep the fallback label */
    }
    onAdd({
      id: `user-${Date.now()}`,
      sourceId: "user_added",
      sourceName: host,
      sourceUrl: url.trim(),
      sourceListingId: null,
      title: title.trim(),
      addressLine: address.trim() || null,
      approximateLocation: null,
      postcode: postcode.trim() || null,
      latitude: null,
      longitude: null,
      propertyType: type,
      sizeSqFt: size ? Number(size) : null,
      sizeSqFtMax: null,
      rentPerMonth: rent ? Number(rent) : null,
      rentPerYear: null,
      ratesPerYear: null,
      serviceChargePerYear: null,
      deposit: null,
      leaseType: null,
      leaseLengthYears: null,
      availableFrom: null,
      features,
      description: null,
      imageUrl: null,
      agentName: null,
      agentContact: null,
      epcRating: null,
      listedAt: null,
      lastCheckedAt: new Date().toISOString(),
      availabilityConfirmed: false,
      status: "unknown",
    });
    setUrl("");
    setTitle("");
    setAddress("");
    setPostcode("");
    setSize("");
    setRent("");
    setFeatures({});
    setOpen(false);
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
        Assess an advert you found
      </button>
    );

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5 text-sm">
      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Assess an advert you found</div>
      <p className="text-xs text-muted-foreground">
        Paste the listing link and whatever the advert states. Leave anything unstated blank — Found-r will treat it as
        missing information rather than as a problem.
      </p>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Listing URL" aria-label="Listing URL" className="w-full rounded-xl border border-border bg-background px-3 py-2" />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Advert headline" aria-label="Advert headline" className="w-full rounded-xl border border-border bg-background px-3 py-2" />
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (if stated)" aria-label="Address" className="rounded-xl border border-border bg-background px-3 py-2" />
        <input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Postcode" aria-label="Postcode" className="rounded-xl border border-border bg-background px-3 py-2" />
        <input value={size} onChange={(e) => setSize(e.target.value)} inputMode="numeric" placeholder="Floor area (sq ft)" aria-label="Floor area in sq ft" className="rounded-xl border border-border bg-background px-3 py-2" />
        <input value={rent} onChange={(e) => setRent(e.target.value)} inputMode="numeric" placeholder="Rent (£ per month)" aria-label="Rent per month" className="rounded-xl border border-border bg-background px-3 py-2" />
        <select value={type} onChange={(e) => setType(e.target.value as PropertyType)} aria-label="Property type" className="rounded-xl border border-border bg-background px-3 py-2">
          {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
            <option key={t} value={t}>
              {PROPERTY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Tap once for “stated yes”, twice for “stated no”.</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((f) => {
            const v = features[f];
            return (
              <button
                key={f}
                type="button"
                onClick={() =>
                  setFeatures((prev) => {
                    const next = { ...prev };
                    if (prev[f] === undefined) next[f] = true;
                    else if (prev[f] === true) next[f] = false;
                    else delete next[f];
                    return next;
                  })
                }
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  v === true ? "border-brand-dark bg-accent" : v === false ? "border-destructive text-destructive" : "border-border"
                }`}
              >
                {FEATURE_LABELS[f]}
                {v === true ? " ✓" : v === false ? " ✕" : ""}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">
          Assess this unit
        </button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
          Cancel
        </button>
      </div>
    </div>
  );
}
