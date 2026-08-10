// Builds the reusable Location Profile: the ONS evidence layer for a place.
// Nothing here invents a number — a dataset that fails or has no data for the
// geography is recorded in `unavailable` and omitted from the profile.

import { DATASETS, PROFILE_REFRESH_DAYS, type DatasetDef, type DatasetKey } from "./datasets";
import { fetchDataset, type RawObservation } from "./nomis.server";
import { readObservations, writeObservations, readProfile, writeProfile, saveGeographies } from "./cache.server";
import { resolveLocationQuery, resolveByCoordinates, type ResolvedLocation } from "./geography.server";
import type {
  DerivedIndicators,
  EvidenceItem,
  GeographyRef,
  LocationProfile,
  OnsBreakdown,
  OnsCategory,
  OnsMetric,
  UnavailableItem,
} from "./types";

const norm = (s: string) => s.toLowerCase().replace(/\s*:\s*/g, ": ").replace(/\s+/g, " ").trim();
const pct = (part: number | null, total: number | null) =>
  part === null || !total ? null : Math.round((part / total) * 1000) / 10;

interface Loaded {
  rows: RawObservation[];
  retrievedAt: string;
  geography: GeographyRef;
  dataset: DatasetDef;
}

class ProfileBuilder {
  readonly evidence: EvidenceItem[] = [];
  readonly unavailable: UnavailableItem[] = [];

  constructor(private readonly location: ResolvedLocation) {}

  private geographyFor(key: DatasetKey): GeographyRef | null {
    const laOnly: DatasetKey[] = ["populationEstimate", "populationEstimatePrior", "earnings"];
    if (laOnly.includes(key)) return this.location.geographies.local_authority ?? null;
    return this.location.primary;
  }

  async load(key: DatasetKey, label: string): Promise<Loaded | null> {
    const dataset = DATASETS[key];
    const geography = this.geographyFor(key);
    if (!geography) {
      this.unavailable.push({
        metric: label,
        reason: `No ${key === "earnings" ? "local authority" : "statistical"} geography available for this location.`,
      });
      return null;
    }

    try {
      const cached = await readObservations(dataset, geography);
      if (cached?.fresh && cached.rows.length > 0) {
        return { rows: cached.rows, retrievedAt: cached.retrievedAt, geography, dataset };
      }

      const rows = await fetchDataset(dataset, geography.code);
      if (rows.length === 0) {
        // Serve stale cache rather than nothing, but never fabricate.
        if (cached && cached.rows.length > 0) {
          return { rows: cached.rows, retrievedAt: cached.retrievedAt, geography, dataset };
        }
        this.unavailable.push({
          metric: label,
          reason: `ONS data for this metric is currently unavailable at ${geography.level.replace("_", " ")} level.`,
        });
        return null;
      }
      const retrievedAt = await writeObservations(dataset, geography, rows);
      return { rows, retrievedAt, geography, dataset };
    } catch (error) {
      console.error(`[ONS] ${dataset.table} failed for ${geography.code}:`, error);
      const cached = await readObservations(dataset, geography);
      if (cached && cached.rows.length > 0) {
        return { rows: cached.rows, retrievedAt: cached.retrievedAt, geography, dataset };
      }
      this.unavailable.push({
        metric: label,
        reason: "The ONS service did not respond, so this statistic is currently unavailable.",
      });
      return null;
    }
  }

  private provenance(loaded: Loaded, referencePeriod: string) {
    return {
      datasetId: loaded.dataset.id,
      datasetName: loaded.dataset.name,
      referencePeriod: `${loaded.dataset.collection} · ${referencePeriod}`,
      geographyLevel: loaded.geography.level,
      geographyCode: loaded.geography.code,
      geographyName: loaded.geography.name,
      source: loaded.dataset.source,
      sourceUrl: loaded.dataset.sourceUrl,
      retrievedAt: loaded.retrievedAt,
    };
  }

  private track(loaded: Loaded, label: string, referencePeriod: string) {
    const p = this.provenance(loaded, referencePeriod);
    if (!this.evidence.some((e) => e.label === label)) {
      this.evidence.push({
        label,
        datasetId: p.datasetId,
        datasetName: p.datasetName,
        referencePeriod: p.referencePeriod,
        geographyLevel: p.geographyLevel,
        geographyName: p.geographyName,
        source: p.source,
        sourceUrl: p.sourceUrl,
        retrievedAt: p.retrievedAt,
      });
    }
    return p;
  }

