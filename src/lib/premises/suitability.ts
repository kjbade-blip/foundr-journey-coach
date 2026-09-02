// Deterministic business-to-premises suitability engine.
//
// FOUND-R MODEL — never AI. The same listing and the same requirements always
// produce the same result. Rent and location alone can never make a property a
// strong fit: practical fit is checked first.

import {
  FEATURE_LABELS,
  PROPERTY_TYPE_LABELS,
  type FitStatus,
  type PropertyListing,
  type PropertyRequirements,
  type SuitabilityAssessment,
} from "./types";
import { profileForBusinessType, recommendedAreaRange, type PremisesProfile } from "./profiles";

const EXTERNAL_CHECKS = [
  "Planning permission and permitted use class for your trade.",
  "Any licences required (alcohol, food registration, special treatments, Ofsted, CQC).",
  "Lease terms: length, break clauses, repairing obligations, rent review and permitted alterations.",
  "Building condition: survey, EPC, services capacity, asbestos and fire strategy.",
];

function fmtSqFt(n: number): string {
  return `${Math.round(n).toLocaleString()} sq ft`;
}

export function sqFtToSqM(sqft: number): number {
  return Math.round(sqft * 0.092903);
}

export function monthlyRent(listing: PropertyListing): number | null {
  if (listing.rentPerMonth != null) return listing.rentPerMonth;
  if (listing.rentPerYear != null) return Math.round(listing.rentPerYear / 12);
  return null;
}

