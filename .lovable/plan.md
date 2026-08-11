# Found-r: intelligence consolidation plan

Goal: one canonical analysis object powering every surface, no invented or demo data, explainable scores with a separate confidence rating, and a faster path from "idea + place" to a Found-r verdict. Nothing working gets removed.

## What already exists and gets reused

- `src/lib/ons/*` — ONS evidence layer, geography resolution, caching, competitor scan (Google Places), viability scoring, AI interpretation.
- `src/lib/crime/*` — police.uk profile, business-weighted risk model, benchmark corpus.
- `src/lib/bdi.ts` + `bdi.functions.ts` — Business Diversity Index.
- `src/lib/ons/business-relevance.ts` — per-business-type indicator weights (extended, not replaced).
- All UI cards (`ViabilityScoreCard`, `LocationProfileCard`, `CrimeRiskCard`, `BDICard`, `EvidencePanel`, `InterpretationCard`, `CompetitorList`) — reused, re-pointed at the canonical object.
- The 11-stage journey stays exactly as-is; only its entry point moves.

## Phase 1 — Truth and friction

- Onboarding: single click selects and continues (currently needs double-click or a second button press).
- Dashboard: remove the hardcoded founder score, journey %, sample opportunities and fake report list. Replace with real saved analyses, real journey progress, and a proper empty state with "Find my first opportunity".
- Opportunity Finder / Reports: strip any static SWOT, sample scores or placeholder copy; everything renders from the live analysis or shows an explicit "not available" state.
- Security pass: confirm no service-role or private key reaches the browser, all external API calls stay server-side, `.gitignore` covers env files, and RLS on every user-owned table is owner-scoped.

## Phase 2 — Canonical `OpportunityAnalysis`

New module `src/lib/opportunity/` containing:

- `types.ts` — the single analysis shape: business type, location, radius, timestamp, `evidence` (ons, places, crime, bdi, companiesHouse, property, accessibility), `scores` per category, overall score, confidence, verdict, strengths, risks, opportunities, evidence gaps, recommendation, alternatives.
- `weights.ts` — central, editable per-business-type category weighting (extends the existing business-relevance config; crime weighting becomes business-type dependent).
- `engine.ts` — deterministic normalisation and scoring. Existing `scoreLocation` logic moves in and is extended with ecosystem (BDI) and market-dynamics categories. Unavailable categories are excluded and their weight redistributed, and recorded as evidence gaps.
- `confidence.ts` — separate 0–100 confidence from source count, freshness, completeness and consistency, with a plain-English reason.
- `verdict.ts` — GO / GO WITH CONDITIONS / DO NOT PROCEED YET, derived from score + confidence + risks + gaps.
- `build.server.ts` — orchestrates evidence collection in parallel with per-source timeouts and failure isolation; one failing source degrades confidence rather than breaking the run.

`src/lib/ons/analysis.server.ts` becomes a thin adapter onto this so existing callers keep working. Every surface (finder, dashboard, reports, AI) consumes the same object.

## Phase 3 — Business market dynamics (Companies House)

- New `src/lib/opportunity/companies-house.server.ts` with a proper structured integration: active businesses, incorporations in the last 12 months and 3 years, dissolutions over the same windows, net change, business age.
- Cached in the existing evidence-cache pattern.
- Requires a Companies House API key. Without it the category reports as unavailable with a clear message — no fabricated figures — and confidence drops accordingly.

## Phase 4 — AI as interpreter only

- Rework `interpret.server.ts` to receive the full structured analysis (scores, raw evidence, gaps, confidence) and return: verdict rationale, strengths, risks, opportunities, what to investigate next, recommended action, confidence explanation, plus the signature "What would Found-r do?" paragraph.
- Hard rule enforced in the prompt and by post-validation: the model restates only supplied figures and never produces a score or a statistic.
- Crime language stays neutral and operational; facts stay attributed to police data, judgement labelled as Found-r interpretation.

## Phase 5 — Surfaces

- Opportunity Finder becomes a stepped flow: what → where → a few essentials → live progress checklist (demographics, competition, business activity, economy, crime, ecosystem) → score → "Why this score?" breakdown with source, value, reading and limitations per category → confidence → verdict → recommendation → "Start validating this opportunity", which hands off into the existing 11-stage journey.
- Dashboard shows my opportunities, my scores, journey progress, next action, saved locations, reports.
- Reports render the full analysis: executive summary, score, confidence, verdict, breakdown, evidence, competition, market dynamics, ecosystem, risks, opportunities, recommendation, alternatives, gaps, next steps.

## Phase 6 — Alternative locations

- Sample a small ring of nearby real geographies around the chosen point, score each through the same engine with cached evidence, and surface only those with genuine data: name, score, key advantage, key risk, distance.

## Database changes

- Extend `location_analyses` to store the full canonical analysis (analysis JSON, confidence, verdict) alongside the existing columns, keeping current rows valid.
- Add a cache table for Companies House market dynamics, mirroring the existing ONS/crime cache pattern.
- Owner-scoped RLS on everything user-generated, plus grants.

## Notes

- Companies House needs an API key before Phase 3 can return real data; the structure ships either way.
- Property and footfall data have no reliable source connected today, so they ship as defined integration points marked unavailable, excluded from scoring, and shown as an evidence gap.
