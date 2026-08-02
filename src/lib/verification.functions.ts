import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { VerificationMethod, VerificationRecord } from "./verification";
import { DEMO_CODE, DEMO_OWNER_EMAIL, DEMO_PHONE, isDemoPlace } from "./demo-business";

type Ctx = { placeId: string; businessName?: string; website?: string | null; phone?: string | null; email?: string | null };

export const getVerificationState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { placeId: string }) => d)
  .handler(async ({ data, context }): Promise<VerificationRecord | null> => {
    const { data: row } = await context.supabase
      .from("business_verifications")
      .select("place_id,business_name,method,confidence,verified_at,verified_target")
      .eq("user_id", context.userId)
      .eq("place_id", data.placeId)
      .maybeSingle();
    if (!row) return null;
    return {
      placeId: row.place_id,
      businessName: row.business_name,
      method: row.method as VerificationRecord["method"],
      confidence: row.confidence,
      verifiedAt: row.verified_at,
      maskedTarget: row.verified_target,
    };
  });

export const getVerificationMethods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Ctx) => d)
  .handler(async ({ data }): Promise<VerificationMethod[]> => {
    const { discoverEmails, toEmailTargets, phoneTarget, buildMethods, domainOf } =
      await import("./verification.server");

    // Demo listing: expose both code channels with a fixed test code.
    if (isDemoPlace(data.placeId)) {
      const methods = buildMethods({
        emails: toEmailTargets([{ email: DEMO_OWNER_EMAIL, source: "Business profile" }]),
        phones: phoneTarget(DEMO_PHONE),
        googleAvailable: true,
        websiteDomain: null,
      });
      return methods.map((m) =>
        m.id === "google"
          ? m
          : { ...m, available: m.targets.length > 0, reason: undefined, description: `${m.description} (demo listing — code is ${DEMO_CODE})` },
      );
    }

    const emails = await discoverEmails(data.website ?? null, data.email ?? null);
    return buildMethods({
      emails: toEmailTargets(emails),
      phones: phoneTarget(data.phone ?? null),
      googleAvailable: true,
      websiteDomain: domainOf(data.website ?? null),
    });
  });

