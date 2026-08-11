// Central, editable scoring configuration.
//
// Category weights are business-type aware: a convenience store lives or dies
// on resident density and competition, while a care service is driven by the
// age profile. These are a Found-r model, not a proven statistical
// relationship, and must always be labelled as such in the UI.
//
// Change weights here — never inside the engine.

import type { CategoryKey } from "./types";

export type CategoryWeights = Partial<Record<CategoryKey, number>>;

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  demand: "Demand & catchment",
  competition: "Competition headroom",
  demographics: "Demographic fit",
  economy: "Economic environment",
  marketDynamics: "Business market dynamics",
  ecosystem: "Business ecosystem",
  crime: "Crime & security",
  accessibility: "Accessibility & footfall",
  property: "Property & premises",
  businessFit: "Business-specific fit",
};

/** Applied when a business type has no explicit configuration. */
export const DEFAULT_WEIGHTS: CategoryWeights = {
  demand: 20,
  competition: 20,
  demographics: 18,
  economy: 14,
  marketDynamics: 10,
  ecosystem: 10,
  crime: 8,
  businessFit: 10,
  accessibility: 0,
  property: 0,
};

/**
 * Per-business-type overrides, keyed by BusinessTypeDef.key.
 * Crime carries more weight for late-night, cash-handling and hospitality
 * businesses than for daytime, appointment-led services.
 */
export const BUSINESS_CATEGORY_WEIGHTS: Record<string, CategoryWeights> = {
  coffee_shop: {
    demand: 22, competition: 22, demographics: 16, economy: 12,
    marketDynamics: 9, ecosystem: 11, crime: 8, businessFit: 10,
  },
  convenience_store: {
    demand: 26, competition: 20, demographics: 12, economy: 10,
    marketDynamics: 8, ecosystem: 8, crime: 16, businessFit: 10,
  },
  restaurant: {
    demand: 18, competition: 22, demographics: 14, economy: 16,
    marketDynamics: 9, ecosystem: 12, crime: 14, businessFit: 10,
  },
  bakery: {
    demand: 22, competition: 20, demographics: 16, economy: 12,
    marketDynamics: 10, ecosystem: 12, crime: 8, businessFit: 10,
  },
  gym: {
    demand: 20, competition: 22, demographics: 18, economy: 14,
    marketDynamics: 9, ecosystem: 9, crime: 8, businessFit: 10,
  },
  nursery: {
    demand: 14, competition: 20, demographics: 28, economy: 14,
    marketDynamics: 8, ecosystem: 6, crime: 6, businessFit: 10,
  },
  dog_grooming: {
    demand: 16, competition: 22, demographics: 22, economy: 16,
    marketDynamics: 9, ecosystem: 7, crime: 5, businessFit: 10,
  },
  hair_salon: {
    demand: 18, competition: 24, demographics: 18, economy: 14,
    marketDynamics: 9, ecosystem: 10, crime: 6, businessFit: 10,
  },
  pharmacy: {
    demand: 22, competition: 20, demographics: 20, economy: 10,
    marketDynamics: 8, ecosystem: 9, crime: 8, businessFit: 10,
  },
  care_service: {
    demand: 14, competition: 18, demographics: 30, economy: 12,
    marketDynamics: 9, ecosystem: 5, crime: 5, businessFit: 10,
  },
};

export function weightsFor(businessKey: string): CategoryWeights {
  return BUSINESS_CATEGORY_WEIGHTS[businessKey] ?? DEFAULT_WEIGHTS;
}
