// Business premises profiles: what each kind of business actually needs from a
// building. These are Found-r operating assumptions, not published standards,
// and every surface must present them as guidance to confirm with a surveyor.

import type { FeatureKey, PropertyType } from "./types";

export interface PremisesProfile {
  key: string;
  label: string;
  /** Opportunity-Finder business type keys that map onto this profile. */
  businessTypeKeys: string[];
  /** Below this, the concept generally does not work in the space. */
  hardMinSqFt: number;
  /** Found-r's recommended working minimum. */
  recommendedMinSqFt: number;
  /** Above this the unit is usually over-specified for the concept. */
  comfortableMaxSqFt: number;
  /** Extra floor area per expected concurrent customer, in sq ft. */
  sqFtPerCustomer: number | null;
  /** Extra floor area per member of staff, in sq ft. */
  sqFtPerStaff: number | null;
  allowedPropertyTypes: PropertyType[];
  /** Absence (explicitly stated) is close to disqualifying. */
  criticalFeatures: FeatureKey[];
  /** Strongly preferred; absence lowers the score but does not disqualify. */
  importantFeatures: FeatureKey[];
  /** Regulatory matters that must always be flagged for this trade. */
  regulatoryFlags: string[];
  /** Trade-specific questions to put to the agent. */
  questions: string[];
  sizeNote: string;
}

