// Shared types + local persistence for the Found-r AI business profile.

export type PlaceSummary = {
  id: string;
  name: string;
  address: string;
  category: string;
  rating: number | null;
  reviews: number | null;
  lat: number;
  lng: number;
};

export type PlaceDetails = PlaceSummary & {
  website: string | null;
  phone: string | null;
  openingHours: string[];
  categories: string[];
  status: string | null;
  photos: string[];
  editorial: string | null;
  reviewSnippets: string[];
};

export type SocialLink = { platform: string; url: string | null; found: boolean };

export type CustomerIntel = {
  sentiment: number;
  summary: string;
  praised: string[];
  complaints: string[];
  mentioned: string[];
  themes: string[];
  improvements: string[];
  trend: string;
};

export type ExecutiveSummary = {
  whatItDoes: string;
  whoItServes: string;
  whyChosen: string;
  competitivePosition: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
};

export type CoreProfile = {
  description: string;
  tradingName: string;
  industry: string;
  category: string;
  subcategory: string;
  products: string[];
  services: string[];
  usps: string[];
  brandPositioning: string;
  toneOfVoice: string;
  pricingPosition: string;
  yearsTrading: string;
  email: string | null;
  socials: SocialLink[];
  customer: CustomerIntel;
  executive: ExecutiveSummary;
};

export type Persona = { name: string; description: string; age: string; motivation: string };

export type HealthCategory = { label: string; score: number; recommendation: string };

export type MarketIntel = {
  saturation: string;
  demand: string;
  footfall: string;
  population: string;
  householdIncome: string;
  ageProfile: string;
  spendingPower: string;
  tourism: string;
  nearbyRetail: string;
  offices: string;
  schools: string;
  parking: string;
  transport: string;
  amenities: string[];
};

export type DeepProfile = {
  advantages: string[];
  risks: string[];
  growth: string[];
  marketing: string[];
  personas: Persona[];
  targetAudience: string;
  scores: {
    marketOpportunity: number;
    competition: number;
    growthPotential: number;
    aiConfidence: number;
  };
  health: { overall: number; categories: HealthCategory[] };
  market: MarketIntel;
};

export type Competitor = {
  id: string;
  name: string;
  address: string;
  category: string;
  rating: number | null;
  reviews: number | null;
  lat: number;
  lng: number;
};

export type BusinessProfile = {
  place: PlaceDetails;
  core: CoreProfile;
  competitors: Competitor[];
  deep: DeepProfile | null;
  edits: Record<string, string>;
  updatedAt: string;
};

const KEY = "foundr.businessProfile";

export function saveProfile(p: BusinessProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("foundr:profile"));
}

export function loadProfile(): BusinessProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BusinessProfile) : null;
  } catch {
    return null;
  }
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("foundr:profile"));
}

export function scoreTone(score: number): "good" | "warn" | "bad" {
  if (score >= 70) return "good";
  if (score >= 45) return "warn";
  return "bad";
}

export function scoreColor(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 45) return "var(--warning)";
  return "var(--destructive)";
}