export function assessListing(
  listing: PropertyListing,
  req: PropertyRequirements,
  profileOverride?: PremisesProfile,
): SuitabilityAssessment {
  const profile = profileOverride ?? profileForBusinessType(req.businessTypeKey);
  const area = recommendedAreaRange(profile, {
    staffCount: req.staffCount,
    customerCapacity: req.customerCapacity,
  });
  const targetMin = req.minSqFt ?? area.min;
  const targetMax = req.maxSqFt ?? area.max;

  const positives: string[] = [];
  const gaps: string[] = [];
  const risks: string[] = [];
  const flags: string[] = [];
  const notStated: string[] = [];
  const questions: string[] = [];

  let score = 72;
  let disqualified = false;

  // ---- Property type -------------------------------------------------------
  if (!profile.allowedPropertyTypes.includes(listing.propertyType)) {
    disqualified = true;
    score -= 40;
    gaps.push(
      `${PROPERTY_TYPE_LABELS[listing.propertyType]} is not an appropriate building type for a ${profile.label.toLowerCase()}.`,
    );
    flags.push("Wrong property type");
  } else {
    positives.push(`${PROPERTY_TYPE_LABELS[listing.propertyType]} suits a ${profile.label.toLowerCase()}.`);
    score += 4;
  }
  if (req.propertyTypes.length > 0 && !req.propertyTypes.includes(listing.propertyType)) {
    score -= 8;
    gaps.push("Property type is outside the types you selected.");
  }

  // ---- Size ----------------------------------------------------------------
  const size = listing.sizeSqFt;
  if (size == null) {
    notStated.push("Floor area");
    flags.push("Floor area not stated");
    questions.push("What is the net internal floor area in sq ft, and how is it measured?");
    score -= 12;
  } else {
    if (size < profile.hardMinSqFt) {
      disqualified = true;
      score -= 45;
      gaps.push(
        `${fmtSqFt(size)} is far below the workable minimum of ${fmtSqFt(profile.hardMinSqFt)} for a ${profile.label.toLowerCase()}.`,
      );
      flags.push("Size below recommended minimum");
    } else if (size < targetMin) {
      score -= 20;
      gaps.push(
        `${fmtSqFt(size)} is under the ${fmtSqFt(targetMin)} Found-r recommends for your concept.`,
      );
      flags.push("Size below recommended minimum");
      questions.push("Is there additional ancillary space, a basement or mezzanine included in the letting?");
    } else if (size > targetMax * 1.6) {
      score -= 10;
      gaps.push(`${fmtSqFt(size)} is considerably larger than you need, which raises rent, rates and heating.`);
      flags.push("Larger than required");
    } else {
      score += 14;
      positives.push(`${fmtSqFt(size)} (${sqFtToSqM(size)} sq m) sits in your ${fmtSqFt(targetMin)}–${fmtSqFt(targetMax)} working range.`);
    }
  }

  // ---- Budget --------------------------------------------------------------
  const rent = monthlyRent(listing);
  if (rent == null) {
    notStated.push("Rent");
    flags.push("Rent on application");
    questions.push("What is the quoted rent, and is it quoted per annum exclusive?");
    score -= 8;
  } else if (req.budgetMonthlyMax != null) {
    if (rent <= req.budgetMonthlyMax) {
      score += 8;
      positives.push(`£${rent.toLocaleString()}/month is within your £${req.budgetMonthlyMax.toLocaleString()} budget.`);
    } else if (rent <= req.budgetMonthlyMax * 1.15) {
      score -= 5;
      gaps.push(`£${rent.toLocaleString()}/month is slightly over your budget.`);
    } else {
      score -= 18;
      gaps.push(`£${rent.toLocaleString()}/month is well over your £${req.budgetMonthlyMax.toLocaleString()} budget.`);
      flags.push("Over budget");
    }
  }
  if (listing.ratesPerYear == null) {
    notStated.push("Business rates");
    flags.push("Rates unavailable");
    questions.push("What is the rateable value, and does the unit qualify for small business rate relief?");
  }
  if (listing.serviceChargePerYear == null) notStated.push("Service charge");

  // ---- Features ------------------------------------------------------------
  for (const f of profile.criticalFeatures) {
    const stated = listing.features[f];
    if (stated === true) {
      score += 7;
      positives.push(`${FEATURE_LABELS[f]} confirmed in the advert.`);
    } else if (stated === false) {
      score -= 22;
      gaps.push(`${FEATURE_LABELS[f]} is stated as not present, and it is essential for this trade.`);
      flags.push(`No ${FEATURE_LABELS[f].toLowerCase()}`);
    } else {
      score -= 9;
      notStated.push(FEATURE_LABELS[f]);
      flags.push(`${FEATURE_LABELS[f]} not stated`);
      questions.push(`Does the unit have ${FEATURE_LABELS[f].toLowerCase()}, or can it be installed under the lease?`);
    }
  }
  for (const f of profile.importantFeatures) {
    const stated = listing.features[f];
    if (stated === true) {
      score += 3;
      positives.push(`${FEATURE_LABELS[f]} available.`);
    } else if (stated === false) {
      score -= 6;
      gaps.push(`No ${FEATURE_LABELS[f].toLowerCase()}.`);
    } else {
      notStated.push(FEATURE_LABELS[f]);
    }
  }
  for (const f of req.requiredFeatures) {
    const stated = listing.features[f];
    if (stated === false) {
      score -= 12;
      gaps.push(`You marked ${FEATURE_LABELS[f].toLowerCase()} as required, and the advert states it is not present.`);
    } else if (stated === undefined) {
      questions.push(`You require ${FEATURE_LABELS[f].toLowerCase()} — is it provided?`);
    }
  }

  // ---- Availability, freshness and completeness ---------------------------
  if (listing.status === "let") {
    disqualified = true;
    score -= 40;
    risks.push("The source shows this unit as let.");
    flags.push("Already let");
  } else if (listing.status === "under_offer") {
    score -= 10;
    risks.push("The unit is shown as under offer.");
    flags.push("Under offer");
  }
  if (!listing.availabilityConfirmed) {
    flags.push("Availability unverified");
    risks.push("Availability has not been confirmed since Found-r last checked the source.");
  }
  const ageDays = listing.listedAt ? Math.floor((Date.now() - Date.parse(listing.listedAt)) / 86_400_000) : null;
  if (ageDays != null && ageDays > 180) {
    score -= 8;
    risks.push(`Advert first listed ${ageDays} days ago — long-standing adverts are often already let or overpriced.`);
    flags.push("Stale listing");
  } else if (ageDays != null && ageDays <= 30) {
    score += 3;
    positives.push("Recently advertised.");
  }
  if (listing.availableFrom && req.moveInBy && Date.parse(listing.availableFrom) > Date.parse(req.moveInBy)) {
    score -= 8;
    gaps.push("Available later than your target move-in date.");
  }
  if (req.leaseLengthYears && listing.leaseLengthYears && listing.leaseLengthYears > req.leaseLengthYears * 2) {
    score -= 5;
    risks.push(`Lease term offered (${listing.leaseLengthYears} years) is much longer than the ${req.leaseLengthYears} years you wanted.`);
  }
  if (!listing.addressLine && listing.approximateLocation) {
    risks.push("The source withholds the full address; the map position is approximate.");
    flags.push("Approximate location");
  }

  // ---- Regulatory --------------------------------------------------------
  for (const r of profile.regulatoryFlags) risks.push(r);
  if (profile.criticalFeatures.includes("extraction") && listing.features.extraction !== true)
    flags.push("No extraction stated");
  flags.push("Planning check needed");

  questions.push(...profile.questions);

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  let status: FitStatus;
  if (disqualified) status = "unsuitable";
  else if (finalScore >= 76 && gaps.length <= 1) status = "strong";
  else if (finalScore >= 55) status = "possible";
  else status = "poor";

  const summary =
    status === "unsuitable"
      ? `Found-r does not consider this workable as a ${profile.label.toLowerCase()}: ${gaps[0] ?? "the building type or availability rules it out."}`
      : status === "strong"
        ? `Practical fit checks pass for a ${profile.label.toLowerCase()}, subject to planning, lease and condition checks.`
        : status === "possible"
          ? `Could work as a ${profile.label.toLowerCase()}, but there are open questions to resolve before viewing.`
          : `Weak fit for a ${profile.label.toLowerCase()} — the gaps below would need solving at your cost.`;

  return {
    status,
    score: finalScore,
    summary,
    positives: dedupe(positives),
    gaps: dedupe(gaps),
    risks: dedupe(risks),
    flags: dedupe(flags),
    notStated: dedupe(notStated),
    questions: dedupe(questions),
    externalChecks: EXTERNAL_CHECKS,
  };
}

