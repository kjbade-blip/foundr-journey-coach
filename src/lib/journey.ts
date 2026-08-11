// The 11 Found-r journey stages. Client-safe: definitions only.
// Progress is per-user and lives in the database (see journey.functions.ts).

export interface JourneyStage {
  title: string;
  outputs: string[];
  ai: string[];
}

export const STAGES: JourneyStage[] = [
  { title: "Explore", outputs: ["Founder Readiness Score", "Founder Profile", "Recommended Industries"], ai: ["Founder Coach"] },
  { title: "Discover Opportunities", outputs: ["Opportunity Shortlist", "Opportunity Rankings"], ai: ["Opportunity Engine"] },
  { title: "Validate Opportunity", outputs: ["Opportunity Score", "SWOT Analysis", "Viability Report", "Go / No-Go"], ai: ["Location Analyst", "Competitor Analyst", "Business Analyst"] },
  { title: "Plan", outputs: ["Business Plan", "Funding Plan", "Launch Roadmap"], ai: ["Business Planner"] },
  { title: "Build Foundations", outputs: ["Company Setup Checklist", "Compliance Checklist"], ai: ["Compliance Advisor"] },
  { title: "Secure Funding", outputs: ["Funding Recommendations", "Finance Options"], ai: ["Funding Advisor"] },
  { title: "Find Premises", outputs: ["Property Score", "Site Comparison Report"], ai: ["Location Selection Engine"] },
  { title: "Fit Out & Setup", outputs: ["Launch Readiness Score"], ai: ["Setup Advisor"] },
  { title: "Create Presence", outputs: ["Brand Pack", "Website Plan", "SEO Plan"], ai: ["Brand Advisor", "Marketing Advisor"] },
  { title: "Pre-Launch Marketing", outputs: ["Launch Campaign", "Social Content", "Marketing Calendar"], ai: ["Marketing Manager"] },
  { title: "Launch", outputs: ["Launch Checklist", "Opening Dashboard"], ai: ["Launch Coach"] },
];

export interface StageProgress {
  stageIndex: number;
  progress: number;
  status: string;
}

export function overallProgress(rows: StageProgress[]): number {
  const total = rows.reduce((s, r) => s + r.progress, 0);
  return Math.round(total / STAGES.length);
}

export function progressMap(rows: StageProgress[]): number[] {
  const out = STAGES.map(() => 0);
  for (const r of rows) if (r.stageIndex >= 0 && r.stageIndex < out.length) out[r.stageIndex] = r.progress;
  return out;
}