export const PREMISES_PROFILES: PremisesProfile[] = [
  {
    key: "gym",
    label: "Gym / fitness studio",
    businessTypeKeys: ["gym"],
    hardMinSqFt: 800,
    recommendedMinSqFt: 1000,
    comfortableMaxSqFt: 12000,
    sqFtPerCustomer: 45,
    sqFtPerStaff: 0,
    allowedPropertyTypes: ["leisure", "industrial", "mixed", "retail", "other"],
    criticalFeatures: ["high_ceiling", "toilets"],
    importantFeatures: ["showers", "parking", "transport", "disabled_access"],
    regulatoryFlags: [
      "Fitness use commonly needs a change of use (Class E covers many gyms, but not all landlords or leases permit it).",
      "Noise and vibration transfer to neighbours, especially free weights, is a frequent objection.",
    ],
    questions: [
      "What is the clear internal ceiling height, floor to underside of services?",
      "What is the floor loading capacity, and is the unit at ground level?",
      "Are there existing showers and changing rooms, or capacity to install them?",
      "What is above and beside the unit — is there residential accommodation?",
      "Does the lease and planning position permit fitness use without a change of use application?",
    ],
    sizeNote:
      "Boutique studios generally need 1,000 sq ft or more; a conventional gym with free weights, cardio and changing space usually needs 2,500 sq ft or more.",
  },
  {
    key: "food_drink",
    label: "Café / restaurant",
    businessTypeKeys: ["coffee_shop", "restaurant", "bakery"],
    hardMinSqFt: 300,
    recommendedMinSqFt: 600,
    comfortableMaxSqFt: 4000,
    sqFtPerCustomer: 15,
    sqFtPerStaff: 0,
    allowedPropertyTypes: ["restaurant", "retail", "mixed", "leisure", "other"],
    criticalFeatures: ["extraction", "toilets"],
    importantFeatures: ["frontage", "kitchen", "loading", "outdoor", "disabled_access"],
    regulatoryFlags: [
      "Hot food use normally requires suitable extraction and may require planning consent.",
      "Food business registration with the local authority is required before trading; alcohol needs a premises licence.",
    ],
    questions: [
      "Is there an existing extraction system, and does it terminate above roof level?",
      "What is the current planning use class, and has hot food use been consented?",
      "What are the incoming water, gas and electricity capacities?",
      "What are the commercial waste and grease-trap arrangements?",
      "Are there customer toilets, and do they meet the required provision for the cover count?",
    ],
    sizeNote:
      "Allow roughly 15 sq ft per cover plus back-of-house; a 40-cover café typically needs 900–1,200 sq ft including kitchen and stores.",
  },
  {
    key: "salon",
    label: "Salon / beauty",
    businessTypeKeys: ["hair_salon", "dog_grooming"],
    hardMinSqFt: 250,
    recommendedMinSqFt: 450,
    comfortableMaxSqFt: 2000,
    sqFtPerCustomer: 60,
    sqFtPerStaff: 0,
    allowedPropertyTypes: ["retail", "mixed", "office", "other"],
    criticalFeatures: ["toilets"],
    importantFeatures: ["frontage", "natural_light", "disabled_access", "transport", "storage"],
    regulatoryFlags: [
      "Some treatments require local authority special treatment registration or licensing.",
    ],
    questions: [
      "What is the incoming water supply and drainage capacity for backwash units?",
      "Is the frontage glazed, and can signage be installed?",
      "Is there a staff area and stock storage separate from the treatment floor?",
    ],
    sizeNote:
      "Allow around 60 sq ft per styling chair or treatment room, plus reception, backwash and storage.",
  },
  {
    key: "office",
    label: "Office / consultancy",
    businessTypeKeys: ["office", "consultancy"],
    hardMinSqFt: 120,
    recommendedMinSqFt: 250,
    comfortableMaxSqFt: 8000,
    sqFtPerCustomer: null,
    sqFtPerStaff: 80,
    allowedPropertyTypes: ["office", "mixed", "retail", "other"],
    criticalFeatures: [],
    importantFeatures: ["transport", "natural_light", "disabled_access", "parking"],
    regulatoryFlags: [],
    questions: [
      "What broadband and leased-line options are already installed in the building?",
      "Is there shared meeting space, and what are the building access hours?",
      "Is the service charge inclusive of heating, cleaning and reception?",
    ],
    sizeNote:
      "Allow roughly 80 sq ft per desk including circulation, plus meeting and break space.",
  },
  {
    key: "retail",
    label: "Retail",
    businessTypeKeys: ["convenience_store", "book_shop", "pharmacy", "retail"],
    hardMinSqFt: 200,
    recommendedMinSqFt: 500,
    comfortableMaxSqFt: 5000,
    sqFtPerCustomer: 20,
    sqFtPerStaff: 0,
    allowedPropertyTypes: ["retail", "mixed", "other"],
    criticalFeatures: ["frontage"],
    importantFeatures: ["storage", "loading", "toilets", "disabled_access", "transport"],
    regulatoryFlags: ["Confirm the permitted use covers your goods, and check any A-board or signage restrictions."],
    questions: [
      "What is the frontage width, and is the shopfront in good order?",
      "How are deliveries made, and are there loading restrictions on the street?",
      "How much of the stated area is sales floor rather than storage?",
    ],
    sizeNote:
      "Split the area roughly 70% sales floor and 30% back of house when sizing a shop unit.",
  },
  {
    key: "warehouse",
    label: "Warehouse / e-commerce / trade",
    businessTypeKeys: ["warehouse", "ecommerce", "trade"],
    hardMinSqFt: 500,
    recommendedMinSqFt: 1500,
    comfortableMaxSqFt: 50000,
    sqFtPerCustomer: null,
    sqFtPerStaff: 150,
    allowedPropertyTypes: ["industrial", "land", "mixed", "other"],
    criticalFeatures: ["loading", "high_ceiling"],
    importantFeatures: ["yard", "parking", "three_phase_power", "security", "toilets"],
    regulatoryFlags: ["Confirm permitted hours for vehicle movements and any storage restrictions in the lease."],
    questions: [
      "What are the loading door dimensions, and can an HGV or Luton van reach them?",
      "What is the eaves height and the floor loading capacity?",
      "Is three-phase power available, and what is the supply capacity?",
    ],
    sizeNote: "Size on pallet or rack count plus picking, packing and vehicle turning space.",
  },
  {
    key: "nursery",
    label: "Nursery / children's activity",
    businessTypeKeys: ["nursery"],
    hardMinSqFt: 600,
    recommendedMinSqFt: 1200,
    comfortableMaxSqFt: 8000,
    sqFtPerCustomer: 40,
    sqFtPerStaff: 0,
    allowedPropertyTypes: ["mixed", "office", "retail", "leisure", "other"],
    criticalFeatures: ["toilets", "outdoor"],
    importantFeatures: ["parking", "disabled_access", "natural_light", "security"],
    regulatoryFlags: [
      "Childcare use normally requires planning consent (Class E) and Ofsted registration.",
      "Safeguarding, secure entry, staff-to-child ratios and outdoor provision are inspected before you can trade.",
    ],
    questions: [
      "Is there secure, directly accessible outdoor space, and how large is it?",
      "Has the unit previously been in childcare or education use?",
      "Is there safe drop-off and pick-up, and what are the parking restrictions at peak times?",
    ],
    sizeNote:
      "Statutory indoor space requirements vary by age group; budget generously and confirm with your Ofsted registration adviser.",
  },
  {
    key: "clinic",
    label: "Healthcare / clinic",
    businessTypeKeys: ["clinic", "dentist", "physio"],
    hardMinSqFt: 400,
    recommendedMinSqFt: 800,
    comfortableMaxSqFt: 6000,
    sqFtPerCustomer: 50,
    sqFtPerStaff: 0,
    allowedPropertyTypes: ["office", "retail", "mixed", "other"],
    criticalFeatures: ["toilets", "disabled_access"],
    importantFeatures: ["parking", "transport", "natural_light", "security"],
    regulatoryFlags: [
      "Regulated clinical activity requires CQC registration and may require a change of use.",
      "Consultation rooms need acoustic privacy and, for some services, specific clinical waste arrangements.",
    ],
    questions: [
      "Can the layout be divided into consultation rooms with acoustic privacy?",
      "Is there level or lift access from the street to every clinical room?",
      "Is there a waiting area separate from the treatment area?",
    ],
    sizeNote: "Allow around 120 sq ft per consultation room plus waiting, reception and storage.",
  },
];