export const verifyWithGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Ctx & { businessName: string }) => d)
  .handler(async ({ data, context }) => {
    const server = await import("./verification.server");
    const claims = await import("./claims.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ip, userAgent } = server.requestMeta();

    const { data: authData, error: authError } = await context.supabase.auth.getUser();
    if (authError || !authData.user) {
      return { ok: false as const, error: "Your sign-in session could not be confirmed. Sign in with Google again." };
    }

    const user = authData.user;
    const appMeta = user.app_metadata as { provider?: string; providers?: string[] };
    const email = user.email ?? "";
    const isGoogle =
      appMeta.provider === "google" ||
      (appMeta.providers ?? []).includes("google") ||
      (user.identities ?? []).some((identity) => identity.provider === "google");

    // The claim record must exist before any verification is attempted.
    const claimResult = await claims.ensureClaim(data.placeId, data.businessName, context.userId);
    if (!claimResult.ok) {
      const { ALREADY_CLAIMED_MESSAGE } = await import("./claims");
      return {
        ok: false as const,
        alreadyClaimed: claimResult.alreadyClaimed,
        error: claimResult.alreadyClaimed ? ALREADY_CLAIMED_MESSAGE : claimResult.error,
      };
    }
    const claimId = claimResult.claim.id;

    const log = async (success: boolean, detail: string) => {
      await claims.recordAttempt(claimId, "google_business", success ? "success" : "failed", { detail });
      claims.logClaim("google_verify", { userId: context.userId, businessId: data.placeId, claimId, success, detail });
      await supabaseAdmin.from("verification_audit_log").insert({
        user_id: context.userId,
        place_id: data.placeId,
        method: "google",
        event: "google_verify",
        success,
        detail,
        ip_address: ip,
        user_agent: userAgent,
      });
    };


    if (isDemoPlace(data.placeId)) {
      const canonicalGoogleEmail = (value: string) => {
        const normalized = value.trim().toLowerCase();
        const [localPart = "", domain = ""] = normalized.split("@");
        const canonicalDomain = domain === "googlemail.com" ? "gmail.com" : domain;
        return `${localPart}@${canonicalDomain}`;
      };

      if (canonicalGoogleEmail(email) !== canonicalGoogleEmail(DEMO_OWNER_EMAIL)) {
        await log(false, "demo_owner_mismatch");
        return { ok: false as const, error: `This demo business can only be claimed by ${DEMO_OWNER_EMAIL}.` };
      }
    } else if (!isGoogle) {
      await log(false, "not_google_account");
      return { ok: false as const, error: "Sign in with the Google account that manages this business, then try again." };
    }

    const businessDomain = isDemoPlace(data.placeId) ? emailDomainOverride(email) : server.domainOf(data.website ?? null);
    const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
    function emailDomainOverride(e: string) { return e.split("@")[1]?.toLowerCase() ?? null; }
    const matches = Boolean(businessDomain && emailDomain && (emailDomain === businessDomain || businessDomain.endsWith(`.${emailDomain}`)));

    if (!matches) {
      await log(false, "domain_mismatch");
      return {
        ok: false as const,
        error:
          "This Google account isn't linked to the business domain we found. Try business email or telephone verification instead.",
      };
    }

    const { error } = await supabaseAdmin.from("business_verifications").upsert(
      {
        user_id: context.userId,
        place_id: data.placeId,
        business_name: data.businessName,
        method: "google",
        confidence: 95,
        verified_target: server.maskGoogleEmail(email),
        verified_at: new Date().toISOString(),
        ip_address: ip,
      },
      { onConflict: "user_id,place_id" },
    );
    if (error) throw error;
    await log(true, "verified");
    const marked = await claims.markClaimVerified(claimId, "google_business");
    if (!marked.ok) {
      return { ok: false as const, error: "Verification succeeded but ownership could not be saved. Please try again." };
    }


    return {
      ok: true as const,
      record: {
        placeId: data.placeId,
        businessName: data.businessName,
        method: "google" as const,
        confidence: 95,
        verifiedAt: new Date().toISOString(),
        maskedTarget: server.maskGoogleEmail(email),
      },
    };
  });

export const requestVerificationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Ctx & { method: "email" | "phone"; targetId: string; businessName: string }) => d)
  .handler(async ({ data, context }) => {
    const server = await import("./verification.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ip, userAgent } = server.requestMeta();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const audit = (success: boolean, detail: string) =>
      supabaseAdmin.from("verification_audit_log").insert({
        user_id: context.userId,
        place_id: data.placeId,
        method: data.method,
        event: "request_code",
        success,
        detail,
        ip_address: ip,
        user_agent: userAgent,
      });

    const { count } = await supabaseAdmin
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("place_id", data.placeId)
      .gte("created_at", since);

    if ((count ?? 0) >= server.MAX_CODES_PER_HOUR) {
      await audit(false, "rate_limited");
      return { ok: false as const, error: "Too many codes requested. Please wait an hour and try again." };
    }

    // Re-derive the destination server-side; the browser only ever holds an opaque id.
    let destination: string | null = null;
    let masked = "";
    const demo = isDemoPlace(data.placeId);
    if (demo) {
      const targets =
        data.method === "email"
          ? server.toEmailTargets([{ email: DEMO_OWNER_EMAIL, source: "Business profile" }])
          : server.phoneTarget(DEMO_PHONE);
      const t = targets.find((x) => x.id === data.targetId);
      destination = t ? (data.method === "email" ? DEMO_OWNER_EMAIL : DEMO_PHONE) : null;
      masked = t?.masked ?? "";
    } else if (data.method === "email") {
      const emails = await server.discoverEmails(data.website ?? null, data.email ?? null);
      const match = server.toEmailTargets(emails).findIndex((t) => t.id === data.targetId);
      destination = match >= 0 ? (emails[match]?.email ?? null) : null;
      masked = match >= 0 ? (server.toEmailTargets(emails)[match]?.masked ?? "") : "";
    } else {
      const phones = server.phoneTarget(data.phone ?? null);
      const t = phones.find((p) => p.id === data.targetId);
      destination = t ? (data.phone ?? null) : null;
      masked = t?.masked ?? "";
    }

    if (!destination) {
      await audit(false, "unknown_target");
      return { ok: false as const, error: "That contact method is no longer available. Choose another." };
    }

    const code = demo ? DEMO_CODE : server.generateCode();
    const delivery = demo
      ? { ok: true as const }
      : data.method === "email"
        ? await server.sendEmailCode(destination, code, data.businessName)
        : await server.sendSmsCode(destination, code);

    if (!delivery.ok) {
      await audit(false, delivery.reason ?? "delivery_failed");
      return { ok: false as const, error: delivery.reason ?? "We couldn't send the code. Try another method." };
    }

    const { error } = await supabaseAdmin.from("verification_requests").insert({
      user_id: context.userId,
      place_id: data.placeId,
      method: data.method,
      target_hash: server.hashValue(destination),
      masked_target: masked,
      code_hash: server.hashValue(code),
      expires_at: new Date(Date.now() + server.CODE_TTL_MINUTES * 60 * 1000).toISOString(),
      ip_address: ip,
    });
    if (error) throw error;
    await audit(true, "code_sent");

    return { ok: true as const, masked, expiresInMinutes: server.CODE_TTL_MINUTES, demoCode: demo ? DEMO_CODE : null };
  });

export const confirmVerificationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { placeId: string; businessName: string; code: string }) => d)
  .handler(async ({ data, context }) => {
    const server = await import("./verification.server");
    const claims = await import("./claims.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ip, userAgent } = server.requestMeta();

    const claimResult = await claims.ensureClaim(data.placeId, data.businessName, context.userId);
    if (!claimResult.ok) {
      const { ALREADY_CLAIMED_MESSAGE } = await import("./claims");
      return {
        ok: false as const,
        alreadyClaimed: claimResult.alreadyClaimed,
        error: claimResult.alreadyClaimed ? ALREADY_CLAIMED_MESSAGE : claimResult.error,
      };
    }
    const claimId = claimResult.claim.id;

    const audit = async (success: boolean, detail: string, method?: string) => {
      await claims.recordAttempt(claimId, method === "phone" ? "phone" : "email", success ? "success" : "failed", { detail });
      claims.logClaim("confirm_code", { userId: context.userId, businessId: data.placeId, claimId, method, success, detail });
      await supabaseAdmin.from("verification_audit_log").insert({
        user_id: context.userId,
        place_id: data.placeId,
        method: method ?? null,
        event: "confirm_code",
        success,
        detail,
        ip_address: ip,
        user_agent: userAgent,
      });
    };


    const { data: reqRow } = await supabaseAdmin
      .from("verification_requests")
      .select("*")
      .eq("user_id", context.userId)
      .eq("place_id", data.placeId)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!reqRow) {
      await audit(false, "no_active_request");
      return { ok: false as const, error: "No active verification request. Request a new code." };
    }
    if (new Date(reqRow.expires_at).getTime() < Date.now()) {
      await audit(false, "expired", reqRow.method);
      return { ok: false as const, error: "That code has expired. Request a new one." };
    }
    if (reqRow.attempts >= reqRow.max_attempts) {
      await audit(false, "too_many_attempts", reqRow.method);
      return { ok: false as const, error: "Too many incorrect attempts. Request a new code." };
    }

    const clean = data.code.replace(/\D/g, "");
    if (!server.safeEqual(server.hashValue(clean), reqRow.code_hash)) {
      await supabaseAdmin
        .from("verification_requests")
        .update({ attempts: reqRow.attempts + 1 })
        .eq("id", reqRow.id);
      await audit(false, "incorrect_code", reqRow.method);
      const left = reqRow.max_attempts - reqRow.attempts - 1;
      return {
        ok: false as const,
        error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} remaining.` : "Incorrect code. Request a new one.",
      };
    }

    await supabaseAdmin
      .from("verification_requests")
      .update({ consumed_at: new Date().toISOString(), attempts: reqRow.attempts + 1 })
      .eq("id", reqRow.id);

    const verifiedAt = new Date().toISOString();
    const confidence = reqRow.method === "email" ? 90 : 85;
    const { error } = await supabaseAdmin.from("business_verifications").upsert(
      {
        user_id: context.userId,
        place_id: data.placeId,
        business_name: data.businessName,
        method: reqRow.method,
        confidence,
        verified_target: reqRow.masked_target,
        verified_at: verifiedAt,
        ip_address: ip,
      },
      { onConflict: "user_id,place_id" },
    );
    if (error) throw error;
    await audit(true, "verified", reqRow.method);
    const marked = await claims.markClaimVerified(claimId, reqRow.method === "phone" ? "phone" : "email");
    if (!marked.ok) {
      return { ok: false as const, error: "Verification succeeded but ownership could not be saved. Please try again." };
    }


    return {
      ok: true as const,
      record: {
        placeId: data.placeId,
        businessName: data.businessName,
        method: reqRow.method as "email" | "phone",
        confidence,
        verifiedAt,
        maskedTarget: reqRow.masked_target,
      },
    };
  });

/**
 * One-click reset of the synthetic demo listing: wipes verification state,
 * outstanding codes and audit entries for the demo place for the current user
 * so the claim flow can be tested repeatedly. Only ever touches DEMO_PLACE_ID.
 */
export const resetDemoBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, never>) => d)
  .handler(async ({ context }) => {
    const { DEMO_PLACE_ID } = await import("./demo-business");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (const table of ["business_verifications", "verification_requests", "verification_audit_log"] as const) {
      await supabaseAdmin.from(table).delete().eq("user_id", context.userId).eq("place_id", DEMO_PLACE_ID);
    }
    return { ok: true as const, placeId: DEMO_PLACE_ID };
  });
