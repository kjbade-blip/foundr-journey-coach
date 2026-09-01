// Strict competitor-type matching.
//
// Product rule: a business is only ever shown as a direct competitor when
// Found-r is highly confident it is the SAME core customer-facing business
// type as the searched business. Ambiguous, incomplete or conflicting data
// means EXCLUDE — an incomplete list is preferable to a wrong one.
//
// Pure functions only. No I/O, no AI. Safe to import on client and server.

export type MatchVerdict = "direct" | "related" | "excluded";

export interface CandidateSignals {
  /** Google Places machine-readable primary type, e.g. "coffee_shop". */
  primaryType?: string | null;
  /** Google Places full machine type list. */
  types?: string[] | null;
  /** Human-readable primary category, e.g. "Coffee shop". */
  category?: string | null;
  /** Business name — used only as a corroborating signal, never on its own. */
  name?: string | null;
  /** Website URL — corroborating signal only. */
  website?: string | null;
}

export interface MatchResult {
  verdict: MatchVerdict;
  /** 0-100. Only >= 85 is ever treated as a direct competitor. */
  confidence: number;
  /** Auditable, user-facing sentence: "Why this is a competitor". */
  reason: string;
  matchedType: string | null;
}

interface TypeProfile {
  key: string;
  label: string;
  /** Free-text aliases used to resolve what the user searched for. */
  aliases: string[];
  /** Google place types that are an unambiguous direct match. */
  directTypes: string[];
  /** Regexes over the human-readable category that are a direct match. */
  directCategory: RegExp;
  /**
   * Types that are the right family but too broad on their own; only a direct
   * match when the name or category also carries a defining keyword.
   */
  conditionalTypes?: string[];
  /** Keyword corroboration for conditionalTypes. */
  keywords?: RegExp;
  /** Adjacent / complementary — never a competitor, shown separately. */
  relatedTypes: string[];
}