export const GENERIC_PROFILE: PremisesProfile = {
  key: "generic",
  label: "General business use",
  businessTypeKeys: [],
  hardMinSqFt: 150,
  recommendedMinSqFt: 350,
  comfortableMaxSqFt: 10000,
  sqFtPerCustomer: 20,
  sqFtPerStaff: 90,
  allowedPropertyTypes: ["retail", "office", "industrial", "leisure", "restaurant", "mixed", "land", "other"],
  criticalFeatures: [],
  importantFeatures: ["disabled_access", "transport"],
  regulatoryFlags: ["Confirm the permitted use class covers your intended trade before you commit."],
  questions: [
    "What is the current planning use class of the unit?",
    "What is included in the quoted rent, and what is charged separately?",
  ],
  sizeNote: "Size the unit from staff numbers, customer capacity, equipment and storage.",
};

export function profileForBusinessType(businessTypeKey: string): PremisesProfile {
  const k = businessTypeKey.toLowerCase();
  return (
    PREMISES_PROFILES.find((p) => p.key === k || p.businessTypeKeys.includes(k)) ??
    PREMISES_PROFILES.find((p) => p.businessTypeKeys.some((b) => k.includes(b) || b.includes(k))) ??
    GENERIC_PROFILE
  );
}

/**
 * Found-r's recommended floor-area range for a concept, given what the user has
 * told us. Returns nulls-free numbers plus the reasoning behind them.
 */
export function recommendedAreaRange(
  profile: PremisesProfile,
  opts: { staffCount?: number | null; customerCapacity?: number | null },
): { min: number; max: number; basis: string[] } {
  const basis: string[] = [profile.sizeNote];
  let min = profile.recommendedMinSqFt;

  if (opts.customerCapacity && profile.sqFtPerCustomer) {
    const need = Math.round(opts.customerCapacity * profile.sqFtPerCustomer);
    basis.push(
      `${opts.customerCapacity} concurrent customers × ${profile.sqFtPerCustomer} sq ft each = ${need.toLocaleString()} sq ft.`,
    );
    min = Math.max(min, need);
  }
  if (opts.staffCount && profile.sqFtPerStaff) {
    const need = Math.round(opts.staffCount * profile.sqFtPerStaff);
    basis.push(`${opts.staffCount} staff × ${profile.sqFtPerStaff} sq ft each = ${need.toLocaleString()} sq ft.`);
    min = Math.max(min, need);
  }
  const max = Math.max(Math.round(min * 2.2), profile.recommendedMinSqFt * 2);
  return { min, max: Math.min(max, profile.comfortableMaxSqFt), basis };
}

/** Questions Found-r needs answered before it will call anything a strong fit. */
export function missingRequirementQuestions(req: {
  staffCount: number | null;
  customerCapacity: number | null;
  budgetMonthlyMax: number | null;
  profile: PremisesProfile;
}): string[] {
  const out: string[] = [];
  if (req.profile.sqFtPerCustomer && !req.customerCapacity)
    out.push("How many customers do you expect on site at the busiest hour?");
  if (req.profile.sqFtPerStaff && !req.staffCount) out.push("How many people will work from the premises?");
  if (!req.budgetMonthlyMax) out.push("What is the most you can pay in rent each month, excluding rates?");
  return out;
}
