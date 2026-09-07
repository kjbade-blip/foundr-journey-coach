// Public business profile assembly.
//
// Every field is OBSERVED from a named public source:
//   - Google Places (Places API v1)
//   - The business's own public website homepage (single GET, no login/paywall bypass)
// Anything a source does not publish is recorded as unavailable — never estimated.

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function authHeaders() {
  const lk = process.env["LOVABLE_API_KEY"];
  const gk = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lk || !gk) throw new Error("Google Maps connector not configured");
  return { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk };
}

const FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "shortFormattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "priceRange",
  "businessStatus",
  "primaryTypeDisplayName",
  "primaryType",
  "types",
  "websiteUri",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "googleMapsUri",
  "editorialSummary",
  "regularOpeningHours.weekdayDescriptions",
  "regularOpeningHours.openNow",
  "accessibilityOptions",
  "paymentOptions",
  "parkingOptions",
  "delivery",
  "takeout",
  "dineIn",
  "reservable",
  "servesBreakfast",
  "servesLunch",
  "servesDinner",
  "servesVegetarianFood",
  "outdoorSeating",
  "goodForChildren",
  "allowsDogs",
  "reviews",
].join(",");

export type PublicReview = {
  author: string;
  rating: number | null;
  when: string;
  text: string;
};

export type SocialLink = { network: string; url: string };

export type BusinessProfile = {
  placeId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  types: string[];
  businessStatus: string | null;
  summary: string | null;
  rating: number | null;
  reviews: number | null;
  priceLevel: string | null;
  priceRange: string | null;
  phone: string | null;
  internationalPhone: string | null;
  website: string | null;
  mapsUri: string | null;
  openingHours: string[];
  openNow: boolean | null;
  attributes: string[];
  topReviews: PublicReview[];
  ratingBreakdown: { stars: number; count: number }[];
  reviewThemes: { theme: string; mentions: number }[];
  socials: SocialLink[];
  emails: string[];
  priceListLinks: { label: string; url: string }[];
  siteDescription: string | null;
  siteFetched: boolean;
  siteError: string | null;
  externalSearches: { label: string; url: string }[];
};

type RawPlace = Record<string, any>;

function boolAttr(p: RawPlace): string[] {
  const out: string[] = [];
  const flag = (k: string, label: string) => {
    if (p[k] === true) out.push(label);
  };
  flag("delivery", "Delivery");
  flag("takeout", "Takeaway");
  flag("dineIn", "Dine in");
  flag("reservable", "Takes bookings");
  flag("servesBreakfast", "Serves breakfast");
  flag("servesLunch", "Serves lunch");
  flag("servesDinner", "Serves dinner");
  flag("servesVegetarianFood", "Vegetarian options");
  flag("outdoorSeating", "Outdoor seating");
  flag("goodForChildren", "Good for children");
  flag("allowsDogs", "Dog friendly");
  const acc = p["accessibilityOptions"] ?? {};
  if (acc.wheelchairAccessibleEntrance) out.push("Step-free entrance");
  if (acc.wheelchairAccessibleParking) out.push("Accessible parking");
  if (acc.wheelchairAccessibleRestroom) out.push("Accessible toilet");
  if (acc.wheelchairAccessibleSeating) out.push("Accessible seating");
  const pay = p["paymentOptions"] ?? {};
  if (pay.acceptsCreditCards) out.push("Card payments");
  if (pay.acceptsCash) out.push("Cash accepted");
  if (pay.acceptsNfc) out.push("Contactless");
  const park = p["parkingOptions"] ?? {};
  if (park.freeParkingLot || park.freeStreetParking) out.push("Free parking");
  if (park.paidParkingLot || park.paidStreetParking) out.push("Paid parking");
  return out;
}

const THEMES: { theme: string; words: string[] }[] = [
  { theme: "Service", words: ["service", "staff", "friendly", "welcoming", "rude"] },
  { theme: "Quality", words: ["quality", "delicious", "tasty", "excellent", "great"] },
  { theme: "Value", words: ["price", "value", "expensive", "cheap", "affordable"] },
  { theme: "Speed", words: ["quick", "fast", "wait", "slow", "queue"] },
  { theme: "Atmosphere", words: ["atmosphere", "cosy", "clean", "decor", "vibe"] },
  { theme: "Booking", words: ["booking", "appointment", "reservation"] },
];

function summariseReviews(reviews: PublicReview[]) {
  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => Math.round(r.rating ?? 0) === stars).length,
  }));
  const themes = THEMES.map((t) => ({
    theme: t.theme,
    mentions: reviews.filter((r) => t.words.some((w) => r.text.toLowerCase().includes(w))).length,
  }))
    .filter((t) => t.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions);
  return { breakdown, themes };
}

const SOCIAL_HOSTS: { network: string; match: RegExp }[] = [
  { network: "Facebook", match: /(?:^|\.)facebook\.com$/i },
  { network: "Instagram", match: /(?:^|\.)instagram\.com$/i },
  { network: "X (Twitter)", match: /(?:^|\.)(?:twitter|x)\.com$/i },
  { network: "LinkedIn", match: /(?:^|\.)linkedin\.com$/i },
  { network: "TikTok", match: /(?:^|\.)tiktok\.com$/i },
  { network: "YouTube", match: /(?:^|\.)(?:youtube\.com|youtu\.be)$/i },
  { network: "Pinterest", match: /(?:^|\.)pinterest\.(?:com|co\.uk)$/i },
  { network: "TripAdvisor", match: /(?:^|\.)tripadvisor\.(?:com|co\.uk)$/i },
  { network: "Yelp", match: /(?:^|\.)yelp\.(?:com|co\.uk)$/i },
  { network: "WhatsApp", match: /(?:^|\.)(?:wa\.me|whatsapp\.com)$/i },
];