const PROFILES: TypeProfile[] = [
  {
    key: "coffee_shop",
    label: "Coffee shop",
    aliases: ["coffee shop", "coffee shops", "coffee", "cafe", "café", "cafes", "espresso bar", "coffee house", "coffeehouse"],
    directTypes: ["coffee_shop"],
    directCategory: /\b(coffee shop|coffee house|espresso bar|speciality coffee|specialty coffee|coffee roaster|coffee (&|and) brunch)\b/i,
    conditionalTypes: ["cafe", "tea_house"],
    keywords: /\b(coffee|espresso|barista|roast(er|ery|ed)?|brew bar|flat white|caff?[eè])\b/i,
    relatedTypes: ["bakery", "restaurant", "brunch_restaurant", "breakfast_restaurant", "sandwich_shop", "juice_shop", "tea_house", "bar", "bagel_shop", "donut_shop", "ice_cream_shop"],
  },
  {
    key: "restaurant",
    label: "Restaurant",
    aliases: ["restaurant", "restaurants", "casual dining", "bistro", "dining"],
    directTypes: [
      "restaurant", "italian_restaurant", "indian_restaurant", "chinese_restaurant", "japanese_restaurant",
      "thai_restaurant", "mexican_restaurant", "french_restaurant", "greek_restaurant", "spanish_restaurant",
      "turkish_restaurant", "vietnamese_restaurant", "korean_restaurant", "seafood_restaurant", "steak_house",
      "vegetarian_restaurant", "vegan_restaurant", "american_restaurant", "mediterranean_restaurant",
      "middle_eastern_restaurant", "pizza_restaurant", "sushi_restaurant", "ramen_restaurant", "brunch_restaurant",
    ],
    directCategory: /\b(restaurant|bistro|steakhouse|trattoria|brasserie|eatery|casual dining)\b/i,
    relatedTypes: ["cafe", "coffee_shop", "bar", "pub", "fast_food_restaurant", "meal_takeaway", "bakery", "night_club"],
  },
  {
    key: "takeaway",
    label: "Takeaway",
    aliases: ["takeaway", "takeaways", "fast food", "takeout"],
    directTypes: ["meal_takeaway", "fast_food_restaurant", "hamburger_restaurant", "fish_and_chips_restaurant"],
    directCategory: /\b(takeaway|take-?out|fast food|fish (and|&) chips|chip shop)\b/i,
    relatedTypes: ["restaurant", "pizza_restaurant", "cafe", "meal_delivery", "convenience_store"],
  },
  {
    key: "bakery",
    label: "Bakery",
    aliases: ["bakery", "bakeries", "artisan bakery", "patisserie"],
    directTypes: ["bakery"],
    directCategory: /\b(bakery|bakehouse|patisserie|p[âa]tisserie|bread shop)\b/i,
    relatedTypes: ["cafe", "coffee_shop", "sandwich_shop", "dessert_shop", "grocery_store", "donut_shop"],
  },
  {
    key: "pub_bar",
    label: "Pub or bar",
    aliases: ["pub", "pubs", "bar", "bars", "pubs & bars", "pubs and bars", "cocktail bar", "wine bar", "craft beer bar", "alehouse"],
    directTypes: ["bar", "pub", "wine_bar", "bar_and_grill"],
    directCategory: /\b(pub|bar|alehouse|tavern|taproom|inn)\b/i,
    relatedTypes: ["restaurant", "night_club", "liquor_store", "cafe", "coffee_shop", "event_venue"],
  },
  {
    key: "barber",
    label: "Barber shop",
    aliases: ["barber", "barbers", "barber shop", "barbershop", "mens grooming", "men's grooming"],
    directTypes: ["barber_shop"],
    directCategory: /\b(barber)\b/i,
    relatedTypes: ["hair_salon", "beauty_salon", "spa", "tattoo_parlor"],
  },
  {
    key: "hair_salon",
    label: "Hair salon",
    aliases: ["hair salon", "hair salons", "hairdresser", "hairdressers", "hair & beauty", "salon"],
    directTypes: ["hair_salon", "hair_care"],
    directCategory: /\b(hair salon|hairdress(er|ing)|hair studio|hair & beauty)\b/i,
    relatedTypes: ["barber_shop", "beauty_salon", "nail_salon", "spa"],
  },
  {
    key: "gym",
    label: "Gym",
    aliases: ["gym", "gyms", "fitness", "fitness studio", "health club", "strength & conditioning"],
    directTypes: ["gym", "fitness_center"],
    directCategory: /\b(gym|fitness (centre|center|studio)|health club|crossfit|strength (&|and) conditioning)\b/i,
    relatedTypes: ["yoga_studio", "spa", "sports_complex", "physiotherapist", "swimming_pool"],
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    aliases: ["pharmacy", "pharmacies", "chemist", "chemists", "community pharmacy"],
    directTypes: ["pharmacy", "drugstore"],
    directCategory: /\b(pharmacy|chemist|dispensary)\b/i,
    relatedTypes: ["doctor", "hospital", "convenience_store", "supermarket", "beauty_supply_store"],
  },
  {
    key: "book_shop",
    label: "Book shop",
    aliases: ["book shop", "book shops", "bookshop", "bookshops", "bookstore", "bookseller"],
    directTypes: ["book_store"],
    directCategory: /\b(book ?(shop|store)|bookseller)\b/i,
    relatedTypes: ["library", "gift_shop", "stationery_store", "cafe", "coffee_shop"],
  },
  {
    key: "convenience_store",
    label: "Convenience store",
    aliases: ["convenience store", "convenience stores", "corner shop", "mini market", "newsagent"],
    directTypes: ["convenience_store"],
    directCategory: /\b(convenience store|corner shop|mini ?market|newsagent)\b/i,
    relatedTypes: ["supermarket", "grocery_store", "liquor_store", "gas_station", "bakery"],
  },
  {
    key: "supermarket",
    label: "Supermarket",
    aliases: ["supermarket", "supermarkets", "grocery store", "grocery"],
    directTypes: ["supermarket", "grocery_store"],
    directCategory: /\b(supermarket|grocery)\b/i,
    relatedTypes: ["convenience_store", "butcher_shop", "bakery", "liquor_store"],
  },
  {
    key: "beauty_salon",
    label: "Beauty salon",
    aliases: ["beauty salon", "beauty", "nail salon", "nails", "aesthetics"],
    directTypes: ["beauty_salon", "nail_salon"],
    directCategory: /\b(beauty salon|nail (salon|bar)|aesthetics clinic)\b/i,
    relatedTypes: ["hair_salon", "barber_shop", "spa", "massage"],
  },
  {
    key: "florist",
    label: "Florist",
    aliases: ["florist", "florists", "flower shop"],
    directTypes: ["florist"],
    directCategory: /\bflorist|flower shop\b/i,
    relatedTypes: ["gift_shop", "garden_center", "home_goods_store"],
  },
  {
    key: "hotel",
    label: "Hotel",
    aliases: ["hotel", "hotels", "guest house", "b&b", "bed and breakfast", "accommodation"],
    directTypes: ["hotel", "bed_and_breakfast", "guest_house", "motel", "inn", "lodging"],
    directCategory: /\b(hotel|guest house|bed (and|&) breakfast|inn)\b/i,
    relatedTypes: ["hostel", "campground", "resort_hotel", "restaurant", "bar"],
  },
];

const GENERIC_TYPES = new Set([
  "point_of_interest", "establishment", "store", "food", "shopping_mall", "premise", "business",
]);

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

