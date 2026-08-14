// Deterministic competitive intelligence maths.
// Pure functions only — no I/O, no AI, no invented figures.

import type { CICompetitor, ChangeKind, Severity } from "./types";

export interface PlaceObservation {
  placeId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviews: number | null;
  businessStatus: string | null;
  category: string | null;
  website: string | null;
  priceLevel: string | null;
  openingHours: string[];
}

export interface SnapshotLike {
  rating: number | null;
  reviews: number | null;
  businessStatus: string | null;
  category: string | null;
  competitorScore: number | null;
  capturedAt?: string;
}

export interface DetectedChange {
  kind: ChangeKind;
  severity: Severity;
  priority: number;
  title: string;
  detail: string;
  metrics: ChangeMetrics;
}

export function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** How likely this business is a genuine competitor (0-100), before user curation. */
export function relevanceScore(o: PlaceObservation, distanceM: number | null, radiusMiles: number): number {
  const radiusM = Math.max(400, radiusMiles * 1609.34);
  const proximity = distanceM === null ? 50 : Math.max(0, 100 - (distanceM / radiusM) * 100);
  const presence = o.reviews === null ? 40 : Math.min(100, Math.log10(o.reviews + 1) * 45);
  const operating = o.businessStatus && o.businessStatus !== "OPERATIONAL" ? 0 : 100;
  return Math.round(proximity * 0.5 + presence * 0.3 + operating * 0.2);
}

/**
 * Competitor strength (0-100) from observed signals only: rating, review volume
 * and proximity. Never uses revenue, footfall or any figure Found-r cannot see.
 */
export function competitorScore(o: PlaceObservation, distanceM: number | null, radiusMiles: number): number | null {
  if (o.rating === null && o.reviews === null) return null;
  const radiusM = Math.max(400, radiusMiles * 1609.34);
  const ratingPart = o.rating === null ? 50 : ((o.rating - 1) / 4) * 100;
  const volumePart = o.reviews === null ? 30 : Math.min(100, Math.log10(o.reviews + 1) * 40);
  const proximityPart = distanceM === null ? 50 : Math.max(0, 100 - (distanceM / radiusM) * 100);
  return Math.round(ratingPart * 0.4 + volumePart * 0.35 + proximityPart * 0.25);
}

/** Market pressure 0-100 across the competitor set the user considers relevant. */
export function competitionScore(list: Array<{ competitorScore: number | null; distanceM: number | null }>): number | null {
  if (list.length === 0) return null;
  const density = Math.min(100, list.length * 6);
  const scored = list.map((c) => c.competitorScore).filter((s): s is number => s !== null);
  const strength = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 50;
  const near = list.filter((c) => c.distanceM !== null && c.distanceM < 800).length;
  const proximityPressure = Math.min(100, near * 15);
  return Math.round(density * 0.4 + strength * 0.4 + proximityPressure * 0.2);
}

export function averageOf(values: Array<number | null>): number | null {
  const v = values.filter((x): x is number => x !== null);
  if (!v.length) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
}

function proximityWeight(distanceM: number | null): number {
  if (distanceM === null) return 0.6;
  if (distanceM < 400) return 1;
  if (distanceM < 800) return 0.85;
  if (distanceM < 1600) return 0.65;
  return 0.45;
}

/** Intelligence priority (0-100): how prominently this change deserves to be shown. */
export function priorityOf(input: {
  magnitude: number; // 0-1
  distanceM: number | null;
  tracked: boolean;
  relevance: number;
  baseImpact: number; // 0-100 for the change kind
}): number {
  const p =
    input.baseImpact * 0.4 * proximityWeight(input.distanceM) +
    input.magnitude * 100 * 0.3 +
    (input.tracked ? 100 : input.relevance) * 0.2 +
    input.relevance * 0.1;
  return Math.max(1, Math.min(100, Math.round(p)));
}

function severityFor(priority: number, kind: ChangeKind): Severity {
  if (kind === "new_competitor" || kind === "competitor_closed" || kind === "status_change") {
    return priority >= 65 ? "critical" : "important";
  }
  if (priority >= 70) return "critical";
  if (priority >= 45) return "important";
  return "informational";
}