const PRICE_WORDS = /(menu|price|pricing|prices|tariff|rates|treatments|services|shop|book)/i;

async function readWebsite(website: string) {
  const socials: SocialLink[] = [];
  const emails = new Set<string>();
  const priceListLinks: { label: string; url: string }[] = [];
  let siteDescription: string | null = null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(website, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Found-r/1.0 (+https://found-r.lovable.app)", Accept: "text/html" },
    });
    if (!res.ok) return { socials, emails: [], priceListLinks, siteDescription, ok: false, error: `Website responded ${res.status}` };
    const html = (await res.text()).slice(0, 400_000);

    const meta = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,400})["']/i);
    if (meta) siteDescription = meta[1].trim();

    for (const m of html.matchAll(/mailto:([^"'>\s?]+@[^"'>\s?]+)/gi)) emails.add(m[1].toLowerCase());

    const seen = new Set<string>();
    for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
      const raw = m[1];
      const label = m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      let url: URL;
      try {
        url = new URL(raw, website);
      } catch {
        continue;
      }
      if (!/^https?:$/.test(url.protocol)) continue;
      const host = url.hostname.replace(/^www\./, "");
      const social = SOCIAL_HOSTS.find((s) => s.match.test(host));
      if (social && !seen.has(social.network)) {
        seen.add(social.network);
        socials.push({ network: social.network, url: url.toString() });
        continue;
      }
      if (
        host === new URL(website).hostname.replace(/^www\./, "") &&
        (PRICE_WORDS.test(url.pathname) || PRICE_WORDS.test(label)) &&
        priceListLinks.length < 6 &&
        !priceListLinks.some((p) => p.url === url.toString())
      ) {
        priceListLinks.push({ label: label || url.pathname.replace(/\//g, " ").trim(), url: url.toString() });
      }
    }
    return { socials, emails: [...emails].slice(0, 5), priceListLinks, siteDescription, ok: true, error: null as string | null };
  } catch (e) {
    return {
      socials,
      emails: [],
      priceListLinks,
      siteDescription,
      ok: false,
      error: e instanceof Error && e.name === "AbortError" ? "Website did not respond in time" : "Website could not be read",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function buildBusinessProfile(placeId: string): Promise<BusinessProfile | null> {
  const res = await fetch(`${GATEWAY}/places/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { ...authHeaders(), "X-Goog-FieldMask": FIELD_MASK },
  });
  if (!res.ok) {
    console.error(`[profile] Place details failed [${res.status}]: ${await res.text()}`);
    return null;
  }
  const p = (await res.json()) as RawPlace;

  const topReviews: PublicReview[] = (p["reviews"] ?? []).map((r: any) => ({
    author: r?.authorAttribution?.displayName ?? "Google user",
    rating: r?.rating ?? null,
    when: r?.relativePublishTimeDescription ?? "",
    text: r?.text?.text ?? r?.originalText?.text ?? "",
  }));
  const { breakdown, themes } = summariseReviews(topReviews);

  const website: string | null = p["websiteUri"] ?? null;
  const site = website
    ? await readWebsite(website)
    : { socials: [], emails: [], priceListLinks: [], siteDescription: null, ok: false, error: null };

  const name: string = p["displayName"]?.text ?? "Unknown business";
  const address: string | null = p["formattedAddress"] ?? null;
  const q = encodeURIComponent(`${name} ${address ?? ""}`.trim());

  const priceRange = p["priceRange"]
    ? [p["priceRange"].startPrice?.units, p["priceRange"].endPrice?.units]
        .filter(Boolean)
        .map((u: string) => `£${u}`)
        .join("–") || null
    : null;

  return {
    placeId: p["id"] ?? placeId,
    name,
    address,
    lat: p["location"]?.latitude ?? null,
    lng: p["location"]?.longitude ?? null,
    category: p["primaryTypeDisplayName"]?.text ?? null,
    types: p["types"] ?? [],
    businessStatus: p["businessStatus"] ?? null,
    summary: p["editorialSummary"]?.text ?? null,
    rating: p["rating"] ?? null,
    reviews: p["userRatingCount"] ?? null,
    priceLevel: p["priceLevel"] ?? null,
    priceRange,
    phone: p["nationalPhoneNumber"] ?? null,
    internationalPhone: p["internationalPhoneNumber"] ?? null,
    website,
    mapsUri: p["googleMapsUri"] ?? null,
    openingHours: p["regularOpeningHours"]?.weekdayDescriptions ?? [],
    openNow: p["regularOpeningHours"]?.openNow ?? null,
    attributes: boolAttr(p),
    topReviews,
    ratingBreakdown: breakdown,
    reviewThemes: themes,
    socials: site.socials,
    emails: site.emails,
    priceListLinks: site.priceListLinks,
    siteDescription: site.siteDescription,
    siteFetched: site.ok,
    siteError: site.error,
    externalSearches: [
      { label: "TripAdvisor", url: `https://www.tripadvisor.co.uk/Search?q=${q}` },
      { label: "Yelp", url: `https://www.yelp.co.uk/search?find_desc=${encodeURIComponent(name)}` },
      { label: "Facebook", url: `https://www.facebook.com/search/top?q=${encodeURIComponent(name)}` },
      { label: "Instagram", url: `https://www.google.com/search?q=${encodeURIComponent(`${name} instagram`)}` },
      { label: "Companies House", url: `https://find-and-update.company-information.service.gov.uk/search?q=${encodeURIComponent(name)}` },
      { label: "Google", url: `https://www.google.com/search?q=${q}` },
    ],
  };
}
