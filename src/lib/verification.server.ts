// Server-only verification engine: contact discovery, one-time codes,
// rate limiting, audit logging and pluggable delivery channels.
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import type { VerificationMethod, VerificationTarget } from "./verification";
import { maskEmail, maskPhone } from "./verification";

export const CODE_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
/** Codes a user may request per business per hour. */
export const MAX_CODES_PER_HOUR = 5;
/** Total verification actions per user per hour (brute-force guard). */
export const MAX_ACTIONS_PER_HOUR = 30;

export function requestMeta() {
  const req = getRequest();
  const h = req?.headers;
  const ip =
    h?.get("cf-connecting-ip") ??
    h?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  return { ip, userAgent: h?.get("user-agent") ?? null };
}

function salt() {
  return process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? "foundr-verification";
}

export function hashValue(value: string) {
  return createHash("sha256").update(`${salt()}:${value.toLowerCase().trim()}`).digest("hex");
}

export function generateCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JUNK = /(sentry|example|wixpress|godaddy|squarespace|\.png|\.jpg|\.webp)/i;

/** Scrape publicly listed email addresses from the business website. */
export async function discoverEmails(website: string | null, known: string | null) {
  const found = new Map<string, string>();
  if (known && EMAIL_RE.test(known)) found.set(known.toLowerCase(), "Business profile");
  EMAIL_RE.lastIndex = 0;

  const host = domainOf(website);
  if (website && host) {
    const pages = [website, `${website.replace(/\/$/, "")}/contact`];
    for (const page of pages) {
      try {
        const res = await fetch(page, {
          headers: { "user-agent": "Mozilla/5.0 (compatible; Found-r/1.0)" },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) continue;
        const html = (await res.text()).slice(0, 400_000);
        for (const raw of html.match(EMAIL_RE) ?? []) {
          const email = raw.toLowerCase();
          if (JUNK.test(email)) continue;
          const d = email.split("@")[1] ?? "";
          if (!d.includes(host) && !host.includes(d)) continue;
          if (!found.has(email)) found.set(email, "Website");
        }
      } catch {
        /* unreachable site — ignore */
      }
      if (found.size >= 4) break;
    }
  }

  return [...found.entries()].slice(0, 4).map(([email, source]) => ({ email, source }));
}

export function toEmailTargets(list: Array<{ email: string; source: string }>): VerificationTarget[] {
  return list.map((e) => ({
    id: hashValue(e.email).slice(0, 24),
    masked: maskEmail(e.email),
    source: e.source,
  }));
}

export function phoneTarget(phone: string | null): VerificationTarget[] {
  if (!phone) return [];
  return [{ id: hashValue(phone).slice(0, 24), masked: maskPhone(phone), source: "Google listing" }];
}

/** Resolve an opaque target id back to the real destination. */
export function resolveTarget(id: string, candidates: string[]): string | null {
  return candidates.find((c) => hashValue(c).slice(0, 24) === id) ?? null;
}

// ---------- delivery channels (pluggable) ----------

export type DeliveryResult = { ok: boolean; reason?: string };

export async function sendEmailCode(to: string, code: string, business: string): Promise<DeliveryResult> {
  const from = process.env['FOUNDR_EMAIL_FROM'];
  const key = process.env['LOVABLE_API_KEY'];
  if (!from || !key) {
    return { ok: false, reason: "Email delivery isn't configured for this workspace yet." };
  }
  try {
    const res = await fetch("https://api.lovable.dev/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from,
        to,
        subject: `Your Found-r verification code: ${code}`,
        html: `<p>Your Found-r verification code for <strong>${business}</strong> is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>It expires in ${CODE_TTL_MINUTES} minutes. If you didn't request this, ignore this email.</p>`,
      }),
    });
    if (!res.ok) return { ok: false, reason: "The email provider rejected the message." };
    return { ok: true };
  } catch {
    return { ok: false, reason: "The email provider could not be reached." };
  }
}

export async function sendSmsCode(to: string, code: string): Promise<DeliveryResult> {
  const lk = process.env['LOVABLE_API_KEY'];
  const gk = process.env['GATEWAYAPI_API_KEY'];
  if (!lk || !gk) return { ok: false, reason: "SMS delivery isn't configured for this workspace yet." };
  const recipient = Number(to.replace(/[^\d]/g, ""));
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/gatewayapi/mobile/single", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lk}`,
        "X-Connection-Api-Key": gk,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: "Found-r",
        recipient,
        message: `Found-r verification code: ${code} (expires in ${CODE_TTL_MINUTES} minutes).`,
      }),
    });
    if (!res.ok) {
      console.error(`SMS send failed [${res.status}]: ${await res.text()}`);
      return { ok: false, reason: "The SMS provider rejected the message." };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "The SMS provider could not be reached." };
  }
}

export function emailChannelReady() {
  return Boolean(process.env['FOUNDR_EMAIL_FROM'] && process.env['LOVABLE_API_KEY']);
}

export function smsChannelReady() {
  return Boolean(process.env['GATEWAYAPI_API_KEY'] && process.env['LOVABLE_API_KEY']);
}

export function buildMethods(opts: {
  emails: VerificationTarget[];
  phones: VerificationTarget[];
  googleAvailable: boolean;
  websiteDomain: string | null;
}): VerificationMethod[] {
  return [
    {
      id: "google",
      title: "Verify with Google Business Profile",
      description:
        "Verify instantly by signing in with the Google account that manages this Google Business Profile.",
      recommended: true,
      available: opts.googleAvailable,
      ...(opts.googleAvailable ? {} : { reason: "No Google Business Profile match is available for this listing." }),
      targets: [],
    },
    {
      id: "email",
      title: "Verify using business email",
      description: opts.websiteDomain
        ? `We'll send a one-time code to a published ${opts.websiteDomain} address.`
        : "We'll send a one-time code to a publicly listed business address.",
      recommended: false,
      available: opts.emails.length > 0 && emailChannelReady(),
      ...(opts.emails.length === 0
        ? { reason: "No publicly listed business email address was found." }
        : emailChannelReady()
          ? {}
          : { reason: "Email delivery isn't configured for this workspace yet." }),
      targets: opts.emails,
    },
    {
      id: "phone",
      title: "Verify using business telephone",
      description: "We'll text a one-time code to the number listed on your Google profile.",
      recommended: false,
      available: opts.phones.length > 0 && smsChannelReady(),
      ...(opts.phones.length === 0
        ? { reason: "No publicly listed business telephone number was found." }
        : smsChannelReady()
          ? {}
          : { reason: "SMS delivery isn't configured for this workspace yet." }),
      targets: opts.phones,
    },
  ];
}
