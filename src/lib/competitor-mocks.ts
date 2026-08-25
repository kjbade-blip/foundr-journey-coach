// Mock competitor data for the Competitor Watchlist prototype.
// Deterministic (seeded) so the same area + type always produces the same list.

export type MockCompetitor = {
  id: string;
  name: string;
  category: string;
  area: string;
  address: string;
  distanceMiles: number;
  rating: number | null;
  reviews: number | null;
  website: string | null;
  lat: number;
  lng: number;
  notable: string;
};

export const BUSINESS_TYPES = [
  "Coffee shops",
  "Restaurants",
  "Bakeries",
  "Barbers",
  "Hair salons",
  "Gyms",
  "Pubs & bars",
  "Pharmacies",
  "Book shops",
  "Convenience stores",
];

export const AREAS: Record<string, { lat: number; lng: number; streets: string[] }> = {
  Wakefield: { lat: 53.6833, lng: -1.4977, streets: ["Westgate", "Kirkgate", "Northgate", "Bull Ring", "Trinity Walk", "Horbury Road"] },
  Manchester: { lat: 53.4808, lng: -2.2426, streets: ["Deansgate", "Northern Quarter", "Oxford Road", "Ancoats", "Spinningfields"] },
  Leeds: { lat: 53.8008, lng: -1.5491, streets: ["Briggate", "Call Lane", "Headrow", "Chapel Allerton", "Kirkstall Road"] },
  London: { lat: 51.5072, lng: -0.1276, streets: ["Shoreditch High St", "Borough High St", "Battersea Rise", "Camden Road", "Peckham Rye"] },
  Sheffield: { lat: 53.3811, lng: -1.4701, streets: ["Division Street", "Ecclesall Road", "London Road", "Kelham Island"] },
  Bristol: { lat: 51.4545, lng: -2.5879, streets: ["Park Street", "Gloucester Road", "Stokes Croft", "Clifton Village"] },
  Edinburgh: { lat: 55.9533, lng: -3.1883, streets: ["Rose Street", "Leith Walk", "Grassmarket", "Stockbridge"] },
};

const PREFIX = ["The", "Old", "Little", "Urban", "North", "Crown", "Market", "Union", "Ivy", "Bright"];

const TYPE_WORDS: Record<string, string[]> = {
  "Coffee shops": ["Coffee", "Roast", "Espresso", "Bean", "Brew", "Café"],
  Restaurants: ["Kitchen", "Table", "Dining", "Plate", "Grill"],
  Bakeries: ["Bakery", "Bake", "Loaf", "Crumb", "Dough"],
  Barbers: ["Barbers", "Cuts", "Grooming", "Chair", "Blade"],
  "Hair salons": ["Hair", "Salon", "Studio", "Colour", "Blowdry"],
  Gyms: ["Fitness", "Gym", "Strength", "Athletic", "Training"],
  "Pubs & bars": ["Tavern", "Arms", "Bar", "Alehouse", "Social"],
  Pharmacies: ["Pharmacy", "Chemist", "Dispensary", "Health"],
  "Book shops": ["Books", "Bookshop", "Pages", "Chapter", "Reads"],
  "Convenience stores": ["Convenience", "Local", "Stores", "Mini Market", "Express"],
};

const CATEGORY_LABEL: Record<string, string[]> = {
  "Coffee shops": ["Coffee shop", "Speciality coffee", "Coffee & brunch"],
  Restaurants: ["Restaurant", "Bistro", "Casual dining"],
  Bakeries: ["Bakery", "Artisan bakery", "Bakery & café"],
  Barbers: ["Barber shop", "Barber & grooming"],
  "Hair salons": ["Hair salon", "Hair & beauty"],
  Gyms: ["Gym", "Fitness studio", "Strength & conditioning"],
  "Pubs & bars": ["Pub", "Cocktail bar", "Craft beer bar"],
  Pharmacies: ["Pharmacy", "Community pharmacy"],
  "Book shops": ["Book shop", "Independent bookseller"],
  "Convenience stores": ["Convenience store", "Grocery"],
};

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const SUFFIX = ["Lane", "House", "Yard", "Quarter", "Street", "Corner", "Works", "Room", "Collective", "& Co"];

function notableReason(rating: number | null, reviews: number | null, distance: number, rank: number): string {
  if (rating !== null && rating >= 4.7 && (reviews ?? 0) > 250) return "Exceptional ratings with a large review base";
  if ((reviews ?? 0) > 400) return "Highest review volume nearby — strong footfall";
  if (distance <= 0.3) return "Directly in your catchment — closest competitor";
  if (rating !== null && rating >= 4.5) return "Consistently strong reviews";
  if (rank < 8) return "Popular local choice with steady momentum";
  if ((reviews ?? 0) < 60) return "Newer entrant, still building reputation";
  return "Comparable offer at similar price point";
}

export function generateCompetitors(area: string, type: string, count = 20): MockCompetitor[] {
  const key = Object.keys(AREAS).find((a) => a.toLowerCase() === area.trim().toLowerCase());
  const base = key ? AREAS[key] : { lat: 53.6833, lng: -1.4977, streets: ["High Street", "Market Place", "Station Road", "Church Lane"] };
  const areaName = key ?? (area.trim() || "Wakefield");
  const words = TYPE_WORDS[type] ?? ["Trading", "Local", "Company"];
  const cats = CATEGORY_LABEL[type] ?? ["Local business"];
  const rnd = seeded(`${areaName}|${type}`);

  const list: MockCompetitor[] = [];
  const used = new Set<string>();
  for (let i = 0; list.length < count && i < count * 6; i++) {
    const name = `${PREFIX[Math.floor(rnd() * PREFIX.length)]} ${words[Math.floor(rnd() * words.length)]} ${
      SUFFIX[Math.floor(rnd() * SUFFIX.length)]
    }`;
    if (used.has(name)) continue;
    used.add(name);
    const street = base.streets[Math.floor(rnd() * base.streets.length)];
    const rating = rnd() > 0.06 ? Math.round((3.5 + rnd() * 1.5) * 10) / 10 : null;
    const reviews = rating === null ? null : Math.round(20 + rnd() * 520);
    const distanceMiles = Math.round((0.1 + rnd() * 2.6) * 10) / 10;
    list.push({
      id: `${areaName}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      category: cats[Math.floor(rnd() * cats.length)],
      area: areaName,
      address: `${Math.ceil(rnd() * 180)} ${street}, ${areaName}`,
      distanceMiles,
      rating,
      reviews,
      website: rnd() > 0.3 ? `https://${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.co.uk` : null,
      lat: base.lat + (rnd() - 0.5) * 0.03,
      lng: base.lng + (rnd() - 0.5) * 0.05,
      notable: "",
    });
  }

  // Rank: rating + review weight, closer is better.
  list.sort((a, b) => {
    const score = (c: MockCompetitor) => (c.rating ?? 3.5) * 12 + Math.log10((c.reviews ?? 10) + 1) * 8 - c.distanceMiles * 4;
    return score(b) - score(a);
  });

  return list.map((c, i) => ({ ...c, notable: notableReason(c.rating, c.reviews, c.distanceMiles, i) }));
}

/** Global name search across all mock areas + types (not restricted by area/category). */
export function searchAllCompetitors(query: string, limit = 12): MockCompetitor[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const pool: MockCompetitor[] = [];
  for (const area of Object.keys(AREAS)) {
    for (const type of BUSINESS_TYPES) {
      pool.push(...generateCompetitors(area, type, 8));
    }
  }
  return pool
    .filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.area.toLowerCase().includes(q))
    .slice(0, limit);
}
