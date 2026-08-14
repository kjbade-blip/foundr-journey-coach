// The continuous intelligence loop: DISCOVER → CURATE → TRACK → MONITOR →
// DETECT → INTERPRET → ACT → REPEAT.
//
// Cost discipline: every comparison here is programmatic. AI is invoked only
// for critical changes during a scan, and cached on the change row.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { searchCompetitors } from "./places.server";
import {
  averageOf,
  competitionScore,
  competitorScore,
  detectChanges,
  detectOpportunities,
  distanceMetres,
  landscapeInterpretation,
  priorityOf,
  relevanceScore,
  type PlaceObservation,
} from "./scoring";
import { interpretChange } from "./interpret.server";
import { metresToMiles, type CICompetitor, type CompetitorStatus } from "./types";

type DB = SupabaseClient<Database>;

export interface ScanBusiness {
  id: string;
  name: string;
  placeId: string | null;
  lat: number;
  lng: number;
  businessType: string;
  searchTerm: string | null;
  radiusMiles: number;
}

function rowToCompetitor(row: any, snap: any | null): CICompetitor {
  return {
    id: row.id,
    placeId: row.place_id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    distanceM: row.distance_m,
    category: snap?.category ?? row.category,
    status: row.status as CompetitorStatus,
    source: row.source,
    relevance: row.relevance,
    competitorScore: row.competitor_score,
    rating: snap?.rating ?? null,
    reviews: snap?.reviews ?? null,
    businessStatus: snap?.business_status ?? null,
    website: snap?.website ?? null,
    priceLevel: snap?.price_level ?? null,
    openingHours: Array.isArray(snap?.opening_hours) ? (snap.opening_hours as string[]) : [],
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    updatedAt: row.updated_at,
  };
}