  metric(loaded: Loaded | null, label: string, match: (c: string) => boolean, fallbackUnit = ""): OnsMetric | null {
    if (!loaded) return null;
    const row = loaded.rows.find((r) => match(norm(r.category)));
    if (!row) {
      this.unavailable.push({ metric: label, reason: "ONS did not publish this figure for this geography." });
      return null;
    }
    return { ...this.track(loaded, label, row.referencePeriod), value: row.value, unit: row.unit || fallbackUnit };
  }

  breakdown(
    loaded: Loaded | null,
    label: string,
    isTotal: (c: string) => boolean,
    keep: (c: string) => boolean,
  ): OnsBreakdown | null {
    if (!loaded) return null;
    const totalRow = loaded.rows.find((r) => isTotal(norm(r.category)));
    const total = totalRow?.value ?? loaded.rows.filter((r) => keep(norm(r.category))).reduce((s, r) => s + r.value, 0);
    if (!total) {
      this.unavailable.push({ metric: label, reason: "ONS did not publish this breakdown for this geography." });
      return null;
    }
    const categories: OnsCategory[] = loaded.rows
      .filter((r) => keep(norm(r.category)))
      .map((r) => ({
        label: r.category,
        value: r.value,
        share: Math.round((r.value / total) * 1000) / 10,
      }));
    if (categories.length === 0) return null;
    const period = loaded.rows[0]!.referencePeriod;
    return {
      ...this.track(loaded, label, period),
      unit: loaded.rows[0]!.unit,
      total,
      categories,
    };
  }
}

