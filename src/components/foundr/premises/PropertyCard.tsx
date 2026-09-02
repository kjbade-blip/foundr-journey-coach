import { Bookmark, BookmarkCheck, ExternalLink, EyeOff, GitCompare, MapPin, Share2 } from "lucide-react";
import { FitBadge } from "./FitBadge";
import { sqFtToSqM, monthlyRent } from "@/lib/premises/suitability";
import { PROPERTY_TYPE_LABELS, type AssessedListing } from "@/lib/premises/types";

function money(n: number | null): string | null {
  return n == null ? null : `£${Math.round(n).toLocaleString()}`;
}

export function PropertyCard({
  item,
  saved,
  comparing,
  hidden,
  onOpen,
  onSave,
  onHide,
  onCompare,
}: {
  item: AssessedListing;
  saved: boolean;
  comparing: boolean;
  hidden: boolean;
  onOpen: () => void;
  onSave: () => void;
  onHide: () => void;
  onCompare: () => void;
}) {
  const { listing: l, assessment: a } = item;
  const rent = monthlyRent(l);
  const reasons = [...a.positives, ...a.gaps].slice(0, 3);

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition ${hidden ? "opacity-45" : ""}`}
    >
      <div className="flex flex-col sm:flex-row">
        {l.imageUrl ? (
          <img src={l.imageUrl} alt="" loading="lazy" className="h-40 w-full object-cover sm:h-auto sm:w-48" />
        ) : (
          <div className="grid h-24 w-full place-items-center bg-muted text-xs text-muted-foreground sm:h-auto sm:w-48">
            No image supplied by source
          </div>
        )}

        <div className="flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <button onClick={onOpen} className="text-left text-base font-bold hover:underline">
                {l.title}
              </button>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {l.addressLine ?? l.approximateLocation ?? "Location withheld by source"}
                {!l.addressLine && <span className="italic">(approximate)</span>}
              </div>
            </div>
            <FitBadge status={a.status} score={a.score} />
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <Field label="Rent" value={rent != null ? `${money(rent)}/month` : null} />
            <Field
              label="Floor area"
              value={l.sizeSqFt != null ? `${l.sizeSqFt.toLocaleString()} sq ft · ${sqFtToSqM(l.sizeSqFt)} sq m` : null}
            />
            <Field label="Type" value={PROPERTY_TYPE_LABELS[l.propertyType]} />
            <Field label="Rates" value={l.ratesPerYear != null ? `${money(l.ratesPerYear)}/yr` : null} />
            <Field label="Service charge" value={l.serviceChargePerYear != null ? `${money(l.serviceChargePerYear)}/yr` : null} />
            <Field label="Lease" value={l.leaseLengthYears != null ? `${l.leaseLengthYears} yrs ${l.leaseType ?? ""}`.trim() : l.leaseType} />
            <Field label="Available" value={l.availableFrom} />
            <Field label="Status" value={l.status === "unknown" ? null : l.status.replace("_", " ")} />
          </dl>

          <ul className="mt-3 space-y-1 text-xs">
            {reasons.map((r) => (
              <li key={r} className="text-muted-foreground">
                • {r}
              </li>
            ))}
          </ul>

          {a.flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.flags.slice(0, 5).map((f) => (
                <span key={f} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {f}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <button onClick={onOpen} className="rounded-full bg-brand-dark px-3.5 py-1.5 font-semibold text-white">
              View assessment
            </button>
            <a
              href={l.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-semibold"
            >
              <ExternalLink className="h-3.5 w-3.5" /> {l.sourceName}
            </a>
            <IconBtn onClick={onSave} active={saved} label={saved ? "Saved" : "Save"}>
              {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            </IconBtn>
            <IconBtn onClick={onCompare} active={comparing} label={comparing ? "In compare" : "Compare"}>
              <GitCompare className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn onClick={onHide} active={hidden} label={hidden ? "Unhide" : "Hide"}>
              <EyeOff className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn
              onClick={() => {
                const text = `${l.title} — ${l.sourceName}: ${l.sourceUrl}`;
                if (navigator.share) void navigator.share({ title: l.title, url: l.sourceUrl }).catch(() => {});
                else void navigator.clipboard?.writeText(text);
              }}
              label="Share"
            >
              <Share2 className="h-3.5 w-3.5" />
            </IconBtn>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Source: {l.sourceName} · Listed {l.listedAt ?? "not stated"} · Last checked{" "}
            {new Date(l.lastCheckedAt).toLocaleDateString("en-GB")} ·{" "}
            {l.availabilityConfirmed ? "Availability confirmed by source" : "Availability unverified"}
          </p>
        </div>
      </div>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">{label}</dt>
      <dd className={value ? "font-medium" : "italic text-muted-foreground"}>{value ?? "Not stated"}</dd>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-semibold ${
        active ? "border-brand-dark bg-accent" : "border-border"
      }`}
    >
      {children} {label}
    </button>
  );
}
