// Business Diversity Index (BDI)
// Pure, deterministic calculation from Google Places (New) results.

export type Sector =
  | "Food & Drink"
  | "Retail"
  | "Health"
  | "Fitness"
  | "Professional Services"
  | "Financial Services"
  | "Beauty"
  | "Hospitality"
  | "Entertainment"
  | "Education"
  | "Automotive"
  | "Home & DIY"
  | "Children & Family"
  | "Culture"
  | "Public Services"
  | "Technology"
  | "Other";

export type BDIBand =
  | "Critical"
  | "High Risk"
  | "Weak"
  | "Stable"
  | "Strong"
  | "Exceptional";

export interface BDIPlaceInput {
  id?: string;
  name?: string;
  primaryType?: string;
  types?: string[];
  businessStatus?: string; // OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
  openLate?: boolean; // optional: derived from opening hours
}

export interface BDIOptions {
  vacancyRate?: number; // 0..1
  footfallIndex?: number; // 0..100
  demographics?: {
    medianIncome?: number;
    populationGrowth?: number; // -x .. x, %
    workingAgeShare?: number; // 0..1
  };
}

export interface BDIFactor {
  key: string;
  label: string;
  weight: number; // 0..1
  score: number; // 0..100
  detail?: string;
}

export interface BDIResult {
  overall: number; // 0..100
  band: BDIBand;
  tone: "good" | "warn" | "bad";
  factors: BDIFactor[];
  sectorMix: Array<{ sector: Sector; count: number; share: number }>;
  strengths: string[];
  weaknesses: string[];
  recommended: string[];
  avoid: string[];
  sampleSize: number;
  summary: string;
}

// ------------- Type -> Sector mapping (Google Places (New) primary types) ---

const TYPE_TO_SECTOR: Record<string, Sector> = {
  // Food & Drink
  restaurant: "Food & Drink",
  cafe: "Food & Drink",
  coffee_shop: "Food & Drink",
  bakery: "Food & Drink",
  meal_takeaway: "Food & Drink",
  meal_delivery: "Food & Drink",
  fast_food_restaurant: "Food & Drink",
  ice_cream_shop: "Food & Drink",
  sandwich_shop: "Food & Drink",
  pizza_restaurant: "Food & Drink",
  chinese_restaurant: "Food & Drink",
  indian_restaurant: "Food & Drink",
  italian_restaurant: "Food & Drink",
  japanese_restaurant: "Food & Drink",
  thai_restaurant: "Food & Drink",
  // Retail
  clothing_store: "Retail",
  shoe_store: "Retail",
  jewelry_store: "Retail",
  gift_shop: "Retail",
  book_store: "Retail",
  florist: "Retail",
  convenience_store: "Retail",
  supermarket: "Retail",
  grocery_store: "Retail",
  department_store: "Retail",
  shopping_mall: "Retail",
  pet_store: "Retail",
  toy_store: "Retail",
  liquor_store: "Retail",
  // Health
  doctor: "Health",
  dentist: "Health",
  pharmacy: "Health",
  hospital: "Health",
  drugstore: "Health",
  physiotherapist: "Health",
  optician: "Health",
  chiropractor: "Health",
  medical_lab: "Health",
  // Fitness
  gym: "Fitness",
  yoga_studio: "Fitness",
  fitness_center: "Fitness",
  personal_trainer: "Fitness",
  sports_club: "Fitness",
  // Professional Services
  lawyer: "Professional Services",
  accounting: "Professional Services",
  real_estate_agency: "Professional Services",
  insurance_agency: "Professional Services",
  consultant: "Professional Services",
  travel_agency: "Professional Services",
  post_office: "Public Services",
  // Financial Services
  bank: "Financial Services",
  atm: "Financial Services",
  finance: "Financial Services",
  // Beauty
  hair_salon: "Beauty",
  beauty_salon: "Beauty",
  barber_shop: "Beauty",
  nail_salon: "Beauty",
  spa: "Beauty",
  tattoo_parlor: "Beauty",
  // Hospitality
  bar: "Hospitality",
  pub: "Hospitality",
  night_club: "Hospitality",
  hotel: "Hospitality",
  lodging: "Hospitality",
  // Entertainment
  movie_theater: "Entertainment",
  bowling_alley: "Entertainment",
  amusement_center: "Entertainment",
  arcade: "Entertainment",
  casino: "Entertainment",
  event_venue: "Entertainment",
  // Education
  school: "Education",
  primary_school: "Education",
  secondary_school: "Education",
  university: "Education",
  tutoring_center: "Education",
  preschool: "Education",
  library: "Education",
  // Automotive
  car_dealer: "Automotive",
  car_repair: "Automotive",
  car_wash: "Automotive",
  gas_station: "Automotive",
  car_rental: "Automotive",
  // Home & DIY
  hardware_store: "Home & DIY",
  home_improvement_store: "Home & DIY",
  furniture_store: "Home & DIY",
  electrician: "Home & DIY",
  plumber: "Home & DIY",
  painter: "Home & DIY",
  locksmith: "Home & DIY",
  // Children & Family
  child_care_agency: "Children & Family",
  playground: "Children & Family",
  amusement_park: "Children & Family",
  zoo: "Children & Family",
  // Culture
  museum: "Culture",
  art_gallery: "Culture",
  performing_arts_theater: "Culture",
  cultural_center: "Culture",
  church: "Culture",
  place_of_worship: "Culture",
  // Public Services
  city_hall: "Public Services",
  local_government_office: "Public Services",
  police: "Public Services",
  courthouse: "Public Services",
  fire_station: "Public Services",
  // Technology
  electronics_store: "Technology",
  cell_phone_store: "Technology",
  computer_store: "Technology",
};

