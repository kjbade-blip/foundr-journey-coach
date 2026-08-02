import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BusinessClaim, ClaimAttempt } from "./claims";

/**
 * Creates (or resolves) the ownership claim record for the signed-in user.
 * Must succeed before any verification method is offered.
 */
export const startBusinessClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; businessName?: string | null }) => d)
  .handler(
    async ({
      data,
      context,
    }): Promise<
      | { ok: true; claim: BusinessClaim }
      | { ok: false; alreadyClaimed: boolean; error: string | null }
    > => {
      const server = await import("./claims.server");
      server.logClaim("start", { userId: context.userId, businessId: data.businessId });

      const result = await server.ensureClaim(
        data.businessId,
        data.businessName ?? null,
        context.userId,
      );
      if (!result.ok) {
        return { ok: false, alreadyClaimed: result.alreadyClaimed, error: result.error };
      }
      return { ok: true, claim: server.toClaim(result.claim) };
    },
  );

/** Current claim + full (append-only) verification attempt history. */
export const getBusinessClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => d)
  .handler(
    async ({
      data,
      context,
    }): Promise<{ claim: BusinessClaim | null; attempts: ClaimAttempt[]; claimedByOther: boolean }> => {
      const server = await import("./claims.server");
      const row = await server.findClaim(data.businessId, context.userId);
      if (!row) {
        const owner = await server.findVerifiedOwner(data.businessId);
        return { claim: null, attempts: [], claimedByOther: Boolean(owner && owner.user_id !== context.userId) };
      }

      const { data: attempts } = await context.supabase
        .from("business_claim_verifications")
        .select("id,verification_type,verification_status,created_at")
        .eq("claim_id", row.id)
        .order("created_at", { ascending: false });

      return {
        claim: server.toClaim(row),
        attempts: (attempts ?? []).map((a) => ({
          id: a.id,
          verificationType: a.verification_type,
          verificationStatus: a.verification_status as ClaimAttempt["verificationStatus"],
          createdAt: a.created_at,
        })),
        claimedByOther: false,
      };
    },
  );

/**
 * Manual ownership review. Also used when the business already has a
 * verified owner and the user disputes it — never grants ownership itself.
 */
export const requestManualReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; businessName?: string | null; message: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean; error: string | null }> => {
    const server = await import("./claims.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let claimId: string | null = null;
    const existing = await server.findClaim(data.businessId, context.userId);
    if (existing) {
      claimId = existing.id;
      if (existing.status !== "verified") {
        const { error } = await supabaseAdmin
          .from("business_claims")
          .update({ status: "review_requested", verification_method: "manual", verification_status: "pending" })
          .eq("id", existing.id);
        server.logClaim("manual_review_update", { claimId, error: error?.message ?? null });
      }
    } else {
      const created = await server.createClaim(data.businessId, data.businessName ?? null, context.userId);
      if (!created.claim) return { ok: false, error: created.error };
      claimId = created.claim.id;
      await supabaseAdmin
        .from("business_claims")
        .update({ status: "review_requested", verification_method: "manual" })
        .eq("id", claimId);
    }

    await server.recordAttempt(claimId, "manual", "pending", {
      message: data.message.slice(0, 2000),
      requestedBy: context.userId,
    });
    server.logClaim("manual_review_requested", { userId: context.userId, businessId: data.businessId, claimId });
    return { ok: true, error: null };
  });
