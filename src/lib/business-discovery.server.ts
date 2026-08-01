import type {
  CoreProfile,
  DeepProfile,
  PlaceDetails,
  PlaceSummary,
  Competitor,
} from "./business-profile";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function mapsHeaders() {
  const lk = process.env.LOVABLE_API_KEY;
  const gk = process.env.GOOGLE_MAPS_API_KEY;
  if (!lk || !gk) throw new Error("Google Maps connector not configured");
  return { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk };
}

type RawPlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  primaryTypeDisplayName?: { text: string };
  primaryType?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  businessStatus?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  editorialSummary?: { text: string };
  photos?: Array<{ name: string }>;
  reviews?: Array<{ text?: { text: string }; rating?: number }>;
};

function toSummary(p: RawPlace): PlaceSummary {
  return {
    id: p.id,
    name: p.displayName?.text ?? "Unknown business",
    address: p.formattedAddress ?? "",
    category: p.primaryTypeDisplayName?.text ?? prettyType(p.primaryType ?? p.types?.[0] ?? ""),
    rating: p.rating ?? null,
    reviews: p.userRatingCount ?? null,
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
  };
}

export function prettyType(t: string) {
  return t ? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Business";
}

export async function searchBusinesses(query: string): Promise<PlaceSummary[]> {
  const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
    method: "POST",
    headers: {
      ...mapsHeaders(),
      "Content-Type": "application/json",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.primaryType,places.types,places.rating,places.userRatingCount,places.location",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 6 }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { places?: RawPlace[] };
  return (json.places ?? []).map(toSummary);
}

export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const fields = [
    "id","displayName","formattedAddress","primaryTypeDisplayName","primaryType","types",
    "rating","userRatingCount","location","websiteUri","nationalPhoneNumber",
    "businessStatus","regularOpeningHours","editorialSummary","photos","reviews",
  ].join(",");
  const res = await fetch(`${GATEWAY}/places/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { ...mapsHeaders(), "X-Goog-FieldMask": fields },
  });
  if (!res.ok) return null;
  const p = (await res.json()) as RawPlace;
  const base = toSummary({ ...p, id: p.id ?? placeId });
  return {
    ...base,
    website: p.websiteUri ?? null,
    phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
    openingHours: p.regularOpeningHours?.weekdayDescriptions ?? [],
    categories: (p.types ?? []).slice(0, 8).map(prettyType),
    status: p.businessStatus ?? null,
    photos: (p.photos ?? []).slice(0, 4).map((ph) => ph.name),
    editorial: p.editorialSummary?.text ?? null,
    reviewSnippets: (p.reviews ?? []).map((r) => r.text?.text ?? "").filter(Boolean).slice(0, 8),
  };
}

export async function fetchCompetitors(
  lat: number,
  lng: number,
  primaryType: string,
  radius = 2000,
): Promise<Competitor[]> {
  const res = await fetch(`${GATEWAY}/places/v1/places:searchNearby`, {
    method: "POST",
    headers: {
      ...mapsHeaders(),
      "Content-Type": "application/json",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.primaryType,places.rating,places.userRatingCount,places.location",
    },
    body: JSON.stringify({
      includedTypes: primaryType ? [primaryType] : undefined,
      maxResultCount: 15,
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { places?: RawPlace[] };
  return (json.places ?? []).map(toSummary);
}

async function aiJSON<T>(system: string, user: string, fallback: T): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return fallback;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        reasoning_effort: "none",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = j.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    return { ...fallback, ...(JSON.parse(cleaned) as object) } as T;
  } catch {
    return fallback;
  }
}

function placeContext(p: PlaceDetails) {
  return [
    `Name: ${p.name}`,
    `Address: ${p.address}`,
    `Primary category: ${p.category}`,
    `Google categories: ${p.categories.join(", ") || "n/a"}`,
    `Rating: ${p.rating ?? "n/a"} from ${p.reviews ?? 0} reviews`,
    `Website: ${p.website ?? "none found"}`,
    `Phone: ${p.phone ?? "n/a"}`,
    `Status: ${p.status ?? "n/a"}`,
    `Opening hours: ${p.openingHours.join(" | ") || "n/a"}`,
    p.editorial ? `Google summary: ${p.editorial}` : "",
    p.reviewSnippets.length ? `Review excerpts:\n- ${p.reviewSnippets.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const PLATFORMS = [
  "Facebook","Instagram","LinkedIn","TikTok","X","YouTube","Pinterest","Trustpilot","TripAdvisor","Yelp","Google Business Profile",
];

export function coreFallback(p: PlaceDetails): CoreProfile {
  return {
    description: p.editorial ?? `${p.name} is a ${p.category.toLowerCase()} based at ${p.address}.`,
    tradingName: p.name,
    industry: p.category,
    category: p.category,
    subcategory: p.categories[1] ?? p.category,
    products: [],
    services: [],
    usps: [],
    brandPositioning: "Mid-market local operator",
    toneOfVoice: "Friendly and practical",
    pricingPosition: "Mid-market",
    yearsTrading: "Unknown",
    email: null,
    socials: PLATFORMS.map((platform) => ({
      platform,
      url: platform === "Google Business Profile" ? `https://www.google.com/maps/place/?q=place_id:${p.id}` : null,
      found: platform === "Google Business Profile",
    })),
    customer: {
      sentiment: p.rating ? Math.round((p.rating / 5) * 100) : 60,
      summary: "Not enough public review data to summarise customer sentiment yet.",
      praised: [],
      complaints: [],
      mentioned: [],
      themes: [],
      improvements: [],
      trend: "Stable",
    },
    executive: {
      whatItDoes: `${p.name} operates as a ${p.category.toLowerCase()}.`,
      whoItServes: "Local customers in the surrounding catchment.",
      whyChosen: "Convenience and local reputation.",
      competitivePosition: "Established local independent.",
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
      recommendations: [],
    },
  };
}

export async function generateCoreProfile(p: PlaceDetails): Promise<CoreProfile> {
  const fallback = coreFallback(p);
  const system = `You are Found-r's business discovery analyst. You research a real business from public data and produce a structured profile. British English. Be specific, never generic. If something is genuinely unknowable, infer a realistic best estimate from the category and location — never invent named facts like awards or founders. Return ONLY JSON matching this shape:
{"description":string,"tradingName":string,"industry":string,"category":string,"subcategory":string,"products":string[],"services":string[],"usps":string[],"brandPositioning":string,"toneOfVoice":string,"pricingPosition":string,"yearsTrading":string,"email":string|null,"socials":[{"platform":string,"url":string|null,"found":boolean}],"customer":{"sentiment":number,"summary":string,"praised":string[],"complaints":string[],"mentioned":string[],"themes":string[],"improvements":string[],"trend":string},"executive":{"whatItDoes":string,"whoItServes":string,"whyChosen":string,"competitivePosition":string,"strengths":string[],"weaknesses":string[],"opportunities":string[],"threats":string[],"recommendations":string[]}}
socials must contain exactly these platforms in order: ${PLATFORMS.join(", ")}. Set found=true only where a presence is highly likely for this business; url may be null. Keep every list to 3-6 short items. The executive fields read like a top-tier consultancy summary (1-2 sentences each).`;
  const out = await aiJSON<CoreProfile>(system, placeContext(p), fallback);
  if (!Array.isArray(out.socials) || out.socials.length === 0) out.socials = fallback.socials;
  out.customer = { ...fallback.customer, ...(out.customer ?? {}) };
  out.executive = { ...fallback.executive, ...(out.executive ?? {}) };
  return out;
}

export function deepFallback(p: PlaceDetails, competitors: Competitor[]): DeepProfile {
  const density = competitors.length;
  return {
    advantages: [],
    risks: [],
    growth: [],
    marketing: [],
    personas: [],
    targetAudience: "Local residents and workers within a 15-minute catchment.",
    scores: {
      marketOpportunity: 62,
      competition: Math.max(20, 100 - density * 5),
      growthPotential: 60,
      aiConfidence: p.website ? 78 : 62,
    },
    health: {
      overall: 60,
      categories: [
        { label: "Online Presence", score: p.website ? 70 : 45, recommendation: "Publish a clear services page and keep listings consistent." },
        { label: "Customer Reputation", score: p.rating ? Math.round((p.rating / 5) * 100) : 60, recommendation: "Ask every satisfied customer for a Google review." },
        { label: "Brand Strength", score: 58, recommendation: "Tighten your positioning statement and use it everywhere." },
        { label: "Local Visibility", score: 62, recommendation: "Add photos and posts to your Google Business Profile weekly." },
        { label: "Market Opportunity", score: 62, recommendation: "Target the underserved segments in your catchment." },
        { label: "Competition", score: Math.max(20, 100 - density * 5), recommendation: "Differentiate on the areas competitors score badly on." },
        { label: "Growth Potential", score: 60, recommendation: "Add a repeat-purchase mechanic to lift lifetime value." },
      ],
    },
    market: {
      saturation: `${density} directly comparable businesses within 2km.`,
      demand: "Moderate and stable.",
      footfall: "Average for the area.",
      population: "Unknown",
      householdIncome: "Unknown",
      ageProfile: "Mixed",
      spendingPower: "Moderate",
      tourism: "Low",
      nearbyRetail: "Mixed independent and multiple retail.",
      offices: "Some nearby.",
      schools: "Several within catchment.",
      parking: "Limited on-street parking.",
      transport: "Served by local bus routes.",
      amenities: [],
    },
  };
}

export async function generateDeepProfile(
  p: PlaceDetails,
  core: CoreProfile,
  competitors: Competitor[],
): Promise<DeepProfile> {
  const fallback = deepFallback(p, competitors);
  const system = `You are Found-r's commercial strategy engine. Produce consultant-grade analysis for a real local business. British English, specific, no filler. Scores are 0-100 integers. Return ONLY JSON:
{"advantages":string[],"risks":string[],"growth":string[],"marketing":string[],"personas":[{"name":string,"description":string,"age":string,"motivation":string}],"targetAudience":string,"scores":{"marketOpportunity":number,"competition":number,"growthPotential":number,"aiConfidence":number},"health":{"overall":number,"categories":[{"label":string,"score":number,"recommendation":string}]},"market":{"saturation":string,"demand":string,"footfall":string,"population":string,"householdIncome":string,"ageProfile":string,"spendingPower":string,"tourism":string,"nearbyRetail":string,"offices":string,"schools":string,"parking":string,"transport":string,"amenities":string[]}}
health.categories must be exactly: Online Presence, Customer Reputation, Brand Strength, Local Visibility, Market Opportunity, Competition, Growth Potential — each with one practical recommendation. Give 3-5 items per list and 3 personas. Demographic fields should be realistic estimates for the specific address given.`;
  const user = [
    placeContext(p),
    `Positioning: ${core.brandPositioning}. Pricing: ${core.pricingPosition}.`,
    `Products: ${core.products.join(", ") || "n/a"}`,
    `Services: ${core.services.join(", ") || "n/a"}`,
    `Customer themes: ${core.customer.themes.join(", ") || "n/a"}`,
    `Nearby comparable businesses (${competitors.length}): ${competitors
      .slice(0, 12)
      .map((c) => `${c.name} (${c.rating ?? "-"}★/${c.reviews ?? 0})`)
      .join("; ")}`,
  ].join("\n");
  const out = await aiJSON<DeepProfile>(system, user, fallback);
  out.scores = { ...fallback.scores, ...(out.scores ?? {}) };
  out.market = { ...fallback.market, ...(out.market ?? {}) };
  const cats = out.health?.categories?.length ? out.health.categories : fallback.health.categories;
  const overall =
    out.health?.overall ?? Math.round(cats.reduce((s, c) => s + (c.score || 0), 0) / cats.length);
  out.health = { overall, categories: cats };
  return out;
}