/** Compare a stored snapshot with fresh observation. Programmatic only — no AI. */
export function detectChanges(
  competitor: Pick<CICompetitor, "name" | "status" | "distanceM" | "relevance">,
  prev: SnapshotLike | null,
  next: SnapshotLike & { category: string | null },
): DetectedChange[] {
  if (!prev) return [];
  const tracked = competitor.status === "tracked" || competitor.status === "user_added";
  const out: DetectedChange[] = [];
  const push = (kind: ChangeKind, magnitude: number, baseImpact: number, title: string, detail: string, metrics: ChangeMetrics) => {
    const priority = priorityOf({ magnitude, distanceM: competitor.distanceM, tracked, relevance: competitor.relevance, baseImpact });
    out.push({ kind, severity: severityFor(priority, kind), priority, title, detail, metrics });
  };

  if (prev.rating !== null && next.rating !== null && Math.abs(next.rating - prev.rating) >= 0.1) {
    const delta = Math.round((next.rating - prev.rating) * 10) / 10;
    push(
      "rating_change",
      Math.min(1, Math.abs(delta) / 0.5),
      60,
      `${competitor.name} rating ${delta > 0 ? "increased" : "decreased"}`,
      `Google rating moved from ${prev.rating} to ${next.rating}.`,
      { from: prev.rating, to: next.rating, delta },
    );
  }

  if (prev.reviews !== null && next.reviews !== null && next.reviews > prev.reviews) {
    const gained = next.reviews - prev.reviews;
    const pct = prev.reviews > 0 ? gained / prev.reviews : 1;
    if (gained >= 5 || pct >= 0.05) {
      push(
        "review_growth",
        Math.min(1, pct / 0.25),
        55,
        `${competitor.name} gained ${gained} reviews`,
        `Review count increased from ${prev.reviews} to ${next.reviews} since the previous analysis.`,
        { from: prev.reviews, to: next.reviews, gained },
      );
    }
  }

  if (prev.businessStatus !== next.businessStatus && next.businessStatus) {
    const closed = next.businessStatus !== "OPERATIONAL";
    push(
      closed ? "competitor_closed" : "status_change",
      1,
      closed ? 85 : 60,
      closed ? `${competitor.name} may have closed` : `${competitor.name} status changed`,
      closed
        ? `Found-r can no longer verify this business as operating. Google now reports "${next.businessStatus.replace(/_/g, " ").toLowerCase()}".`
        : `Business status changed from ${prev.businessStatus ?? "unknown"} to ${next.businessStatus}.`,
      { from: prev.businessStatus, to: next.businessStatus },
    );
  }

  if (prev.category && next.category && prev.category !== next.category) {
    push("category_change", 0.6, 45, `${competitor.name} changed category`, `Classification moved from ${prev.category} to ${next.category}.`, {
      from: prev.category,
      to: next.category,
    });
  }

  if (prev.competitorScore !== null && next.competitorScore !== null && Math.abs(next.competitorScore - prev.competitorScore) >= 5) {
    const delta = next.competitorScore - prev.competitorScore;
    push(
      "score_change",
      Math.min(1, Math.abs(delta) / 20),
      50,
      `${competitor.name} competitor score ${delta > 0 ? "rose" : "fell"}`,
      `Found-r's observed-signal competitor score moved from ${prev.competitorScore} to ${next.competitorScore}.`,
      { from: prev.competitorScore, to: next.competitorScore, delta },
    );
  }

  return out;
}

export interface OpportunityDraft {
  kind: string;
  title: string;
  whatWeFound: string;
  whyItMatters: string;
  whatToConsider: string[];
  confidence: "low" | "moderate" | "high";
}