const HOSPITALITY_TYPES = new Set([
  "restaurant","cafe","coffee_shop","bar","pub","night_club","bakery",
  "ice_cream_shop","sandwich_shop","pizza_restaurant","meal_takeaway",
  "movie_theater","bowling_alley","amusement_center","event_venue",
]);

const ESSENTIAL_TYPES = new Set([
  "doctor","dentist","pharmacy","drugstore","bank","atm","post_office",
  "supermarket","grocery_store","convenience_store","optician",
]);

const EVENING_TYPES = new Set([
  "restaurant","bar","pub","night_club","movie_theater","gym","fitness_center",
  "bowling_alley","event_venue","casino","arcade",
]);

const COMPLEMENT_PAIRS: Array<[string, string]> = [
  ["cafe","bakery"],
  ["coffee_shop","bakery"],
  ["gift_shop","florist"],
  ["book_store","cafe"],
  ["restaurant","bar"],
  ["hair_salon","nail_salon"],
  ["gym","cafe"],
  ["pharmacy","doctor"],
];

const CHAIN_KEYWORDS = [
  "starbucks","costa","greggs","pret","mcdonald","kfc","burger king","subway",
  "nero","tesco","sainsbury","asda","morrisons","co-op","waitrose","aldi","lidl",
  "boots","superdrug","specsavers","vision express","nationwide","barclays",
  "hsbc","natwest","lloyds","santander","nandos","wagamama","dominos","papa john",
  "five guys","leon","itsu","gail","holland & barrett","poundland","b&m",
  "wetherspoon","weatherspoon","o2","ee","vodafone","three","apple","currys",
  "argos","primark","next","h&m","zara","uniqlo","tk maxx","waterstones",
];

// ------------- Helpers ----------------

function toSector(p: BDIPlaceInput): Sector {
  const t = p.primaryType || p.types?.[0] || "";
  return TYPE_TO_SECTOR[t] || "Other";
}

function isChain(name?: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return CHAIN_KEYWORDS.some((k) => n.includes(k));
}

function shannonNormalized(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0 || counts.length <= 1) return 0;
  const H = counts.reduce((acc, c) => {
    if (c === 0) return acc;
    const p = c / total;
    return acc - p * Math.log(p);
  }, 0);
  return H / Math.log(counts.length);
}