export async function loadCompetitors(supabase: DB, businessId: string): Promise<CICompetitor[]> {
  const { data: rows, error } = await supabase
    .from("ci_competitors")
    .select("*")
    .eq("business_id", businessId)
    .order("distance_m", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  const ids = (rows ?? []).map((r) => r.id);
  if (!ids.length) return [];
  const { data: snaps } = await supabase
    .from("ci_snapshots")
    .select("*")
    .in("competitor_id", ids)
    .order("captured_at", { ascending: false });
  const latest = new Map<string, any>();
  for (const s of snaps ?? []) if (!latest.has(s.competitor_id)) latest.set(s.competitor_id, s);
  return (rows ?? []).map((r) => rowToCompetitor(r, latest.get(r.id) ?? null));
}

export async function runScan(supabase: DB, userId: string, business: ScanBusiness) {
  const term = business.searchTerm ?? business.businessType;
  const observed = await searchCompetitors(term, business.lat, business.lng, business.radiusMiles);
  const origin = { lat: business.lat, lng: business.lng };

  const existing = await loadCompetitors(supabase, business.id);
  const byPlace = new Map(existing.filter((c) => c.placeId).map((c) => [c.placeId!, c]));
  const seen = new Set<string>();

  const { data: prevScan } = await supabase
    .from("ci_scans")
    .select("*")
    .eq("business_id", business.id)
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: scanRow, error: scanErr } = await supabase
    .from("ci_scans")
    .insert({ business_id: business.id, user_id: userId })
    .select("id")
    .single();
  if (scanErr) throw new Error(scanErr.message);
  const scanId = scanRow.id;

  const changes: Array<{
    competitor_id: string | null;
    kind: string;
    severity: string;
    priority: number;
    title: string;
    detail: string;
    metrics: Record<string, unknown>;
    competitorName: string | null;
    competitorStatus: string | null;
    distanceM: number | null;
  }> = [];

  let newCount = 0;

  for (const o of observed) {
    if (business.placeId && o.placeId === business.placeId) continue;
    seen.add(o.placeId);
    const dist = o.lat !== null && o.lng !== null ? distanceMetres(origin, { lat: o.lat, lng: o.lng }) : null;
    const relevance = relevanceScore(o, dist, business.radiusMiles);
    const score = competitorScore(o, dist, business.radiusMiles);
    const prior = byPlace.get(o.placeId) ?? null;

    // User decisions are authoritative and are never overwritten by a scan.
    let status: CompetitorStatus = prior ? prior.status : "identified";
    if (prior && prior.status === "inactive") status = "identified";

    const payload = {
      business_id: business.id,
      user_id: userId,
      place_id: o.placeId,
      name: o.name,
      address: o.address,
      lat: o.lat,
      lng: o.lng,
      distance_m: dist,
      category: o.category,
      status,
      source: prior?.source ?? "foundr",
      relevance,
      competitor_score: score,
      last_seen_at: new Date().toISOString(),
    };

    let competitorId = prior?.id ?? null;
    if (prior) {
      await supabase.from("ci_competitors").update(payload).eq("id", prior.id);
    } else {
      const { data: ins, error: insErr } = await supabase.from("ci_competitors").insert(payload).select("id").single();
      if (insErr) continue;
      competitorId = ins.id;
      newCount += 1;
      const priority = priorityOf({ magnitude: 1, distanceM: dist, tracked: false, relevance, baseImpact: 80 });
      changes.push({
        competitor_id: competitorId,
        kind: "new_competitor",
        severity: priority >= 65 ? "critical" : "important",
        priority,
        title: o.name,
        detail: `A new ${o.category ?? business.businessType} has been identified ${metresToMiles(dist)} from ${business.name}.`,
        metrics: { distanceM: dist, rating: o.rating, reviews: o.reviews },
        competitorName: o.name,
        competitorStatus: status,
        distanceM: dist,
      });
    }
    if (!competitorId) continue;

    if (prior) {
      const detected = detectChanges(
        { name: prior.name, status: prior.status, distanceM: dist, relevance },
        {
          rating: prior.rating,
          reviews: prior.reviews,
          businessStatus: prior.businessStatus,
          category: prior.category,
          competitorScore: prior.competitorScore,
        },
        {
          rating: o.rating,
          reviews: o.reviews,
          businessStatus: o.businessStatus,
          category: o.category,
          competitorScore: score,
        },
      );
      for (const d of detected) {
        changes.push({
          competitor_id: competitorId,
          kind: d.kind,
          severity: d.severity,
          priority: d.priority,
          title: d.title,
          detail: d.detail,
          metrics: d.metrics,
          competitorName: prior.name,
          competitorStatus: prior.status,
          distanceM: dist,
        });
      }
    }

    await supabase.from("ci_snapshots").insert({
      competitor_id: competitorId,
      user_id: userId,
      rating: o.rating,
      reviews: o.reviews,
      business_status: o.businessStatus,
      category: o.category,
      website: o.website,
      price_level: o.priceLevel,
      competitor_score: score,
      opening_hours: o.openingHours,
    });
  }

  // Disappearances — only meaningful for businesses the user cares about.
  let closedCount = 0;
  for (const c of existing) {
    if (!c.placeId || seen.has(c.placeId) || c.status === "dismissed" || c.status === "inactive") continue;
    closedCount += 1;
    await supabase.from("ci_competitors").update({ status: "inactive" }).eq("id", c.id);
    const priority = priorityOf({
      magnitude: 1,
      distanceM: c.distanceM,
      tracked: c.status === "tracked" || c.status === "user_added",
      relevance: c.relevance,
      baseImpact: 80,
    });
    changes.push({
      competitor_id: c.id,
      kind: "competitor_closed",
      severity: priority >= 65 ? "critical" : "important",
      priority,
      title: `${c.name} may have closed`,
      detail: "Found-r can no longer verify this business as operating in your analysis area.",
      metrics: { lastSeenAt: c.lastSeenAt },
      competitorName: c.name,
      competitorStatus: c.status,
      distanceM: c.distanceM,
    });
  }

  const fresh = await loadCompetitors(supabase, business.id);
  const active = fresh.filter((c) => c.status !== "dismissed" && c.status !== "inactive");
  const score = competitionScore(active.map((c) => ({ competitorScore: c.competitorScore, distanceM: c.distanceM })));
  const avgRating = averageOf(active.map((c) => c.rating));
  const avgReviews = averageOf(active.map((c) => c.reviews));
  const density = Math.round((active.length / (Math.PI * business.radiusMiles ** 2)) * 10) / 10;

  const prevTotal = prevScan?.total_competitors ?? null;
  if (prevTotal !== null && prevTotal !== active.length) {
    const delta = active.length - prevTotal;
    const priority = priorityOf({
      magnitude: Math.min(1, Math.abs(delta) / 5),
      distanceM: 500,
      tracked: false,
      relevance: 70,
      baseImpact: 60,
    });
    changes.push({
      competitor_id: null,
      kind: "market_density",
      severity: delta > 0 ? (priority >= 60 ? "important" : "informational") : "informational",
      priority,
      title: delta > 0 ? "Competition has increased" : "Competition has eased",
      detail: `There are now ${active.length} relevant businesses within your ${business.radiusMiles} mile analysis area, compared with ${prevTotal} previously.`,
      metrics: { from: prevTotal, to: active.length, delta },
      competitorName: null,
      competitorStatus: null,
      distanceM: null,
    });
  }

  // Persist changes; interpret only the critical ones now, cache the rest lazily.
  for (const c of changes) {
    let ai: unknown = null;
    if (c.severity === "critical") {
      ai = await interpretChange({
        businessName: business.name,
        businessType: business.businessType,
        competitorName: c.competitorName,
        competitorStatus: c.competitorStatus,
        distanceLabel: metresToMiles(c.distanceM),
        kind: c.kind,
        severity: c.severity,
        title: c.title,
        detail: c.detail,
        metrics: c.metrics,
      });
    }
    await supabase.from("ci_changes").insert({
      business_id: business.id,
      user_id: userId,
      competitor_id: c.competitor_id,
      scan_id: scanId,
      kind: c.kind,
      severity: c.severity,
      priority: c.priority,
      title: c.title,
      detail: c.detail,
      metrics: c.metrics as never,
      ai: ai as never,
    });
  }

  // Opportunities are regenerated per scan; previous open ones are superseded.
  const drafts = detectOpportunities(fresh, { newCount, radiusMiles: business.radiusMiles });
  await supabase.from("ci_opportunities").update({ status: "superseded" }).eq("business_id", business.id).eq("status", "open");
  if (drafts.length) {
    await supabase.from("ci_opportunities").insert(
      drafts.map((d) => ({
        business_id: business.id,
        user_id: userId,
        scan_id: scanId,
        kind: d.kind,
        title: d.title,
        what_we_found: d.whatWeFound,
        why_it_matters: d.whyItMatters,
        what_to_consider: d.whatToConsider as never,
        confidence: d.confidence,
      })),
    );
  }

  await supabase
    .from("ci_scans")
    .update({
      total_competitors: active.length,
      tracked_competitors: fresh.filter((c) => c.status === "tracked" || c.status === "user_added").length,
      new_competitors: newCount,
      closed_competitors: closedCount,
      competition_score: score,
      avg_rating: avgRating,
      avg_reviews: avgReviews,
      market_density: density,
      summary: {
        interpretation: landscapeInterpretation(score, prevScan?.competition_score ?? null),
        previousCompetitionScore: prevScan?.competition_score ?? null,
        previousRanAt: prevScan?.ran_at ?? null,
      } as never,
    })
    .eq("id", scanId);

  return { scanId, newCount, closedCount, changeCount: changes.length, competitionScore: score };
}
