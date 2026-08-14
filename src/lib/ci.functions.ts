import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadCompetitors, runScan } from "./ci/scan.server";
import { interpretChange } from "./ci/interpret.server";
import { fetchPlace } from "./ci/places.server";
import { competitorScore, distanceMetres, landscapeInterpretation, relevanceScore } from "./ci/scoring";
import { metresToMiles } from "./ci/types";
import type {
  CIAlertSettings,
  CIBusiness,
  CIChange,
  CIIntelligence,
  CIOpportunity,
  CISnapshotPoint,
  ChangeInterpretation,
} from "./ci/types";

const DEFAULT_SETTINGS: CIAlertSettings = {
  newCompetitors: true,
  majorChanges: true,
  closures: true,
  opportunities: true,
  marketChanges: true,
  frequency: "weekly",
  emailEnabled: false,
};

function toBusiness(r: any): CIBusiness {
  return {
    id: r.id,
    name: r.name,
    placeId: r.place_id,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    businessType: r.business_type,
    searchTerm: r.search_term,
    radiusMiles: Number(r.radius_miles),
    isPrimary: r.is_primary,
  };
}

export const listCIBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CIBusiness[]> => {
    const { data, error } = await context.supabase
      .from("ci_businesses")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toBusiness);
  });

export const createCIBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(1).max(160),
        placeId: z.string().max(200).nullable().default(null),
        address: z.string().max(300).nullable().default(null),
        lat: z.number(),
        lng: z.number(),
        businessType: z.string().min(1).max(80),
        searchTerm: z.string().max(120).nullable().default(null),
        radiusMiles: z.number().min(0.25).max(10).default(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<CIBusiness> => {
    const { count } = await context.supabase.from("ci_businesses").select("id", { count: "exact", head: true });
    const { data: row, error } = await context.supabase
      .from("ci_businesses")
      .insert({
        user_id: context.userId,
        name: data.name,
        place_id: data.placeId,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        business_type: data.businessType,
        search_term: data.searchTerm ?? data.businessType,
        radius_miles: data.radiusMiles,
        is_primary: (count ?? 0) === 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toBusiness(row);
  });

export const runCIScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ businessId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ci_businesses")
      .select("*")
      .eq("id", data.businessId)
      .single();
    if (error) throw new Error(error.message);
    const b = toBusiness(row);
    return runScan(context.supabase, context.userId, {
      id: b.id,
      name: b.name,
      placeId: b.placeId,
      lat: b.lat,
      lng: b.lng,
      businessType: b.businessType,
      searchTerm: b.searchTerm,
      radiusMiles: b.radiusMiles,
    });
  });

export const getIntelligence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ businessId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<CIIntelligence> => {
    const { data: row, error } = await context.supabase
      .from("ci_businesses")
      .select("*")
      .eq("id", data.businessId)
      .single();
    if (error) throw new Error(error.message);
    const business = toBusiness(row);

    const competitors = await loadCompetitors(context.supabase, business.id);

    const [{ data: changeRows }, { data: oppRows }, { data: scans }, { data: settingsRow }] = await Promise.all([
      context.supabase
        .from("ci_changes")
        .select("*")
        .eq("business_id", business.id)
        .eq("dismissed", false)
        .order("created_at", { ascending: false })
        .order("priority", { ascending: false })
        .limit(60),
      context.supabase
        .from("ci_opportunities")
        .select("*")
        .eq("business_id", business.id)
        .eq("status", "open")
        .order("created_at", { ascending: false }),
      context.supabase
        .from("ci_scans")
        .select("*")
        .eq("business_id", business.id)
        .order("ran_at", { ascending: false })
        .limit(2),
      context.supabase.from("ci_alert_settings").select("*").eq("business_id", business.id).maybeSingle(),
    ]);

    const nameById = new Map(competitors.map((c) => [c.id, c.name]));
    const changes: CIChange[] = (changeRows ?? []).map((c: any) => ({
      id: c.id,
      competitorId: c.competitor_id,
      competitorName: c.competitor_id ? (nameById.get(c.competitor_id) ?? null) : null,
      kind: c.kind,
      severity: c.severity,
      priority: c.priority,
      title: c.title,
      detail: c.detail,
      metrics: (c.metrics ?? {}) as Record<string, unknown>,
      ai: (c.ai ?? null) as ChangeInterpretation | null,
      createdAt: c.created_at,
    }));

    const opportunities: CIOpportunity[] = (oppRows ?? []).map((o: any) => ({
      id: o.id,
      kind: o.kind,
      title: o.title,
      whatWeFound: o.what_we_found,
      whyItMatters: o.why_it_matters,
      whatToConsider: Array.isArray(o.what_to_consider) ? (o.what_to_consider as string[]) : [],
      confidence: o.confidence,
      status: o.status,
      createdAt: o.created_at,
    }));

    const latest: any = scans?.[0] ?? null;
    const previous: any = scans?.[1] ?? null;
    const current = latest?.competition_score ?? null;
    const prevScore = previous?.competition_score ?? latest?.summary?.previousCompetitionScore ?? null;

    return {
      business,
      competitors,
      changes,
      opportunities,
      landscape: {
        total: latest?.total_competitors ?? competitors.filter((c) => c.status !== "dismissed" && c.status !== "inactive").length,
        tracked: competitors.filter((c) => c.status === "tracked" || c.status === "user_added").length,
        newCompetitors: latest?.new_competitors ?? 0,
        closed: competitors.filter((c) => c.status === "inactive").length,
        competitionScore: current,
        previousCompetitionScore: prevScore,
        marketDensity: latest?.market_density ?? null,
        avgRating: latest?.avg_rating ?? null,
        avgReviews: latest?.avg_reviews ?? null,
        interpretation: landscapeInterpretation(current, prevScore),
        ranAt: latest?.ran_at ?? null,
        previousRanAt: previous?.ran_at ?? latest?.summary?.previousRanAt ?? null,
      },
      settings: settingsRow
        ? {
            newCompetitors: settingsRow.new_competitors,
            majorChanges: settingsRow.major_changes,
            closures: settingsRow.closures,
            opportunities: settingsRow.opportunities,
            marketChanges: settingsRow.market_changes,
            frequency: settingsRow.frequency as CIAlertSettings["frequency"],
            emailEnabled: settingsRow.email_enabled,
          }
        : DEFAULT_SETTINGS,
      dataUpdatedAt: latest?.ran_at ?? null,
    };
  });

