// Shared, client-safe types + helpers for Business Ownership Verification.

export type VerificationMethodId = "google" | "email" | "phone";

export type VerificationTarget = {
  /** Opaque id — the raw destination never reaches the browser. */
  id: string;
  /** Masked for display, e.g. j***@company.co.uk or +44 ******4821 */
  masked: string;
  source: string;
};

export type VerificationMethod = {
  id: VerificationMethodId;
  title: string;
  description: string;
  recommended: boolean;
  available: boolean;
  /** Why it can't be used (only set when available === false). */
  reason?: string;
  targets: VerificationTarget[];
};

export type VerificationRecord = {
  placeId: string;
  businessName: string;
  method: VerificationMethodId;
  confidence: number;
  verifiedAt: string;
  maskedTarget: string | null;
};

export const METHOD_LABEL: Record<VerificationMethodId, string> = {
  google: "Google Business Profile",
  email: "Business email",
  phone: "Business telephone",
};

/** j***@company.co.uk */
export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  const head = user.slice(0, 1) || "*";
  return `${head}${"*".repeat(Math.max(3, Math.min(user.length - 1, 6)))}@${domain}`;
}

/** +44 ******4821 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const tail = digits.slice(-4);
  const prefix = digits.startsWith("+") ? digits.slice(0, 3) : "";
  return `${prefix} ${"*".repeat(6)}${tail}`.trim();
}

const KEY = "foundr.verification";

export function saveLocalVerification(v: VerificationRecord) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(v));
  window.dispatchEvent(new Event("foundr:verification"));
}

export function loadLocalVerification(): VerificationRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VerificationRecord) : null;
  } catch {
    return null;
  }
}

export function isVerifiedFor(placeId: string | undefined): boolean {
  const v = loadLocalVerification();
  return !!v && !!placeId && v.placeId === placeId;
}
