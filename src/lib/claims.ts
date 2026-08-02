/** Shared, client-safe types for the business ownership claim workflow. */

export type ClaimStatus = "pending" | "verified" | "rejected" | "review_requested";
export type ClaimVerificationStatus = "pending" | "success" | "failed";

/**
 * Verification types are plain strings in the database so new methods
 * (Companies House director, domain ownership, Stripe, government ID, …)
 * can be added later without a schema change.
 */
export type VerificationType =
  | "google_business"
  | "email"
  | "phone"
  | "manual"
  | (string & {});

export type BusinessClaim = {
  id: string;
  businessId: string;
  businessName: string | null;
  userId: string;
  status: ClaimStatus;
  verificationMethod: VerificationType | null;
  verificationStatus: ClaimVerificationStatus;
  verifiedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
};

export type ClaimAttempt = {
  id: string;
  verificationType: VerificationType;
  verificationStatus: ClaimVerificationStatus;
  createdAt: string;
};

export const ALREADY_CLAIMED_MESSAGE =
  "This business has already been claimed. If you believe you are the rightful owner, you can submit a review request.";

export const CLAIM_METHOD_LABEL: Record<string, string> = {
  google_business: "Google Business Profile",
  email: "Business email",
  phone: "Business telephone",
  manual: "Manual review",
};
