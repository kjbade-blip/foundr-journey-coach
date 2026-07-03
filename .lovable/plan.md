## Business Diversity Index (BDI)

Introduce BDI as a first-class Found-r metric, computed from Google Places data and shown consistently across every analysis.

### 1. Core calculation library

New file `src/lib/bdi.ts` (pure TS, no side effects):

- Exports `BDIFactor`, `BDIBreakdown`, `BDIResult` types.
- `computeBDI(places, opts)` — takes an array of Google Places (New) results (`types[]`, `businessStatus`, `primaryType`, etc.) plus optional `vacancyRate`, `footfallIndex`, `demographics`.
- Maps Google place types → the 16 Found-r sectors (Food & Drink, Retail, Health, Fitness, Professional Services, Financial Services, Beauty, Hospitality, Entertainment, Education, Automotive, Home & DIY, Children & Family, Culture, Public Services, Technology).
- Computes weighted sub-scores (0–100):
  - Category Diversity 30% (normalised Shannon entropy across sectors)
  - Concentration 15% (inverse Herfindahl on primary types — penalises 15 barbers etc.)
  - Independent vs Chain Balance 10% (chain heuristic on repeated brand names)
  - Vacancy 10% (from input; 12% default)
  - Hospitality & Experience 10% (share of restaurants/cafes/bars/entertainment)
  - Essential Services 10% (presence of doctor/dentist/bank/pharmacy/post/grocer/optician)
  - Evening Economy 5% (share of venues typically open past 17:00)
  - Complementarity 5% (bonus for coexisting complementary pairs)
  - Footfall 5% (from input; neutral 60 default)
  - Optional demographic modifier ±3 pts.
- Returns overall score (0–100), band (`Critical`/`High Risk`/`Weak`/`Stable`/`Strong`/`Exceptional`), colour token, per-factor breakdown, top strengths/weaknesses, and recommended vs oversaturated sector lists.

Deterministic and fully unit-testable — no AI required for the number itself.

### 2. AI narrative

New server function `src/lib/bdi.functions.ts` → `generateBDINarrative({ locationName, result })` using Lovable AI Gateway (`google/gemini-3-flash-preview`). Returns `{ summary, insights[], recommendations[] }`. Falls back to a template string if the gateway errors.

### 3. Shared UI components

Under `src/components/foundr/bdi/`:

- `BDIGauge.tsx` — circular SVG progress gauge (green ≥75, amber 40–74, red <40) with big score, band label.
- `BDICard.tsx` — the "Business Diversity Index" card: gauge + one-paragraph explanation + "View breakdown" toggle.
- `BDIBreakdown.tsx` — factor bars with score and weight.
- `BDIInsights.tsx` — AI narrative + recommendation chips (recommended vs avoid).
- `BDICompare.tsx` — side-by-side table of BDI scores across multiple locations, highlighting best/worst factors.

All colour tokens driven from `src/styles.css` (add `--bdi-green`, `--bdi-amber`, `--bdi-red` semantic tokens).

### 4. Data fetching

New server function `getLocationBDI({ lat, lng, radius, name })` in `src/lib/bdi.functions.ts`:

- Calls Places API (New) `places:searchNearby` through the connector gateway with a broad `includedTypes` list covering all 16 sectors, `maxResultCount: 20`, then paginates by widening sector groups to gather ~60–100 places.
- Feeds results into `computeBDI` and returns `{ result, narrative }`.
- Cached in TanStack Query with `['bdi', lat, lng, radius]`.

### 5. Integration points

Wire BDI into every analysis surface:

- `app.opportunity-finder.tsx` — add BDI card + breakdown to the Location Analysis panel, next to Opportunity Score. Feed the BDI band into the existing recommendations list.
- `app.competitors.tsx` — show BDI card for the selected area, with Concentration factor highlighted (it's the competition story).
- `app.dashboard.tsx` — add BDI to the KPI strip alongside Opportunity/Demand/Competition/Risk.
- `app.reports.tsx` — include a full BDI section (gauge + breakdown + AI narrative + recommendations) in every generated Location Analysis, Business Analysis and Opportunity Report.
- `app.journey.tsx` — surface BDI on the "Validate location" step.
- `index.tsx` (marketing) — add BDI to the metrics list as one of the signature scores.

### 6. Comparison feature

New route `src/routes/app.bdi-compare.tsx` — user picks 2–4 locations (reuse Places autocomplete from opportunity-finder), renders `BDICompare` with per-factor winners and an AI summary of each location's strengths/weaknesses. Also add a "Compare" button on each BDI card that deep-links to this route with the current location pre-filled.

### 7. Nav + copy

- Add "BDI Compare" entry to the sidebar in `app.tsx`.
- Add a short "What is BDI?" tooltip/info popover on every BDI card linking to a docs paragraph in the pricing/marketing site.

### Technical notes

- All Places calls go through `https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchNearby` with `Authorization: Bearer ${LOVABLE_API_KEY}` and `X-Connection-Api-Key: ${GOOGLE_MAPS_API_KEY}` — server-side only.
- Field mask kept tight: `places.displayName,places.primaryType,places.types,places.businessStatus,places.regularOpeningHours`.
- No DB changes required in this pass; results are computed on demand and cached via TanStack Query. If persistence is wanted later, we can add a `bdi_snapshots` table.
- Colour tokens added to `src/styles.css`; no hard-coded hex in components.
- Vacancy + footfall are best-effort inputs — when missing we surface a "based on public data" note rather than fabricating precision.