function dedupe(xs: string[]): string[] {
  return Array.from(new Set(xs.filter(Boolean)));
}

const FIT_RANK: Record<FitStatus, number> = { strong: 3, possible: 2, poor: 1, unsuitable: 0 };

/**
 * Ranking order: suitability first, then budget fit, availability, freshness
 * and how complete the advert is. Unsuitable listings are demoted, never hidden.
 */
export function rankAssessed<T extends { listing: PropertyListing; assessment: SuitabilityAssessment }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const r = FIT_RANK[b.assessment.status] - FIT_RANK[a.assessment.status];
    if (r !== 0) return r;
    const s = b.assessment.score - a.assessment.score;
    if (s !== 0) return s;
    const av = Number(b.listing.availabilityConfirmed) - Number(a.listing.availabilityConfirmed);
    if (av !== 0) return av;
    const fresh = Date.parse(b.listing.listedAt ?? "1970-01-01") - Date.parse(a.listing.listedAt ?? "1970-01-01");
    if (fresh !== 0) return fresh;
    return completeness(b.listing) - completeness(a.listing);
  });
}

function completeness(l: PropertyListing): number {
  let n = 0;
  if (l.sizeSqFt != null) n++;
  if (l.rentPerMonth != null || l.rentPerYear != null) n++;
  if (l.ratesPerYear != null) n++;
  if (l.addressLine) n++;
  if (l.description) n++;
  if (l.imageUrl) n++;
  n += Object.keys(l.features).length / 10;
  return n;
}

/** When nothing viable comes back, explain which constraint is binding. */
export function noMatchAdvice(req: PropertyRequirements, assessed: Array<{ assessment: SuitabilityAssessment }>): string[] {
  const out: string[] = [];
  if (assessed.length === 0) {
    out.push(`Widen the radius beyond ${req.radiusMiles} miles, or search a neighbouring town centre.`);
    out.push("Relax the property type filter — some suitable units are advertised under a different category.");
    if (req.budgetMonthlyMax) out.push(`Test a budget above £${req.budgetMonthlyMax.toLocaleString()}/month to see what the market actually asks.`);
    return out;
  }
  const overBudget = assessed.filter((a) => a.assessment.flags.includes("Over budget")).length;
  const tooSmall = assessed.filter((a) => a.assessment.flags.includes("Size below recommended minimum")).length;
  const wrongType = assessed.filter((a) => a.assessment.flags.includes("Wrong property type")).length;
  if (tooSmall >= assessed.length / 2)
    out.push("Most nearby units are too small for this concept — either raise the radius or reconsider the format.");
  if (overBudget >= assessed.length / 2)
    out.push("Budget is the binding constraint here: most suitable units ask more than you have set.");
  if (wrongType >= assessed.length / 2)
    out.push("The local stock is mostly the wrong building type; try including industrial or leisure units.");
  if (out.length === 0) out.push("Loosen one requirement at a time — required features are the most common cause of thin results.");
  return out;
}
