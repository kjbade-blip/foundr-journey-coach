// Multi-business support: a user can keep several businesses on their profile
// (billed as an add-on) and choose which ones the Grow screens report on.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ActiveBusiness } from "./onboarding/types";

type Row = Record<string, unknown>;

function toBusiness(b: Row): ActiveBusiness {
  return {
    id: b["id"] as string,
    name: b["name"] as string,
    companyNumber: (b["company_number"] as string | null) ?? null,
    address: (b["address"] as string | null) ?? null,
    postcode: (b["postcode"] as string | null) ?? null,
    status: (b["status"] as string | null) ?? null,
    industry: (b["industry"] as string | null) ?? null,
    website: (b["website"] as string | null) ?? null,
    placeId: (b["place_id"] as string | null) ?? null,
    latitude: (b["latitude"] as number | null) ?? null,
    longitude: (b["longitude"] as number | null) ?? null,
    source: (b["source"] as string) ?? "manual",
  };
}

const addInput = z.object({
  name: z.string().trim().min(1).max(200),
  companyNumber: z.string().trim().max(20).nullish(),
  address: z.string().trim().max(300).nullish(),
  postcode: z.string().trim().max(16).nullish(),
  status: z.string().trim().max(80).nullish(),
  industry: z.string().trim().max(120).nullish(),
  website: z.string().trim().max(300).nullish(),
  placeId: z.string().trim().max(300).nullish(),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  source: z.enum(["companies_house", "places", "manual"]).default("manual"),
  makeActive: z.boolean().optional(),
});

/**
 * Adds any businesses with a verified ownership claim to the user's
 * user_businesses list (idempotent per place_id). Keeps the Grow "My
 * businesses" selector in sync with what the user has claimed.
 */
async function backfillVerifiedClaims(userId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fetchPlaceDetails } = await import("./business-discovery.server");

    const { data: claims } = await supabaseAdmin
      .from("business_claims")
      .select("business_id,business_name")
      .eq("user_id", userId)
      .eq("status", "verified");
    if (!claims?.length) return;

    const placeIds = claims.map((c) => c.business_id as string);
    const { data: existing } = await supabaseAdmin
      .from("user_businesses")
      .select("place_id")
      .eq("user_id", userId)
      .in("place_id", placeIds);
    const have = new Set((existing ?? []).map((r) => r.place_id as string));

    for (const claim of claims) {
      const placeId = claim.business_id as string;
      if (have.has(placeId)) continue;
      const place = await fetchPlaceDetails(placeId).catch(() => null);
      await supabaseAdmin.from("user_businesses").insert({
        user_id: userId,
        name: place?.name ?? (claim.business_name as string | null) ?? "My business",
        address: place?.address ?? null,
        industry: place?.category ?? null,
        website: place?.website ?? null,
        place_id: placeId,
        latitude: place?.lat ?? null,
        longitude: place?.lng ?? null,
        source: "places",
      });
    }
  } catch {
    // Backfill is best-effort; never block the listing.
  }
}

export interface MyBusinessesResult {
  businesses: ActiveBusiness[];
  activeBusinessId: string | null;
}

export const listMyBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyBusinessesResult> => {
    // Backfill: a business the user has claimed & verified belongs in their
    // profile list even if it was never added through the "add" flow.
    await backfillVerifiedClaims(context.userId);

    const { data, error } = await context.supabase
      .from("user_businesses")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("active_business_id")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      businesses: ((data ?? []) as Row[]).map(toBusiness),
      activeBusinessId: ((profile as Row | null)?.["active_business_id"] as string | null) ?? null,
    };
  });

export const addMyBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => addInput.parse(d))
  .handler(async ({ data, context }): Promise<ActiveBusiness> => {
    const { data: row, error } = await context.supabase
      .from("user_businesses")
      .insert({
        user_id: context.userId,
        name: data.name,
        company_number: data.companyNumber ?? null,
        address: data.address ?? null,
        postcode: data.postcode ?? null,
        status: data.status ?? null,
        industry: data.industry ?? null,
        website: data.website ?? null,
        place_id: data.placeId ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        source: data.source,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (data.makeActive) {
      await context.supabase
        .from("profiles")
        .update({ active_business_id: (row as Row)["id"] as string })
        .eq("id", context.userId);
    }
    return toBusiness(row as Row);
  });

export const removeMyBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    // Clear the active pointer first so the delete is never blocked by it.
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("active_business_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (((profile as Row | null)?.["active_business_id"] as string | null) === data.id) {
      await context.supabase.from("profiles").update({ active_business_id: null }).eq("id", context.userId);
    }

    const { error } = await context.supabase
      .from("user_businesses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const makeBusinessActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ active_business_id: data.id })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
