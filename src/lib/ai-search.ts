// Natural-language location/business search interpreter.
// Prototype: runs entirely locally with deterministic heuristics so the
// conversational search works offline. FACT vs INFERENCE separation is kept —
// everything here is an INFERENCE about what the user meant, never data.

import { AREAS, BUSINESS_TYPES, generateCompetitors, type MockCompetitor } from "@/lib/competitor-mocks";

export type SearchIntent = "competitors" | "inspiration" | "opportunity";

export type ParsedSearch = {
  raw: string;
  /** Interpreted location / area, e.g. "Wakefield". */
  location: string;
  /** Interpreted business concepts, e.g. ["Book shops", "Pubs & bars"]. */
  categories: string[];
  /** True when the query described a blended concept (e.g. bookshop + wine bar). */
  hybrid: boolean;
  intent: SearchIntent;
  confidence: "high" | "medium" | "low";
  notes: string[];
};

type Concept = {
  /** Canonical label — matches competitor-mocks BUSINESS_TYPES where possible. */
  label: string;
  /** Opportunity Finder business type key. */
  typeKey: string;
  terms: string[];
};

const CONCEPTS: Concept[] = [
  { label: "Coffee shops", typeKey: "coffee_shop", terms: ["coffee", "coffee shop", "cafe", "café", "espresso", "roastery", "brunch"] },
  { label: "Book shops", typeKey: "book_shop", terms: ["book", "books", "bookshop", "book shop", "bookstore", "bookseller"] },
  { label: "Pubs & bars", typeKey: "restaurant", terms: ["bar", "wine bar", "wine", "pub", "tavern", "cocktail", "taproom", "alehouse"] },
  { label: "Restaurants", typeKey: "restaurant", terms: ["restaurant", "bistro", "dining", "eatery", "kitchen", "takeaway"] },
  { label: "Bakeries", typeKey: "bakery", terms: ["bakery", "bakeries", "baker", "patisserie", "cake"] },
  { label: "Barbers", typeKey: "hair_salon", terms: ["barber", "barbers", "grooming"] },
  { label: "Hair salons", typeKey: "hair_salon", terms: ["hair salon", "hairdresser", "salon", "beauty"] },
  { label: "Gyms", typeKey: "gym", terms: ["gym", "fitness", "pilates", "yoga", "crossfit"] },
  { label: "Pharmacies", typeKey: "pharmacy", terms: ["pharmacy", "pharmacies", "chemist", "dispensary"] },
  { label: "Convenience stores", typeKey: "convenience_store", terms: ["convenience", "corner shop", "grocer", "grocery", "mini market"] },
  { label: "Nurseries", typeKey: "nursery", terms: ["nursery", "nurseries", "childcare", "creche", "crèche"] },
  { label: "Dog grooming", typeKey: "dog_grooming", terms: ["dog groom", "dog grooming", "pet groom", "groomer"] },
  { label: "Care services", typeKey: "care_service", terms: ["care home", "care service", "domiciliary", "home care"] },
];

export const CONCEPT_LABELS = CONCEPTS.map((c) => c.label);

export function conceptToTypeKey(label: string): string | null {
  return CONCEPTS.find((c) => c.label.toLowerCase() === label.toLowerCase())?.typeKey ?? null;
}

/** Best-effort mapping of an interpreted concept onto the mock competitor type list. */
export function conceptToMockType(label: string): string {
  const exact = BUSINESS_TYPES.find((t) => t.toLowerCase() === label.toLowerCase());
  if (exact) return exact;
  return "Restaurants";
}

const POSTCODE = /\b([A-Z]{1,2}\d{1,2}[A-Z]?)(\s*\d[A-Z]{2})?\b/i;

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "any", "there", "are", "is", "in", "near", "around", "for", "me", "my",
  "that", "also", "trade", "trades", "trading", "as", "with", "of", "to", "find", "show", "looking",
  "shops", "shop", "business", "businesses", "please", "uk", "best", "top", "good", "some", "which",
]);