export const setCompetitorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        competitorId: z.string().uuid(),
        status: z.enum(["identified", "tracked", "dismissed", "user_added", "inactive"]),
        reason: z.string().max(300).nullable().default(null),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ci_competitors")
      .update({ status: data.status, dismissed_reason: data.status === "dismissed" ? data.reason : null })
      .eq("id", data.competitorId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("ci_decisions").insert({
      user_id: context.userId,
      business_id: row.business_id,
      competitor_place_id: row.place_id,
      competitor_name: row.name,
      decision: data.status,
      reason: data.reason,
      distance_m: row.distance_m,
    });
    return { ok: true };
  });

export const addCompetitorByPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ businessId: z.string().uuid(), placeId: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: bRow, error: bErr } = await context.supabase
      .from("ci_businesses")
      .select("*")
      .eq("id", data.businessId)
      .single();
    if (bErr) throw new Error(bErr.message);
    const b = toBusiness(bRow);

    const o = await fetchPlace(data.placeId);
    if (!o) throw new Error("Found-r could not retrieve that business from Google Places.");
    const dist = o.lat !== null && o.lng !== null ? distanceMetres({ lat: b.lat, lng: b.lng }, { lat: o.lat, lng: o.lng }) : null;
    const score = competitorScore(o, dist, b.radiusMiles);

    const { data: row, error } = await context.supabase
      .from("ci_competitors")
      .upsert(
        {
          business_id: b.id,
          user_id: context.userId,
          place_id: o.placeId,
          name: o.name,
          address: o.address,
          lat: o.lat,
          lng: o.lng,
          distance_m: dist,
          category: o.category,
          status: "user_added",
          source: "user",
          relevance: Math.max(relevanceScore(o, dist, b.radiusMiles), 80),
          competitor_score: score,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "business_id,place_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("ci_snapshots").insert({
      competitor_id: row.id,
      user_id: context.userId,
      rating: o.rating,
      reviews: o.reviews,
      business_status: o.businessStatus,
      category: o.category,
      website: o.website,
      price_level: o.priceLevel,
      competitor_score: score,
      opening_hours: o.openingHours,
    });

    await context.supabase.from("ci_decisions").insert({
      user_id: context.userId,
      business_id: b.id,
      competitor_place_id: o.placeId,
      competitor_name: o.name,
      decision: "user_added",
      distance_m: dist,
    });

    return { ok: true, competitorId: row.id };
  });

