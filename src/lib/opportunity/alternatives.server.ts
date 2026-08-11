// "Have you considered..." — nearby alternatives, scored with the same engine.
//
// Deliberately lightweight: each candidate gets real ONS evidence and a real
// competitor scan, scored by the canonical engine. Categories with no data are
// excluded exactly as they are in the full analysis, so a candidate is never
// flattered by missing evidence.

import { buildLocationProfile } from "../ons/profile.server";
import { scanCompetitors } from "../ons/competition.server";
import { buildScores } from "./engine";
import type { BusinessTypeDef } from "../ons/business-relevance";
import type { AlternativeLocation, OpportunityEvidence } from "./types";

const MILES_PER_DEG_LAT = 69;

const OFFSETS: Array<{ dLat: number; dLng: number; bearing: string }> = [
  { dLat: 1.5, dLng: 0, bearing: "north" },
  { dLat: -1.5, dLng: 0, bearing: "south" },
  { dLat: 0, dLng: 1.5, bearing: "east" },
  { dLat: 0, dLng: -1.5, bearing: "west" },
];

export async function findAlternatives(
  lat: number,
  lng: number,
  type: BusinessTypeDef,
  baselineScore: number | null,
  radiusMiles: number,
): Promise<AlternativeLocation[]> {
  const milesPerDegLng = MILES_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

  const candidates = await Promise.all(
    OFFSETS.map(async (o) => {
      const cLat = lat + o.dLat / MILES_PER_DEG_LAT;
      const cLng = lng + o.dLng / Math.max(1, milesPerDegLng);
      try {
        const profile = await buildLocationProfile({ latitude: cLat, longitude: cLng });
        const competition = await scanCompetitors(type.searchTerm, cLat, cLng, radiusMiles).catch(() => null);
        const evidence: OpportunityEvidence = {
          ons: profile,
          competition,
          crime: null,
          businessDiversity: null,
          companiesHouse: null,
          property: null,
          accessibility: null,
        };
        const { categories, overallScore } = buildScores(evidence, type, radiusMiles);
        if (overallScore === null) return null;
        const best = [...categories].sort((a, b) => b.score - a.score)[0];
        const worst = [...categories].sort((a, b) => a.score - b.score)[0];
        const alt: AlternativeLocation = {
          displayName: profile.displayName,
          postcode: profile.postcode,
          latitude: cLat,
          longitude: cLng,
          distanceMiles: 1.5,
          score: overallScore,
          advantage: best ? `${best.label} scores ${best.score}/100 here.` : "Comparable evidence base.",
          risk: worst ? `${worst.label} is weaker, at ${worst.score}/100.` : "No standout weakness in the partial evidence.",
          basedOn: ["ONS Census 2021", "Google Places"],
        };
        return alt;
      } catch (error) {
        console.error("[Alternatives] candidate failed:", error);
        return null;
      }
    }),
  );

  return candidates
    .filter((c): c is AlternativeLocation => c !== null)
    .filter((c) => baselineScore === null || c.score > baselineScore + 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
