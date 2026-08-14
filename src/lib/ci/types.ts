// Continuous Competitive Intelligence — shared, client-safe types.
//
// Three kinds of content live here and must stay visibly separated in the UI:
//   OBSERVED        — retrieved from a named source (currently Google Places)
//   INTERPRETATION  — hedged AI reading of observed change
//   RECOMMENDATION  — practical next steps, never a guaranteed outcome

export type CompetitorStatus = "identified" | "tracked" | "dismissed" | "user_added" | "inactive";

export const STATUS_LABEL: Record<CompetitorStatus, string> = {
  identified: "Found-r identified",
  tracked: "Tracked",
  dismissed: "Dismissed",
  user_added: "User added",
  inactive: "Inactive",
};

export type Severity = "critical" | "important" | "opportunity" | "informational";

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  important: "Important",
  opportunity: "Opportunity",
  informational: "Informational",
};

export type ChangeKind =
  | "new_competitor"
  | "competitor_closed"
  | "rating_change"
  | "review_growth"
  | "status_change"
  | "category_change"
  | "location_change"
  | "score_change"
  | "market_density";

export interface CIBusiness {
  id: string;
  name: string;
  placeId: string | null;
  address: string | null;
  lat: number;
  lng: number;
  businessType: string;
  searchTerm: string | null;
  radiusMiles: number;
  isPrimary: boolean;
}

export interface CICompetitor {
  id: string;
  placeId: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
  category: string | null;
  status: CompetitorStatus;
  source: string;
  relevance: number;
  competitorScore: number | null;
  rating: number | null;
  reviews: number | null;
  businessStatus: string | null;
  website: string | null;
  priceLevel: string | null;
  openingHours: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
}

export interface CIChange {
  id: string;
  competitorId: string | null;
  competitorName: string | null;
  kind: ChangeKind | string;
  severity: Severity;
  priority: number;
  title: string;
  detail: string;
  metrics: ChangeMetrics;
  ai: ChangeInterpretation | null;
  createdAt: string;
}

export interface ChangeInterpretation {
  whatThisMeans: string;
  whyItMatters: string;
  whatYouCouldDo: string[];
  generatedBy: "ai" | "rules";
}

export interface CIOpportunity {
  id: string;
  kind: string;
  title: string;
  whatWeFound: string;
  whyItMatters: string;
  whatToConsider: string[];
  confidence: string;
  status: string;
  createdAt: string;
}

export interface CILandscape {
  total: number;
  tracked: number;
  newCompetitors: number;
  closed: number;
  competitionScore: number | null;
  previousCompetitionScore: number | null;
  marketDensity: number | null;
  avgRating: number | null;
  avgReviews: number | null;
  interpretation: string;
  ranAt: string | null;
  previousRanAt: string | null;
}

export interface CISnapshotPoint {
  capturedAt: string;
  rating: number | null;
  reviews: number | null;
  businessStatus: string | null;
  competitorScore: number | null;
}

export interface CIAlertSettings {
  newCompetitors: boolean;
  majorChanges: boolean;
  closures: boolean;
  opportunities: boolean;
  marketChanges: boolean;
  frequency: "immediate" | "daily" | "weekly" | "off";
  emailEnabled: boolean;
}

export interface CIIntelligence {
  business: CIBusiness;
  competitors: CICompetitor[];
  changes: CIChange[];
  opportunities: CIOpportunity[];
  landscape: CILandscape;
  settings: CIAlertSettings;
  dataUpdatedAt: string | null;
}

export interface WeeklyBrief {
  periodLabel: string;
  changes: CIChange[];
  opportunities: CIOpportunity[];
  actionToConsider: string | null;
}

export function metresToMiles(m: number | null): string {
  if (m === null) return "Distance unavailable";
  return `${(m / 1609.34).toFixed(1)} mi`;
}