/** Resolve free text (a UI business type, a search term) to a known profile. */
export function resolveBusinessType(input: string | null | undefined): TypeProfile | null {
  const q = norm(input);
  if (!q) return null;
  let best: TypeProfile | null = null;
  let bestLen = 0;
  for (const p of PROFILES) {
    for (const alias of [...p.aliases, norm(p.label)]) {
      if (q === alias) return p;
      if ((q.includes(alias) || alias.includes(q)) && alias.length > bestLen) {
        best = p;
        bestLen = alias.length;
      }
    }
  }
  return best;
}

export function businessTypeLabel(input: string | null | undefined): string {
  return resolveBusinessType(input)?.label ?? (input ?? "this business type");
}

/**
 * Classify a candidate against the searched business type.
 * Only an unambiguous primary-category match returns "direct".
 */
export function classifyCandidate(searchedType: string | null | undefined, c: CandidateSignals): MatchResult {
  const profile = resolveBusinessType(searchedType);
  if (!profile) {
    return {
      verdict: "excluded",
      confidence: 0,
      reason: "Found-r could not determine the searched business type with confidence, so no competitor match was made.",
      matchedType: null,
    };
  }

  const primary = norm(c.primaryType).replace(/ /g, "_");
  const all = (c.types ?? []).map((t) => norm(t).replace(/ /g, "_"));
  const category = c.category ?? null;
  const corroboration = `${c.name ?? ""} ${category ?? ""} ${c.website ?? ""}`;

  const isDirectType = (t: string) => profile.directTypes.includes(t);
  const isConditional = (t: string) => (profile.conditionalTypes ?? []).includes(t);
  const isRelated = (t: string) => profile.relatedTypes.includes(t);

  // 1. Unambiguous machine-readable primary type.
  if (primary && isDirectType(primary)) {
    return {
      verdict: "direct",
      confidence: 97,
      reason: `Primary business category is "${category ?? primary.replace(/_/g, " ")}", a direct match for ${profile.label.toLowerCase()}.`,
      matchedType: primary,
    };
  }

  // 2. Broad-family primary type, only accepted with defining corroboration.
  if (primary && isConditional(primary)) {
    if (profile.keywords?.test(corroboration)) {
      return {
        verdict: "direct",
        confidence: 90,
        reason: `Primary category "${category ?? primary.replace(/_/g, " ")}" plus its own name and profile confirm it trades primarily as a ${profile.label.toLowerCase()}.`,
        matchedType: primary,
      };
    }
    return {
      verdict: "related",
      confidence: 45,
      reason: `Category "${category ?? primary.replace(/_/g, " ")}" is adjacent to ${profile.label.toLowerCase()} but its primary offering could not be confirmed, so it is not counted as a direct competitor.`,
      matchedType: primary,
    };
  }

  // 3. No usable primary type: accept only an explicit human category match.
  const primaryUnusable = !primary || GENERIC_TYPES.has(primary);
  if (primaryUnusable && category && profile.directCategory.test(category)) {
    const conflict = all.some((t) => isRelated(t) && !isDirectType(t));
    if (!conflict) {
      return {
        verdict: "direct",
        confidence: 88,
        reason: `Published category "${category}" is an exact ${profile.label.toLowerCase()} classification.`,
        matchedType: category,
      };
    }
  }

  // 4. Adjacent / complementary.
  if ((primary && isRelated(primary)) || all.some(isRelated)) {
    return {
      verdict: "related",
      confidence: 40,
      reason: `Classified as "${category ?? (primary.replace(/_/g, " ") || "a nearby business")}" — an adjacent business type, not a direct ${profile.label.toLowerCase()} competitor.`,
      matchedType: primary || null,
    };
  }

  return {
    verdict: "excluded",
    confidence: 10,
    reason: category
      ? `Primary category "${category}" is not a ${profile.label.toLowerCase()}, so it is excluded from the competitor list.`
      : `Business type could not be verified from reliable signals, so it is excluded by default.`,
    matchedType: primary || null,
  };
}

export function isDirectCompetitor(searchedType: string | null | undefined, c: CandidateSignals): boolean {
  return classifyCandidate(searchedType, c).verdict === "direct";
}

/** Split a candidate list into audited direct competitors and related businesses. */
export function partitionCandidates<T>(
  searchedType: string | null | undefined,
  list: T[],
  signals: (item: T) => CandidateSignals,
): { direct: Array<T & { match: MatchResult }>; related: Array<T & { match: MatchResult }>; excluded: number } {
  const direct: Array<T & { match: MatchResult }> = [];
  const related: Array<T & { match: MatchResult }> = [];
  let excluded = 0;
  for (const item of list) {
    const match = classifyCandidate(searchedType, signals(item));
    if (match.verdict === "direct") direct.push({ ...item, match });
    else if (match.verdict === "related") related.push({ ...item, match });
    else excluded += 1;
  }
  return { direct, related, excluded };
}

export const NO_DIRECT_COMPETITORS_MESSAGE = "No high-confidence direct competitors found nearby";