function detectLocation(q: string): { location: string; note?: string } {
  const lower = q.toLowerCase();

  // 1. Known mock areas win — they have coordinates and data.
  for (const area of Object.keys(AREAS)) {
    if (lower.includes(area.toLowerCase())) return { location: area };
  }

  // 2. "in <Place>" / "near <Place>" / "around <Place>"
  const m = q.match(/\b(?:in|near|around|within|across)\s+([A-Za-z][A-Za-z'\-]*(?:\s+[A-Z][A-Za-z'\-]*)*)/);
  if (m?.[1]) {
    const candidate = m[1]
      .split(/\s+/)
      .filter((w) => !STOP_WORDS.has(w.toLowerCase()))
      .join(" ")
      .trim();
    if (candidate.length > 1) return { location: candidate.replace(/[.?!,]+$/, "") };
  }

  // 3. Postcode
  const pc = q.match(POSTCODE);
  if (pc?.[0] && /\d/.test(pc[0])) return { location: pc[0].toUpperCase() };

  return { location: "", note: "No location was stated — add one to sharpen the results." };
}

function detectCategories(q: string): string[] {
  const lower = ` ${q.toLowerCase()} `;
  const found: { label: string; at: number }[] = [];
  for (const c of CONCEPTS) {
    let best = -1;
    for (const t of c.terms) {
      const idx = lower.indexOf(t);
      if (idx >= 0 && (best === -1 || idx < best)) best = idx;
    }
    if (best >= 0 && !found.some((f) => f.label === c.label)) found.push({ label: c.label, at: best });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.label);
}

function detectIntent(q: string): SearchIntent {
  const lower = q.toLowerCase();
  if (/inspir|favourite|favorite|admire|learn from|idea/.test(lower)) return "inspiration";
  if (/gap|opportunit|should i|viable|open|launch|market|demand|room for/.test(lower)) return "opportunity";
  return "competitors";
}

export const INTENT_LABEL: Record<SearchIntent, string> = {
  competitors: "Find competitors",
  inspiration: "Find inspiration",
  opportunity: "Spot market opportunities",
};

export function parseNaturalSearch(query: string): ParsedSearch {
  const raw = query.trim();
  const { location, note } = detectLocation(raw);
  const categories = detectCategories(raw);
  const intent = detectIntent(raw);
  const notes: string[] = [];
  if (note) notes.push(note);

  const hybrid = categories.length > 1 && /\b(and|\+|also|combined|hybrid|as well as|slash|cum)\b/i.test(raw);
  if (hybrid) notes.push("Read as a blended concept — businesses doing both under one roof are ranked first.");
  if (categories.length === 0) notes.push("No business type recognised — pick one below to continue.");

  const confidence: ParsedSearch["confidence"] =
    location && categories.length > 0 ? (categories.length > 2 ? "medium" : "high") : location || categories.length ? "medium" : "low";

  return { raw, location, categories, hybrid, intent, confidence, notes };
}

/** Human-readable summary line, e.g. "Showing businesses in Wakefield matching: bookshop + wine bar." */
export function describeSearch(p: ParsedSearch): string {
  const where = p.location ? `in ${p.location}` : "across the UK";
  const what = p.categories.length ? p.categories.join(" + ") : "all business types";
  return `Showing businesses ${where} matching: ${what}.`;
}

const HYBRID_PREFIX = ["The", "Page &", "Vine &", "Chapter", "Bind &", "Cork &", "Folio", "Press &"];

/**
 * Builds a result set for an interpreted search. Multiple categories are merged
 * and, when the query described a blend, hybrid venues are synthesised and
 * promoted to the top of the list.
 */
export function searchByConcepts(
  location: string,
  categories: string[],
  opts: { hybrid?: boolean; limit?: number } = {},
): MockCompetitor[] {
  const { hybrid = false, limit = 20 } = opts;
  const area = location.trim() || "Wakefield";
  const cats = categories.length ? categories : ["Coffee shops"];
  const perType = Math.max(6, Math.ceil(limit / cats.length) + 4);

  const merged: MockCompetitor[] = [];
  for (const c of cats) {
    merged.push(...generateCompetitors(area, conceptToMockType(c), perType));
  }

  const seen = new Set<string>();
  const unique = merged.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));

  if (hybrid && cats.length > 1) {
    const blendLabel = cats.map((c) => c.replace(/s$/, "")).join(" & ");
    const hybrids = unique.slice(0, 4).map((c, i) => ({
      ...c,
      id: `hybrid-${c.id}`,
      name: `${HYBRID_PREFIX[i % HYBRID_PREFIX.length]} ${c.name.split(" ").slice(1).join(" ")}`.trim(),
      category: blendLabel,
      notable: `Trades as a ${cats.map((x) => x.replace(/s$/, "").toLowerCase()).join(" and ")} — a direct match for your search.`,
    }));
    return [...hybrids, ...unique].slice(0, limit);
  }

  return unique.slice(0, limit);
}
