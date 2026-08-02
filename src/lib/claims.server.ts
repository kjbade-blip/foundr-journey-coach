/**
 * Server-only helpers for the business ownership claim workflow.
 * The database is the single source of truth: every claim is written here
 * before any verification is attempted, and every verification attempt is
 * appended (never overwritten) to business_claim_verifications.
 */
import type { BusinessClaim, ClaimVerificationStatus, VerificationType } from "./claims";

type AdminClient = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<AdminClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type ClaimRow = {
  id: string;
  business_id: string;
  business_name: string | null;
  user_id: string;
  status: string;
  verification_method: string | null;
  verification_status: string;
  verified_at: string | null;
  rejected_reason: string | null;
  created_at: string;
};

export function toClaim(row: ClaimRow): BusinessClaim {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    userId: row.user_id,
    status: row.status as BusinessClaim["status"],
    verificationMethod: row.verification_method,
    verificationStatus: row.verification_status as ClaimVerificationStatus,
    verifiedAt: row.verified_at,
    rejectedReason: row.rejected_reason,
    createdAt: row.created_at,
  };
}

/** Structured server log so every important action is traceable. */
export function logClaim(
  event: string,
  detail: Record<string, unknown>,
): void {
  // eslint-disable-next-line no-console
  console.log(`[claim] ${event}`, JSON.stringify(detail));
}

/** Existing verified owner for a business, if any. */
export async function findVerifiedOwner(businessId: string): Promise<ClaimRow | null> {
  const db = await admin();
  const { data, error } = await db
    .from("business_claims")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "verified")
    .maybeSingle();
  if (error) logClaim("verified_owner_lookup_error", { businessId, error: error.message });
  return (data as ClaimRow | null) ?? null;
}

export async function findClaim(businessId: string, userId: string): Promise<ClaimRow | null> {
  const db = await admin();
  const { data } = await db
    .from("business_claims")
    .select("*")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as ClaimRow | null) ?? null;
}

/** Creates the pending claim row (idempotent per business + user). */
export async function createClaim(
  businessId: string,
  businessName: string | null,
  userId: string,
): Promise<{ claim: ClaimRow | null; error: string | null }> {
  const db = await admin();
  const { data, error } = await db
    .from("business_claims")
    .insert({
      business_id: businessId,
      business_name: businessName,
      user_id: userId,
      status: "pending",
      verification_status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    logClaim("insert_failed", { businessId, userId, error: error.message, code: error.code });
    return { claim: null, error: error.message };
  }
  logClaim("insert_ok", { businessId, userId, claimId: (data as ClaimRow).id });
  return { claim: data as ClaimRow, error: null };
}

/** Appends a verification attempt. History is append-only. */
export async function recordAttempt(
  claimId: string,
  verificationType: VerificationType,
  verificationStatus: ClaimVerificationStatus,
  verificationData: Record<string, unknown> = {},
): Promise<void> {
  const db = await admin();
  const { error } = await db.from("business_claim_verifications").insert({
    claim_id: claimId,
    verification_type: verificationType,
    verification_status: verificationStatus,
    verification_data: verificationData as never,
  });
  logClaim("attempt_recorded", { claimId, verificationType, verificationStatus, error: error?.message ?? null });
}

/** Marks a claim verified after a verification method has succeeded. */
export async function markClaimVerified(
  claimId: string,
  method: VerificationType,
): Promise<{ ok: boolean; error: string | null; verifiedAt: string }> {
  const db = await admin();
  const verifiedAt = new Date().toISOString();
  const { error } = await db
    .from("business_claims")
    .update({
      status: "verified",
      verification_status: "success",
      verification_method: method,
      verified_at: verifiedAt,
      rejected_reason: null,
    })
    .eq("id", claimId);
  logClaim("update_verified", { claimId, method, error: error?.message ?? null });
  return { ok: !error, error: error?.message ?? null, verifiedAt };
}

/**
 * Resolves the claim for the current user, creating it when missing.
 * Blocks when another user already holds a verified claim.
 */
export async function ensureClaim(
  businessId: string,
  businessName: string | null,
  userId: string,
): Promise<
  | { ok: true; claim: ClaimRow }
  | { ok: false; alreadyClaimed: true; error: null }
  | { ok: false; alreadyClaimed: false; error: string }
> {
  const existing = await findClaim(businessId, userId);
  if (existing) {
    logClaim("existing_claim", { businessId, userId, claimId: existing.id, status: existing.status });
    return { ok: true, claim: existing };
  }

  const owner = await findVerifiedOwner(businessId);
  if (owner && owner.user_id !== userId) {
    logClaim("blocked_already_claimed", { businessId, userId, ownerClaimId: owner.id });
    return { ok: false, alreadyClaimed: true, error: null };
  }

  const { claim, error } = await createClaim(businessId, businessName, userId);
  if (!claim) return { ok: false, alreadyClaimed: false, error: error ?? "Could not create the claim." };
  return { ok: true, claim };
}
