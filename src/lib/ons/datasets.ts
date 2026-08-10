// Registry of the ONS datasets Found-r reads, with per-dataset refresh periods.
// Census tables change rarely; estimates and earnings are refreshed more often.

export interface DatasetDef {
  /** Nomis dataset identifier (ONS's own API for these tables). */
  id: string;
  /** ONS table reference, e.g. TS007A. */
  table: string;
  name: string;
  /** Human reference shown to users alongside the period. */
  collection: string;
  source: string;
  sourceUrl: string;
  /** How long a cached observation stays valid, in days. */
  refreshDays: number;
  /** Extra Nomis query parameters. */
  params?: Record<string, string>;
}

const ONS = "Office for National Statistics";
const CENSUS_URL = "https://www.ons.gov.uk/census";

export const DATASETS = {
  population: {
    id: "NM_2021_1",
    table: "TS001",
    name: "TS001 — Number of usual residents",
    collection: "Census 2021",
    source: ONS,
    sourceUrl: CENSUS_URL,
    refreshDays: 365,
  },
  density: {
    id: "NM_2026_1",
    table: "TS006",
    name: "TS006 — Population density",
    collection: "Census 2021",
    source: ONS,
    sourceUrl: CENSUS_URL,
    refreshDays: 365,
  },
  age: {
    id: "NM_2020_1",
    table: "TS007A",
    name: "TS007A — Age by five-year age bands",
    collection: "Census 2021",
    source: ONS,
    sourceUrl: CENSUS_URL,
    refreshDays: 365,
  },
  households: {
    id: "NM_2059_1",
    table: "TS041",
    name: "TS041 — Number of households",
    collection: "Census 2021",
    source: ONS,
    sourceUrl: CENSUS_URL,
    refreshDays: 365,
  },
  householdComposition: {
    id: "NM_2023_1",
    table: "TS003",
    name: "TS003 — Household composition",
    collection: "Census 2021",
    source: ONS,
    sourceUrl: CENSUS_URL,
    refreshDays: 365,
  },
  economicActivity: {
    id: "NM_2083_1",
    table: "TS066",
    name: "TS066 — Economic activity status",
    collection: "Census 2021",
    source: ONS,
    sourceUrl: CENSUS_URL,
    refreshDays: 365,
  },
  industry: {
    id: "NM_2017_1",
    table: "TS060A",
    name: "TS060A — Industry of employment",
    collection: "Census 2021",
    source: ONS,
    sourceUrl: CENSUS_URL,
    refreshDays: 365,
  },
  populationEstimate: {
    id: "NM_2002_1",
    table: "MYE",
    name: "Mid-year population estimates",
    collection: "ONS population estimates",
    source: ONS,
    sourceUrl:
      "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates",
    refreshDays: 90,
    params: { gender: "0", c_age: "200", date: "latest" },
  },
  populationEstimatePrior: {
    id: "NM_2002_1",
    table: "MYE",
    name: "Mid-year population estimates (earlier year)",
    collection: "ONS population estimates",
    source: ONS,
    sourceUrl:
      "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates",
    refreshDays: 90,
    params: { gender: "0", c_age: "200", date: "latestMINUS10" },
  },
  earnings: {
    id: "NM_30_1",
    table: "ASHE",
    name: "Annual Survey of Hours and Earnings — resident analysis",
    collection: "ONS ASHE",
    source: ONS,
    sourceUrl:
      "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours",
    refreshDays: 90,
    params: { sex: "8", item: "2", pay: "1", date: "latest" },
  },
} satisfies Record<string, DatasetDef>;

export type DatasetKey = keyof typeof DATASETS;

/** Profile cache lifetime — the shortest dataset refresh window. */
export const PROFILE_REFRESH_DAYS = 30;
/** Geography lookups are effectively static between boundary reviews. */
export const GEOGRAPHY_REFRESH_DAYS = 365;
