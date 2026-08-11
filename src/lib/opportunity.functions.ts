import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OpportunityAnalysis, SavedOpportunitySummary } from "./opportunity/types";

const analyseInput = z.object({
  query: z.string().trim().min(1).max(160).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  label: z.string().trim().max(160).optional(),
  businessType: z.string().trim().min(1).max(80),
  businessName: z.string().trim().max(160).optional(),
  radiusMiles: z.number().min(0.25).max(10).optional(),
  forceRefresh: z.boolean().optional(),
  includeAlternatives: z.boolean().optional(),
  save: z.boolean().optional(),
});

/** The single analysis entry point. Every surface calls this. */
export const analyseOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => analyseInput.parse(d))
  .handler(async ({ data, context }): Promise<OpportunityAnalysis> => {
    const { buildOpportunityAnalysis } = await import("./opportunity/build.server");
    const analysis = await buildOpportunityAnalysis(data);

    if (data.save !== false && analysis.overallScore !== null) {
      const { data: row, error } = await context.supabase
        .from("location_analyses")
        .insert({
          user_id: context.userId,
          display_name: analysis.location.displayName,
          business_type: analysis.businessType.label,
          overall_score: analysis.overallScore,
          postcode: analysis.location.postcode,
          latitude: analysis.location.latitude,
          longitude: analysis.location.longitude,
          radius_miles: analysis.location.radiusMiles,
          confidence_score: analysis.confidence.score,
          confidence_reason: analysis.confidence.reason,
          verdict: analysis.verdict.key,
          verdict_reason: analysis.verdict.reason,
          score_breakdown: { categories: analysis.categories } as never,
          evidence: analysis.sources as never,
          analysis: analysis as never,
        })
        .select("id")
        .maybeSingle();
      if (error) console.error("[Opportunity] save failed:", error.message);
      else if (row) return { ...analysis, id: row.id };
    }

    return analysis;
  });

export const listOpportunityAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedOpportunitySummary[]> => {
    const { data, error } = await context.supabase
      .from("location_analyses")
      .select("id, display_name, business_type, overall_score, confidence_score, verdict, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      displayName: r.display_name,
      businessType: r.business_type,
      overallScore: r.overall_score,
      confidenceScore: r.confidence_score,
      verdict: r.verdict,
      createdAt: r.created_at,
    }));
  });

export const getOpportunityAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<OpportunityAnalysis | null> => {
    const { data: row, error } = await context.supabase
      .from("location_analyses")
      .select("id, analysis")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.analysis || Object.keys(row.analysis as object).length === 0) return null;
    return { ...(row.analysis as unknown as OpportunityAnalysis), id: row.id };
  });
