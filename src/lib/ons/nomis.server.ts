// Low-level client for the ONS statistics API (Nomis, run by ONS/Durham on
// behalf of the Office for National Statistics). These endpoints are open and
// require no credentials; if ONS ever issues one for this project it is read
// from process.env.ONS_API_KEY at request time and sent as a query parameter.
//
// Rules enforced here:
//  - never invent a value; a missing observation returns null
//  - always carry dataset, geography, unit and reference period with the value

import type { DatasetDef } from "./datasets";

const BASE = "https://www.nomisweb.co.uk/api/v01/dataset";
const TIMEOUT_MS = 12_000;

export interface RawObservation {
  category: string;
  value: number;
  unit: string;
  referencePeriod: string;
  geographyName: string;
}

export class OnsUnavailableError extends Error {
  constructor(
    message: string,
    readonly datasetId: string,
  ) {
    super(message);
    this.name = "OnsUnavailableError";
  }
}

type NomisCell = { value?: unknown; description?: string };
type NomisObs = Record<string, NomisCell | number | string | undefined>;

function cellDescription(cell: unknown): string | null {
  if (cell && typeof cell === "object" && "description" in cell) {
    const d = (cell as NomisCell).description;
    return typeof d === "string" ? d : null;
  }
  return null;
}

function cellValue(cell: unknown): number | null {
  if (cell && typeof cell === "object" && "value" in cell) {
    const v = (cell as NomisCell).value;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Fetch every observation for a dataset at one geography.
 * Returns [] when ONS has no data for that geography/metric combination —
 * callers must surface that as "unavailable", never substitute a figure.
 */
export async function fetchDataset(
  dataset: DatasetDef,
  geographyCode: string,
): Promise<RawObservation[]> {
  const params = new URLSearchParams({
    geography: geographyCode,
    measures: "20100",
    ...(dataset.params ?? {}),
  });
  const apiKey = process.env["ONS_API_KEY"];
  if (apiKey) params.set("uid", apiKey);

  const url = `${BASE}/${dataset.id}.data.json?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let payload: { obs?: NomisObs[]; error?: string };
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new OnsUnavailableError(
        `ONS API returned ${res.status} for ${dataset.table}`,
        dataset.id,
      );
    }
    payload = (await res.json()) as typeof payload;
  } catch (error) {
    if (error instanceof OnsUnavailableError) throw error;
    throw new OnsUnavailableError(
      `ONS API request failed for ${dataset.table}: ${(error as Error).message}`,
      dataset.id,
    );
  } finally {
    clearTimeout(timer);
  }

  if (payload.error || !Array.isArray(payload.obs)) return [];

  return payload.obs.flatMap((obs) => {
    const value = cellValue(obs["obs_value"]);
    if (value === null) return [];

    // The category dimension differs per table (c2021_age_19, cell, c_age…),
    // so read whichever classification key the table actually uses instead of
    // assuming fixed band names.
    const categoryKey = Object.keys(obs).find(
      (k) =>
        !["obs_value", "obs_status", "obs_conf", "obs_round", "measures", "freq", "time_format", "dataset", "geography", "unit", "time", "urn"].includes(k) &&
        cellDescription(obs[k]) !== null,
    );

    const time = cellDescription(obs["time"]) ?? String(obs["time"] ?? "");
    return [
      {
        category: (categoryKey ? cellDescription(obs[categoryKey]) : null) ?? "Total",
        value,
        unit: cellDescription(obs["unit"]) ?? "",
        referencePeriod: time,
        geographyName: cellDescription(obs["geography"]) ?? "",
      },
    ];
  });
}