function closesBefore(hours: string[], hour: number): boolean | null {
  if (!hours.length) return null;
  const times = hours
    .map((line) => {
      const m = line.match(/[–-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/);
      if (!m) return null;
      let h = Number(m[1]);
      const mer = (m[3] ?? "").toLowerCase();
      if (mer === "pm" && h < 12) h += 12;
      if (mer === "am" && h === 12) h = 0;
      return h;
    })
    .filter((h): h is number => h !== null);
  if (!times.length) return null;
  return Math.max(...times) < hour;
}

/** Opportunities derived only from observed Google Places fields. */
export function detectOpportunities(
  competitors: CICompetitor[],
  ctx: { newCount: number; radiusMiles: number },
): OpportunityDraft[] {
  const relevant = competitors.filter((c) => c.status !== "dismissed" && c.status !== "inactive");
  const out: OpportunityDraft[] = [];
  if (relevant.length === 0) return out;

  const withHours = relevant.filter((c) => c.openingHours.length > 0);
  const early = withHours.filter((c) => closesBefore(c.openingHours, 18) === true);
  if (withHours.length >= 3 && early.length / withHours.length >= 0.6) {
    out.push({
      kind: "hours_gap",
      title: "Evening trading appears under-served",
      whatWeFound: `${early.length} of ${withHours.length} nearby businesses with published hours appear to close before 6pm.`,
      whyItMatters: "If most of the local market shuts early, evening demand may be going unmet — though published hours can be out of date.",
      whatToConsider: [
        "Consider testing a limited evening trading trial before committing to permanent hours.",
        "Check published hours in person for two or three of the closest competitors.",
        "Worth investigating whether evening footfall in the area supports the extra staffing cost.",
      ],
      confidence: "moderate",
    });
  }

  const noSite = relevant.filter((c) => !c.website);
  if (relevant.length >= 4 && noSite.length / relevant.length >= 0.4) {
    out.push({
      kind: "online_gap",
      title: "Online presence appears inconsistent locally",
      whatWeFound: `${noSite.length} of ${relevant.length} nearby businesses have no website listed on their Google profile.`,
      whyItMatters: "Where competitors have a weak online footprint, search and booking journeys may be easier to win.",
      whatToConsider: [
        "Consider strengthening your local search listing and booking flow.",
        "The data suggests reviewing which competitors rank for your core local searches.",
      ],
      confidence: "moderate",
    });
  }

  const rated = relevant.filter((c) => c.reviews !== null && c.reviews > 0);
  if (rated.length >= 4) {
    const avg = rated.reduce((s, c) => s + (c.reviews ?? 0), 0) / rated.length;
    const leader = [...rated].sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))[0];
    if (leader && (leader.reviews ?? 0) > avg * 2.5) {
      out.push({
        kind: "review_gap",
        title: "One competitor dominates local review volume",
        whatWeFound: `${leader.name} holds ${leader.reviews} reviews against a local average of ${Math.round(avg)}.`,
        whyItMatters: "A single dominant review profile usually shapes how new customers choose in the area.",
        whatToConsider: [
          "Consider reading their recent reviews to identify what customers appear to value.",
          "You may want to test a structured review request at the point of sale.",
        ],
        confidence: "high",
      });
    }
  }

  const priced = relevant.filter((c) => c.priceLevel);
  if (priced.length >= 4) {
    const counts = new Map<string, number>();
    for (const c of priced) counts.set(c.priceLevel!, (counts.get(c.priceLevel!) ?? 0) + 1);
    const [topLevel, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!;
    if (topCount / priced.length >= 0.6) {
      out.push({
        kind: "pricing_gap",
        title: "Local pricing appears concentrated",
        whatWeFound: `${topCount} of ${priced.length} competitors with a published price level sit in the same band (${topLevel.replace("PRICE_LEVEL_", "").toLowerCase()}).`,
        whyItMatters: "Clustered pricing can leave either the value or premium end of the market thinly served.",
        whatToConsider: [
          "Consider whether a clearly differentiated price position is viable for your cost base.",
          "Worth investigating what a premium or value offer would need to look like locally.",
        ],
        confidence: "low",
      });
    }
  }

  if (relevant.length <= 4) {
    out.push({
      kind: "market_gap",
      title: "Competitor density is relatively low",
      whatWeFound: `Found-r identified ${relevant.length} relevant businesses within ${ctx.radiusMiles} mile${ctx.radiusMiles === 1 ? "" : "s"}.`,
      whyItMatters: "Low density can mean headroom — or it can mean limited local demand. The count alone does not tell you which.",
      whatToConsider: [
        "Consider checking demand indicators for the area before reading this as headroom.",
        "The data suggests widening the search radius to see where customers currently go.",
      ],
      confidence: "low",
    });
  }

  if (ctx.newCount > 0) {
    out.push({
      kind: "new_entrant_risk",
      title: `${ctx.newCount} new competitor${ctx.newCount === 1 ? "" : "s"} entered your local market`,
      whatWeFound: `${ctx.newCount} business${ctx.newCount === 1 ? "" : "es"} appeared in this analysis that Found-r had not previously recorded.`,
      whyItMatters: "New entrants can shift customer choice quickly, particularly close to your location.",
      whatToConsider: [
        "Consider reviewing their positioning and pricing.",
        "You may want to monitor their reviews over the next month.",
        "Worth investigating which services they do not offer.",
      ],
      confidence: "high",
    });
  }

  return out;
}

export function landscapeInterpretation(current: number | null, previous: number | null): string {
  if (current === null) return "Not enough data to determine competitive pressure around your location.";
  if (previous === null) return `This is your first competitive baseline. Competition around your location scores ${current}/100 on observed signals.`;
  const delta = current - previous;
  if (Math.abs(delta) < 3) return "Competition around your location is broadly unchanged since your previous analysis.";
  const dir = delta > 0 ? "increased" : "eased";
  const size = Math.abs(delta) >= 10 ? "notably" : "moderately";
  return `Competition around your location has ${dir} ${size} since your previous analysis (${previous} → ${current}).`;
}
