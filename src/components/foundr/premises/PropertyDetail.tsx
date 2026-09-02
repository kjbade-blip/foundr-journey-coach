import { ExternalLink, X } from "lucide-react";
import { FitBadge } from "./FitBadge";
import { GoogleMap } from "@/components/foundr/GoogleMap";
import { monthlyRent, sqFtToSqM } from "@/lib/premises/suitability";
import {
  COST_WARNING,
  FEATURE_LABELS,
  PREMISES_DISCLAIMER,
  PROPERTY_TYPE_LABELS,
  type AssessedListing,
  type FeatureKey,
} from "@/lib/premises/types";

export function PropertyDetail({
  item,
  onClose,
  onCheckViability,
}: {
  item: AssessedListing;
  onClose: () => void;
  onCheckViability: () => void;
}) {
  const { listing: l, assessment: a } = item;
  const rent = monthlyRent(l);
  const center = l.latitude != null && l.longitude != null ? { lat: l.latitude, lng: l.longitude } : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-border bg-card sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card/95 p-5 backdrop-blur">
          <div>
            <h2 className="text-xl font-bold">{l.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {l.addressLine ?? `${l.approximateLocation ?? "Location withheld"} (approximate)`} · {PROPERTY_TYPE_LABELS[l.propertyType]}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <FitBadge status={a.status} score={a.score} />
            <p className="text-sm text-muted-foreground">{a.summary}</p>
          </div>

          {l.imageUrl && <img src={l.imageUrl} alt="" className="max-h-72 w-full rounded-2xl object-cover" />}

          <section>
            <H>The advert</H>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Row label="Rent" value={rent != null ? `£${rent.toLocaleString()}/month` : null} />
              <Row label="Rent (annual)" value={l.rentPerYear != null ? `£${l.rentPerYear.toLocaleString()}/yr` : null} />
              <Row label="Business rates" value={l.ratesPerYear != null ? `£${l.ratesPerYear.toLocaleString()}/yr` : null} />
              <Row label="Service charge" value={l.serviceChargePerYear != null ? `£${l.serviceChargePerYear.toLocaleString()}/yr` : null} />
              <Row label="Deposit" value={l.deposit != null ? `£${l.deposit.toLocaleString()}` : null} />
              <Row
                label="Floor area"
                value={l.sizeSqFt != null ? `${l.sizeSqFt.toLocaleString()} sq ft · ${sqFtToSqM(l.sizeSqFt)} sq m` : null}
              />
              <Row label="Lease type" value={l.leaseType} />
              <Row label="Lease length" value={l.leaseLengthYears != null ? `${l.leaseLengthYears} years` : null} />
              <Row label="Available from" value={l.availableFrom} />
              <Row label="EPC" value={l.epcRating} />
              <Row label="Agent" value={l.agentName} />
              <Row label="Agent contact" value={l.agentContact} />
            </dl>
            {l.description && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{l.description}</p>}
            <p className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">{COST_WARNING}</p>
          </section>

          <section>
            <H>Features stated in the advert</H>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((f) => {
                const v = l.features[f];
                return (
                  <span
                    key={f}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      v === true
                        ? "bg-[color:var(--success)]/12 text-[color:var(--success)]"
                        : v === false
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {FEATURE_LABELS[f]}: {v === true ? "Yes" : v === false ? "Stated not available" : "Not stated"}
                  </span>
                );
              })}
            </div>
          </section>

          {center && (
            <section>
              <H>Location</H>
              <div className="h-56 overflow-hidden rounded-2xl border border-border">
                <GoogleMap center={center} zoom={15} markers={[{ lat: center.lat, lng: center.lng, primary: true, title: l.title }]} className="h-full w-full" />
              </div>
            </section>
          )}

          <section>
            <H>Suitability assessment</H>
            <List title="What works" items={a.positives} tone="good" />
            <List title="Gaps" items={a.gaps} tone="warn" />
            <List title="Risks" items={a.risks} tone="warn" />
            {a.notStated.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Not stated in the advert (this is missing information, not a confirmed absence):{" "}
                {a.notStated.join(", ")}.
              </p>
            )}
          </section>

          <section>
            <H>Questions to ask the agent</H>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {a.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </section>

          <section>
            <H>Always confirm separately from property fit</H>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {a.externalChecks.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-2">
            <button onClick={onCheckViability} className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white">
              Check viability in Opportunity Finder
            </button>
            <a
              href={l.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
            >
              <ExternalLink className="h-4 w-4" /> Original advert on {l.sourceName}
            </a>
          </div>

          <p className="text-[11px] text-muted-foreground">{PREMISES_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-dark">{children}</h3>;
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={value ? "font-medium" : "italic text-muted-foreground"}>{value ?? "Not stated"}</dd>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <div className={`text-xs font-bold ${tone === "good" ? "text-[color:var(--success)]" : "text-[color:var(--warning)]"}`}>{title}</div>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
