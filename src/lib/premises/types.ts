// Found-r "Find Premises" data model.
//
// Rules that must never be broken by any surface consuming these types:
//   * Missing data is `undefined` / `null` and must render as "Not stated".
//     It must never be rendered as "Not available" or treated as a negative.
//   * Every listing must carry its source name and the original advert URL.
//   * Availability, planning, licensing and permitted use are never presented
//     as confirmed unless the source explicitly confirms them.

export type PropertyType =
  | "retail"
  | "office"
  | "industrial"
  | "leisure"
  | "restaurant"
  | "mixed"
  | "land"
  | "other";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  retail: "Retail / shop unit",
  office: "Office",
  industrial: "Industrial / warehouse",
  leisure: "Leisure / gym",
  restaurant: "Restaurant / food & drink",
  mixed: "Mixed use",
  land: "Land / yard",
  other: "Other",
};

export type FeatureKey =
  | "parking"
  | "loading"
  | "toilets"
  | "extraction"
  | "outdoor"
  | "high_ceiling"
  | "disabled_access"
  | "transport"
  | "showers"
  | "three_phase_power"
  | "yard"
  | "frontage"
  | "natural_light"
  | "kitchen"
  | "storage"
  | "security";

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  parking: "Parking",
  loading: "Loading access",
  toilets: "Toilets",
  extraction: "Extraction / ventilation",
  outdoor: "Outdoor space",
  high_ceiling: "High ceilings",
  disabled_access: "Step-free / disabled access",
  transport: "Near public transport",
  showers: "Showers / changing space",
  three_phase_power: "Three-phase power",
  yard: "Yard space",
  frontage: "Street frontage",
  natural_light: "Natural light",
  kitchen: "Kitchen / food prep area",
  storage: "Back-of-house storage",
  security: "Secure access",
};

/** Tri-state: true = stated present, false = stated absent, undefined = not stated. */
export type FeatureMap = Partial<Record<FeatureKey, boolean>>;

export type ListingStatus = "available" | "under_offer" | "let" | "unknown";

export interface PropertySourceRef {
  /** Stable source identifier, e.g. "rightmove_commercial". */
  sourceId: string;
  sourceName: string;
  /** Direct link to the original advert (or the source search page). */
  sourceUrl: string;
  sourceListingId: string | null;
}

export interface PropertyListing extends PropertySourceRef {
  id: string;
  title: string;
  /** Full address when published, otherwise null. */
  addressLine: string | null;
  /** Used when the source withholds the full address. */
  approximateLocation: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  propertyType: PropertyType;
  sizeSqFt: number | null;
  sizeSqFtMax: number | null;
  rentPerMonth: number | null;
  rentPerYear: number | null;
  ratesPerYear: number | null;
  serviceChargePerYear: number | null;
  deposit: number | null;
  leaseType: string | null;
  leaseLengthYears: number | null;
  availableFrom: string | null;
  features: FeatureMap;
  description: string | null;
  imageUrl: string | null;
  agentName: string | null;
  agentContact: string | null;
  epcRating: string | null;
  listedAt: string | null;
  lastCheckedAt: string;
  /** True only when the source confirms the unit is still on the market. */
  availabilityConfirmed: boolean;
  status: ListingStatus;
}

export interface PropertySourceInfo {
  id: string;
  name: string;
  homepage: string;
  /** "feed" = structured data ingested; "outbound" = we link the user out. */
  mode: "feed" | "outbound";
  enabled: boolean;
  note: string;
  /** Prebuilt search URL carrying the user's criteria. */
  searchUrl: string | null;
}

export interface PropertyRequirements {
  businessTypeKey: string;
  location: string;
  radiusMiles: number;
  /** Budget is stored per month; annual is derived for display. */
  budgetMonthlyMin: number | null;
  budgetMonthlyMax: number | null;
  minSqFt: number | null;
  maxSqFt: number | null;
  propertyTypes: PropertyType[];
  requiredFeatures: FeatureKey[];
  leaseLengthYears: number | null;
  moveInBy: string | null;
  staffCount: number | null;
  customerCapacity: number | null;
  notes: string;
}

export type FitStatus = "strong" | "possible" | "poor" | "unsuitable";

export const FIT_LABELS: Record<FitStatus, string> = {
  strong: "Strong fit",
  possible: "Possible fit",
  poor: "Poor fit",
  unsuitable: "Not suitable",
};

export interface SuitabilityAssessment {
  status: FitStatus;
  /** 0-100 Found-r model score. Deterministic, never AI generated. */
  score: number;
  summary: string;
  /** Ranked positives, gaps and risks — top three are shown on the card. */
  positives: string[];
  gaps: string[];
  risks: string[];
  /** Short badges, e.g. "Planning check needed". */
  flags: string[];
  /** Fields the advert did not state (not the same as absent). */
  notStated: string[];
  /** Generated from missing or risky information. */
  questions: string[];
  /** Checks that always sit outside property fit. */
  externalChecks: string[];
}

export interface AssessedListing {
  listing: PropertyListing;
  assessment: SuitabilityAssessment;
}

export const PREMISES_DISCLAIMER =
  "Found-r premises results are research assistance only. Availability, rent, rates, floor areas, planning permission, permitted use, licensing, building condition and lease terms must be verified with the agent, landlord, local authority and your own solicitor and surveyor before you commit.";

export const COST_WARNING =
  "Advertised rent usually excludes business rates, service charge, VAT, fit-out, legal fees, utilities, insurance and deposit. Any rate relief is an assumption until confirmed by the local authority.";