function herfindahl(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return counts.reduce((acc, c) => acc + Math.pow(c / total, 2), 0);
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function bandOf(score: number): { band: BDIBand; tone: "good" | "warn" | "bad" } {
  if (score >= 90) return { band: "Exceptional", tone: "good" };
  if (score >= 75) return { band: "Strong", tone: "good" };
  if (score >= 60) return { band: "Stable", tone: "warn" };
  if (score >= 40) return { band: "Weak", tone: "warn" };
  if (score >= 20) return { band: "High Risk", tone: "bad" };
  return { band: "Critical", tone: "bad" };
}

// ------------- Main -----------------

export function computeBDI(places: BDIPlaceInput[], opts: BDIOptions = {}): BDIResult {
  const operational = places.filter((p) => (p.businessStatus ?? "OPERATIONAL") === "OPERATIONAL");
  const n = operational.length;

  // Sector mix
  const sectorCounts = new Map<Sector, number>();
  const typeCounts = new Map<string, number>();
  let chainCount = 0;
  let hospitalityCount = 0;
  let eveningCount = 0;
  const essentialsPresent = new Set<string>();
  const typesPresent = new Set<string>();

  for (const p of operational) {
    const s = toSector(p);
    sectorCounts.set(s, (sectorCounts.get(s) ?? 0) + 1);
    const t = p.primaryType || p.types?.[0] || "unknown";
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    typesPresent.add(t);
    if (isChain(p.name)) chainCount++;
    if (HOSPITALITY_TYPES.has(t)) hospitalityCount++;
    if (EVENING_TYPES.has(t) || p.openLate) eveningCount++;
    if (ESSENTIAL_TYPES.has(t)) essentialsPresent.add(t);
  }

  const sectorArr = Array.from(sectorCounts.entries())
    .map(([sector, count]) => ({ sector, count, share: n ? count / n : 0 }))
    .sort((a, b) => b.count - a.count);

  // Factor 1: Category Diversity (30%)
  const sectorValues = Array.from(sectorCounts.values());
  const diversityScore = clamp(shannonNormalized(sectorValues) * 100);

  // Factor 2: Concentration (15%) — lower Herfindahl of primary types = higher score
  const hhi = herfindahl(Array.from(typeCounts.values()));
  const concentrationScore = clamp(100 * (1 - hhi));

  // Factor 3: Independent / Chain balance (10%)
  const chainShare = n ? chainCount / n : 0;
  // ideal around 0.25 chains
  const chainDist = Math.abs(chainShare - 0.25);
  const balanceScore = clamp(100 - chainDist * 220);

  // Factor 4: Vacancy (10%)
  const vacancy = opts.vacancyRate ?? 0.12;
  const vacancyScore = clamp(100 - vacancy * 400); // 0% = 100, 25% = 0

  // Factor 5: Hospitality & Experience (10%)
  const hospitalityShare = n ? hospitalityCount / n : 0;
  // ideal around 0.35
  const hospitalityScore = clamp(100 - Math.abs(hospitalityShare - 0.35) * 200);

  // Factor 6: Essential Services (10%)
  const essentialTargets = 7;
  const essentialScore = clamp((essentialsPresent.size / essentialTargets) * 100);

  // Factor 7: Evening Economy (5%)
  const eveningShare = n ? eveningCount / n : 0;
  const eveningScore = clamp(eveningShare * 250);

  // Factor 8: Complementarity (5%)
  let complementHits = 0;
  for (const [a, b] of COMPLEMENT_PAIRS) {
    if (typesPresent.has(a) && typesPresent.has(b)) complementHits++;
  }
  const complementScore = clamp((complementHits / COMPLEMENT_PAIRS.length) * 150);

  // Factor 9: Footfall (5%)
  const footfallScore = clamp(opts.footfallIndex ?? 60);

  const factors: BDIFactor[] = [
    { key: "diversity",     label: "Business Category Diversity", weight: 0.30, score: Math.round(diversityScore),     detail: `${sectorArr.length} sectors represented` },
    { key: "concentration", label: "Business Concentration",       weight: 0.15, score: Math.round(concentrationScore), detail: sectorArr[0] ? `Top type: ${sectorArr[0].sector} (${Math.round(sectorArr[0].share*100)}%)` : "" },
    { key: "balance",       label: "Independent vs Chain Balance", weight: 0.10, score: Math.round(balanceScore),       detail: `${Math.round(chainShare*100)}% recognisable chains` },
    { key: "vacancy",       label: "Vacancy Rate",                 weight: 0.10, score: Math.round(vacancyScore),       detail: `${Math.round(vacancy*100)}% estimated vacancy` },
    { key: "hospitality",   label: "Hospitality & Experience",     weight: 0.10, score: Math.round(hospitalityScore),   detail: `${Math.round(hospitalityShare*100)}% hospitality mix` },
    { key: "essentials",    label: "Essential Services",           weight: 0.10, score: Math.round(essentialScore),     detail: `${essentialsPresent.size} of ${essentialTargets} present` },
    { key: "evening",       label: "Evening Economy",              weight: 0.05, score: Math.round(eveningScore),       detail: `${Math.round(eveningShare*100)}% evening venues` },
    { key: "complementary", label: "Business Complementarity",     weight: 0.05, score: Math.round(complementScore),    detail: `${complementHits} complementary pairs` },
    { key: "footfall",      label: "Footfall Opportunity",         weight: 0.05, score: Math.round(footfallScore),      detail: opts.footfallIndex ? "Based on observed footfall" : "Modelled baseline" },
  ];

  let overall = factors.reduce((s, f) => s + f.score * f.weight, 0);

  // Optional demographics modifier (±3)
  const d = opts.demographics;
  if (d) {
    let modifier = 0;
    if (typeof d.medianIncome === "number") modifier += clamp((d.medianIncome - 30000) / 10000, -1.5, 1.5);
    if (typeof d.populationGrowth === "number") modifier += clamp(d.populationGrowth / 2, -1, 1);
    if (typeof d.workingAgeShare === "number") modifier += clamp((d.workingAgeShare - 0.6) * 5, -0.5, 0.5);
    overall = clamp(overall + modifier);
  }

  overall = Math.round(clamp(overall));
  const { band, tone } = bandOf(overall);

  const strengths = [...factors].sort((a, b) => b.score - a.score).slice(0, 3).map((f) => f.label);
  const weaknesses = [...factors].sort((a, b) => a.score - b.score).slice(0, 3).map((f) => f.label);

  // Recommendations
  const oversaturated = sectorArr.filter((s) => s.share > 0.30).map((s) => s.sector);
  const missingSectors = (Object.keys({
    "Food & Drink":1,"Retail":1,"Health":1,"Fitness":1,"Professional Services":1,
    "Financial Services":1,"Beauty":1,"Hospitality":1,"Entertainment":1,"Education":1,
    "Children & Family":1,"Culture":1,
  }) as Sector[]).filter((s) => !sectorCounts.has(s));

  let recommended: string[] = [];
  const avoid: string[] = [];
  if (overall >= 75) {
    recommended = ["Boutique Retail","Independent Coffee","Wine Bar","Professional Services"];
  } else if (overall >= 60) {
    recommended = missingSectors.slice(0, 4).length
      ? missingSectors.slice(0, 4).map((s) => `${s} concept`)
      : ["Speciality Retail","Family Restaurant","Health & Wellbeing","Independent Coffee"];
  } else {
    recommended = ["Children's Activities","Health & Wellbeing","Community Services","Family Restaurant","Specialist Retail"];
  }
  if (oversaturated.length) {
    for (const s of oversaturated) avoid.push(`${s} (oversaturated)`);
  }
  if (eveningScore < 40) recommended.unshift("Evening-economy venue (restaurant, café-bar, leisure)");

  const summary = buildTemplateSummary({ overall, band, sectorArr, oversaturated, eveningShare, hospitalityShare, essentialCount: essentialsPresent.size });

  return {
    overall,
    band,
    tone,
    factors,
    sectorMix: sectorArr,
    strengths,
    weaknesses,
    recommended,
    avoid,
    sampleSize: n,
    summary,
  };
}

function buildTemplateSummary({
  overall, band, sectorArr, oversaturated, eveningShare, hospitalityShare, essentialCount,
}: {
  overall: number; band: BDIBand;
  sectorArr: Array<{ sector: Sector; count: number; share: number }>;
  oversaturated: Sector[]; eveningShare: number; hospitalityShare: number; essentialCount: number;
}): string {
  const bits: string[] = [];
  const topSectors = sectorArr.slice(0, 3).map((s) => s.sector.toLowerCase()).join(", ");
  if (overall >= 75) {
    bits.push(`This location has a healthy mix across ${topSectors}.`);
    bits.push("The balanced business ecosystem supports long-term resilience and provides multiple reasons for customers to visit throughout the day.");
  } else if (overall >= 60) {
    bits.push(`The high street is reasonably balanced, led by ${topSectors}.`);
    bits.push("There is room to strengthen diversity and deepen the evening economy.");
  } else {
    bits.push(`Business mix is narrow and leans heavily on ${topSectors}.`);
    bits.push("Resilience is limited and there is meaningful room to broaden the offer.");
  }
  if (oversaturated.length) bits.push(`Concentration is high in ${oversaturated.join(", ")}, which increases competition and reduces diversity.`);
  if (eveningShare < 0.2) bits.push("The evening economy is thin, creating an opportunity for restaurants, cafés or leisure operators.");
  if (hospitalityShare > 0.5) bits.push("The area is very hospitality-heavy, which supports dwell time but leaves gaps in essential retail and services.");
  if (essentialCount < 3) bits.push("Essential services (pharmacy, bank, post office, grocers) are under-represented, weakening long-term resilience.");
  bits.unshift(`Business Diversity Index: ${overall}/100 (${band}).`);
  return bits.join(" ");
}
