import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Star,
  Tag,
} from "lucide-react";
import { Card, PageHeader, Pill } from "@/components/foundr/ui";
import { GoogleMap } from "@/components/foundr/GoogleMap";
import { prettyUrl } from "@/components/foundr/Linkify";
import { getBusinessProfile } from "@/lib/competitor-profile.functions";

export const Route = createFileRoute("/_authenticated/app/competitor/$placeId")({
  head: () => ({
    meta: [
      { title: "Competitor profile — Found-r" },
      { name: "description", content: "Publicly available contact, location, pricing and review information for a competing business." },
      { property: "og:title", content: "Competitor profile — Found-r" },
      { property: "og:description", content: "Publicly available contact, location, pricing and review information for a competing business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompetitorProfilePage,
});

const PRICE_LABEL: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "£",
  PRICE_LEVEL_MODERATE: "££",
  PRICE_LEVEL_EXPENSIVE: "£££",
  PRICE_LEVEL_VERY_EXPENSIVE: "££££",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function Unavailable({ what }: { what: string }) {
  return <p className="text-sm text-muted-foreground">{what} is not published by any source we can access.</p>;
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}

function CompetitorProfilePage() {
  const { placeId } = Route.useParams();
  const profileFn = useServerFn(getBusinessProfile);
  const { data, isPending, isError } = useQuery({
    queryKey: ["business-profile", placeId],
    queryFn: () => profileFn({ data: { placeId } }),
    staleTime: 5 * 60 * 1000,
  });

  if (isPending) {
    return (
      <div className="flex items-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Building the public profile…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <p className="text-sm font-semibold">We couldn’t load this business profile.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The listing may have been removed, or the source is temporarily unavailable.
        </p>
        <Link to="/app/intelligence" className="mt-4 inline-flex text-sm font-semibold underline-offset-2 hover:underline">
          Back to Competitor Intelligence
        </Link>
      </Card>
    );
  }

  const p = data;

  return (
    <div className="space-y-6">
      <Link
        to="/app/intelligence"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Competitor Intelligence
      </Link>

      <PageHeader
        eyebrow="Public business profile"
        title={p.name}
        subtitle={p.summary ?? p.siteDescription ?? p.address ?? undefined}
      />

      <div className="flex flex-wrap gap-2 text-xs">
        {p.category && <Pill tone="brand">{p.category}</Pill>}
        {p.rating !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-semibold">
            <Star className="h-3.5 w-3.5" /> {p.rating} · {p.reviews ?? 0} Google reviews
          </span>
        )}
        {(p.priceRange || p.priceLevel) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-semibold">
            <Tag className="h-3.5 w-3.5" /> {p.priceRange ?? PRICE_LABEL[p.priceLevel!] ?? p.priceLevel}
          </span>
        )}
        {p.businessStatus && (
          <span className="rounded-full bg-muted px-3 py-1 font-semibold">{p.businessStatus.replace(/_/g, " ")}</span>
        )}
        {p.openNow !== null && (
          <span className="rounded-full bg-muted px-3 py-1 font-semibold">{p.openNow ? "Open now" : "Closed now"}</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Contact & web">
          <div className="grid gap-2 text-sm">
            {p.address ? (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{p.address}</span>
              </div>
            ) : (
              <Unavailable what="An address" />
            )}
            {p.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a href={`tel:${p.internationalPhone ?? p.phone}`} className="underline-offset-2 hover:underline">
                  {p.phone}
                </a>
              </div>
            )}
            {p.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                <ExtLink href={p.website}>{prettyUrl(p.website)}</ExtLink>
              </div>
            )}
            {p.emails.map((e) => (
              <div key={e} className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a href={`mailto:${e}`} className="underline-offset-2 hover:underline">
                  {e}
                </a>
              </div>
            ))}
            {!p.phone && !p.website && p.emails.length === 0 && <Unavailable what="Contact information" />}
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Social profiles</div>
            {p.socials.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                No social links were published on their website{p.siteError ? ` (${p.siteError.toLowerCase()})` : ""}.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {p.socials.map((s) => (
                  <ExtLink key={s.url} href={s.url}>
                    <span className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                      {s.network}
                    </span>
                  </ExtLink>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="Location">
          {p.lat !== null && p.lng !== null ? (
            <>
              <GoogleMap
                center={{ lat: p.lat, lng: p.lng }}
                zoom={15}
                markers={[{ lat: p.lat, lng: p.lng, title: p.name, primary: true }]}
                className="h-64 w-full overflow-hidden rounded-xl"
              />
              {p.mapsUri && (
                <div className="mt-3">
                  <ExtLink href={p.mapsUri}>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-2 text-xs font-semibold text-white">
                      Open in Google Maps <ExternalLink className="h-3 w-3" />
                    </span>
                  </ExtLink>
                </div>
              )}
            </>
          ) : (
            <Unavailable what="A map location" />
          )}
        </Section>

        <Section title="Opening hours">
          {p.openingHours.length === 0 ? (
            <Unavailable what="Opening hours" />
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {p.openingHours.map((h) => (
                <li key={h} className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0" /> {h}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Prices & services">
          {p.priceRange && <p className="text-sm">Published price range: <span className="font-semibold">{p.priceRange}</span></p>}
          {!p.priceRange && p.priceLevel && (
            <p className="text-sm">
              Google price level: <span className="font-semibold">{PRICE_LABEL[p.priceLevel] ?? p.priceLevel}</span>
            </p>
          )}
          {p.priceListLinks.length > 0 ? (
            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Menus and price pages on their website
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {p.priceListLinks.map((l) => (
                  <li key={l.url}>
                    <ExtLink href={l.url}>
                      {l.label || prettyUrl(l.url)} <ExternalLink className="h-3 w-3" />
                    </ExtLink>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No public price list or menu page was found. Prices shown by this business elsewhere are not verifiable, so
              Found-r records them as unavailable rather than estimating.
            </p>
          )}
          {p.attributes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {p.attributes.map((a) => (
                <span key={a} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  {a}
                </span>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Review summary (Google)">
        {p.topReviews.length === 0 ? (
          <Unavailable what="Review detail" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Star spread across the {p.topReviews.length} reviews Google publishes
                </div>
                <ul className="mt-2 space-y-1.5">
                  {p.ratingBreakdown.map((b) => (
                    <li key={b.stars} className="flex items-center gap-2 text-xs">
                      <span className="w-8 font-semibold">{b.stars}★</span>
                      <span className="h-1.5 flex-1 rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-brand-dark"
                          style={{ width: `${(b.count / Math.max(1, p.topReviews.length)) * 100}%` }}
                        />
                      </span>
                      <span className="w-6 text-right text-muted-foreground">{b.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What reviewers mention</div>
                {p.reviewThemes.length === 0 ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">No recurring themes in the published reviews.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.reviewThemes.map((t) => (
                      <span key={t.theme} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                        {t.theme} · {t.mentions}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {p.topReviews.map((r, i) => (
                <li key={i} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{r.author}</span>
                    <span>
                      {r.rating ? `★ ${r.rating}` : ""} {r.when}
                    </span>
                  </div>
                  <p className="mt-1.5 text-muted-foreground">{r.text}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="Other public sources">
        <p className="text-sm text-muted-foreground">
          Found-r does not copy data from sites that restrict it. These links open a search on each source so you can check it
          yourself.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.externalSearches.map((s) => (
            <ExtLink key={s.label} href={s.url}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                {s.label} <ExternalLink className="h-3 w-3" />
              </span>
            </ExtLink>
          ))}
        </div>
      </Section>

      <p className="text-[11px] text-muted-foreground">
        Sources: Google Places (retrieved now) and the business’s own public website. Figures are as published by those
        sources and are not estimates. Anything a source does not publish is shown as unavailable.
      </p>
    </div>
  );
}