export const getCompetitorHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ competitorId: z.string().uuid(), days: z.number().int().min(1).max(3650).nullable().default(null) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ snapshots: CISnapshotPoint[]; changes: CIChange[] }> => {
    const since = data.days ? new Date(Date.now() - data.days * 86400000).toISOString() : null;
    let snapQuery = context.supabase
      .from("ci_snapshots")
      .select("captured_at, rating, reviews, business_status, competitor_score")
      .eq("competitor_id", data.competitorId)
      .order("captured_at", { ascending: true });
    if (since) snapQuery = snapQuery.gte("captured_at", since);

    let changeQuery = context.supabase
      .from("ci_changes")
      .select("*")
      .eq("competitor_id", data.competitorId)
      .order("created_at", { ascending: false });
    if (since) changeQuery = changeQuery.gte("created_at", since);

    const [{ data: snaps, error: snapErr }, { data: rows, error: chErr }] = await Promise.all([snapQuery, changeQuery]);
    if (snapErr) throw new Error(snapErr.message);
    if (chErr) throw new Error(chErr.message);

    return {
      snapshots: (snaps ?? []).map((s: any) => ({
        capturedAt: s.captured_at,
        rating: s.rating === null ? null : Number(s.rating),
        reviews: s.reviews,
        businessStatus: s.business_status,
        competitorScore: s.competitor_score,
      })),
      changes: (rows ?? []).map((c: any) => ({
        id: c.id,
        competitorId: c.competitor_id,
        competitorName: null,
        kind: c.kind,
        severity: c.severity,
        priority: c.priority,
        title: c.title,
        detail: c.detail,
        metrics: (c.metrics ?? {}) as Record<string, unknown>,
        ai: (c.ai ?? null) as ChangeInterpretation | null,
        createdAt: c.created_at,
      })),
    };
  });

/** "What should I do?" — cached on the change row so it is generated once. */
export const explainChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ changeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<ChangeInterpretation> => {
    const { data: change, error } = await context.supabase
      .from("ci_changes")
      .select("*")
      .eq("id", data.changeId)
      .single();
    if (error) throw new Error(error.message);
    if (change.ai) return change.ai as unknown as ChangeInterpretation;

    const { data: business } = await context.supabase
      .from("ci_businesses")
      .select("name, business_type")
      .eq("id", change.business_id)
      .single();

    let competitor: { name: string; status: string; distance_m: number | null } | null = null;
    if (change.competitor_id) {
      const { data: c } = await context.supabase
        .from("ci_competitors")
        .select("name, status, distance_m")
        .eq("id", change.competitor_id)
        .single();
      competitor = c ?? null;
    }

    const ai = await interpretChange({
      businessName: business?.name ?? "your business",
      businessType: business?.business_type ?? "business",
      competitorName: competitor?.name ?? null,
      competitorStatus: competitor?.status ?? null,
      distanceLabel: metresToMiles(competitor?.distance_m ?? null),
      kind: change.kind,
      severity: change.severity,
      title: change.title,
      detail: change.detail,
      metrics: (change.metrics ?? {}) as Record<string, unknown>,
    });

    await context.supabase.from("ci_changes").update({ ai: ai as never, read_at: new Date().toISOString() }).eq("id", change.id);
    return ai;
  });

export const saveAlertSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        businessId: z.string().uuid(),
        newCompetitors: z.boolean(),
        majorChanges: z.boolean(),
        closures: z.boolean(),
        opportunities: z.boolean(),
        marketChanges: z.boolean(),
        frequency: z.enum(["immediate", "daily", "weekly", "off"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ci_alert_settings").upsert(
      {
        user_id: context.userId,
        business_id: data.businessId,
        new_competitors: data.newCompetitors,
        major_changes: data.majorChanges,
        closures: data.closures,
        opportunities: data.opportunities,
        market_changes: data.marketChanges,
        frequency: data.frequency,
      },
      { onConflict: "user_id,business_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Compact figures for the main dashboard card. */
export const getCISummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: businesses } = await context.supabase
      .from("ci_businesses")
      .select("id, name")
      .order("created_at", { ascending: true });
    const primary = businesses?.[0];
    if (!primary) return null;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [{ count: tracked }, { count: recentChanges }, { count: opportunities }, { data: scan }] = await Promise.all([
      context.supabase
        .from("ci_competitors")
        .select("id", { count: "exact", head: true })
        .eq("business_id", primary.id)
        .in("status", ["tracked", "user_added"]),
      context.supabase
        .from("ci_changes")
        .select("id", { count: "exact", head: true })
        .eq("business_id", primary.id)
        .eq("dismissed", false)
        .gte("created_at", weekAgo),
      context.supabase
        .from("ci_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("business_id", primary.id)
        .eq("status", "open"),
      context.supabase
        .from("ci_scans")
        .select("competition_score, ran_at, total_competitors")
        .eq("business_id", primary.id)
        .order("ran_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      businessId: primary.id,
      businessName: primary.name,
      tracked: tracked ?? 0,
      changesThisWeek: recentChanges ?? 0,
      opportunities: opportunities ?? 0,
      competitionScore: scan?.competition_score ?? null,
      totalCompetitors: scan?.total_competitors ?? 0,
      dataUpdatedAt: scan?.ran_at ?? null,
    };
  });