/** Lower bound of an ONS age-band label, e.g. "Aged 25 to 29 years" -> 25. */
function bandLowerBound(label: string): number | null {
  const l = label.toLowerCase();
  if (l.includes("under")) return 0;
  const m = l.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function ageShare(bands: OnsBreakdown | null, min: number, max: number): number | null {
  if (!bands) return null;
  let sum = 0;
  let counted = false;
  for (const c of bands.categories) {
    const lo = bandLowerBound(c.label);
    if (lo === null) continue;
    if (lo >= min && lo <= max) {
      sum += c.value;
      counted = true;
    }
  }
  return counted ? pct(sum, bands.total) : null;
}

function sumMatching(b: OnsBreakdown | null, test: (label: string) => boolean): number | null {
  if (!b) return null;
  const rows = b.categories.filter((c) => test(norm(c.label)));
  return rows.length ? rows.reduce((s, c) => s + c.value, 0) : null;
}

export async function buildLocationProfile(input: {
  query?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
  forceRefresh?: boolean;
}): Promise<LocationProfile> {
  const location =
    input.query && input.query.trim()
      ? await resolveLocationQuery(input.query)
      : await resolveByCoordinates(input.latitude!, input.longitude!, input.label);

  const cacheKey = `${location.primary.level}:${location.primary.code}`;
  if (!input.forceRefresh) {
    const cached = await readProfile(cacheKey);
    if (cached) return { ...cached, displayName: location.displayName || cached.displayName };
  }

  await saveGeographies(location.geographies, location.latitude, location.longitude);

  const b = new ProfileBuilder(location);
  const isTotal = (c: string) => c.startsWith("total");

  const [popL, densityL, ageL, hhL, hhCompL, econL, indL, estL, priorL, payL] = await Promise.all([
    b.load("population", "Usual resident population"),
    b.load("density", "Population density"),
    b.load("age", "Age structure"),
    b.load("households", "Number of households"),
    b.load("householdComposition", "Household composition"),
    b.load("economicActivity", "Economic activity"),
    b.load("industry", "Industry of employment"),
    b.load("populationEstimate", "Population estimate"),
    b.load("populationEstimatePrior", "Population estimate (earlier year)"),
    b.load("earnings", "Median weekly pay"),
  ]);

  const population = b.metric(popL, "Usual resident population", (c) => c.includes("all usual residents"), "Persons");
  const populationDensity = b.metric(densityL, "Population density", (c) => c.includes("per square kilometre"), "Persons per km²");
  const households = b.metric(hhL, "Number of households", (c) => c.includes("number of households"), "Households");
  const populationEstimate = b.metric(estL, "Population estimate", () => true, "Persons");
  const medianWeeklyPay = b.metric(payL, "Median weekly pay", () => true, "£ per week");

  const ageBands = b.breakdown(ageL, "Age structure", isTotal, (c) => !isTotal(c));
  const householdComposition = b.breakdown(
    hhCompL,
    "Household composition",
    (c) => c.includes("all households"),
    (c) => !c.includes("all households") && !c.includes(":"),
  );
  const economicActivity = b.breakdown(
    econL,
    "Economic activity",
    (c) => c.includes("all usual residents aged 16"),
    (c) => c.split(":").length <= 2,
  );
  const industry = b.breakdown(indL, "Industry of employment", isTotal, (c) => !isTotal(c));

  // Population change is calculated by Found-r from two ONS estimates.
  let populationChange: OnsMetric | null = null;
  const prior = priorL ? priorL.rows[0] : null;
  if (populationEstimate && prior && prior.value > 0) {
    populationChange = {
      ...populationEstimate,
      value: Math.round(((populationEstimate.value - prior.value) / prior.value) * 1000) / 10,
      unit: "% change",
      referencePeriod: `${prior.referencePeriod} to ${populationEstimate.referencePeriod.split("· ").pop()}`,
      derivation: `Calculated by Found-r from ONS mid-year population estimates for ${prior.referencePeriod} and the latest year.`,
    };
  }

  // Household composition categories from TS003 that are hierarchy leaves for
  // dependent children (no double counting across parents).
  const withChildren = sumMatching(
    hhCompL
      ? b.breakdown(hhCompL, "Household composition", (c) => c.includes("all households"), (c) => c.includes("children"))
      : null,
    (c) => /(^|: )(with )?dependent children$/.test(c),
  );

  const onePerson = householdComposition?.categories.find((c) => norm(c.label) === "one-person household")?.value ?? null;
  const econTotal = economicActivity?.total ?? null;
  const inEmployment = sumMatching(economicActivity, (c) => c.endsWith(": in employment"));
  const unemployed = sumMatching(economicActivity, (c) => c.endsWith(": unemployed"));
  const inactive = sumMatching(economicActivity, (c) => c === "economically inactive");

  const largestAgeBand =
    ageBands?.categories.reduce<OnsCategory | null>((best, c) => (!best || c.value > best.value ? c : best), null)?.label ?? null;

  const derived: DerivedIndicators = {
    under16Pct: ageShare(ageBands, 0, 14),
    age16to24Pct: ageShare(ageBands, 15, 20),
    workingAgePct: ageShare(ageBands, 20, 64),
    age65PlusPct: ageShare(ageBands, 65, 200),
    largestAgeBand,
    employmentRatePct: pct(inEmployment, econTotal),
    unemploymentRatePct: pct(unemployed, econTotal),
    economicallyInactivePct: pct(inactive, econTotal),
    onePersonHouseholdPct: pct(onePerson, householdComposition?.total ?? null),
    householdsWithChildrenPct: pct(withChildren, householdComposition?.total ?? null),
    averageHouseholdSize:
      population && households?.value
        ? Math.round((population.value / households.value) * 100) / 100
        : null,
  };

  const now = new Date();
  const profile: LocationProfile = {
    cacheKey,
    displayName: location.displayName,
    postcode: location.postcode,
    latitude: location.latitude,
    longitude: location.longitude,
    primaryGeography: location.primary,
    geographies: location.geographies,
    population,
    populationEstimate,
    populationChange,
    populationDensity,
    households,
    medianWeeklyPay,
    ageBands,
    householdComposition,
    economicActivity,
    industry,
    derived,
    evidence: b.evidence,
    unavailable: b.unavailable,
    retrievedAt: now.toISOString(),
    refreshAfter: new Date(now.getTime() + PROFILE_REFRESH_DAYS * 86_400_000).toISOString(),
  };

  await writeProfile(profile, PROFILE_REFRESH_DAYS);
  return profile;
}
