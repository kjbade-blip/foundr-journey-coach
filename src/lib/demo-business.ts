// Demo / test businesses used to showcase the "claim my business" flow.
// These are synthetic listings (not real Google Places) so ownership verification
// can be demonstrated end-to-end without touching a real business profile.
import type { PlaceDetails } from "./business-profile";

export const DEMO_OWNER_EMAIL = "kj.bade@gmail.com";
/** Fixed one-time code for demo listings (no real email/SMS is sent). */
export const DEMO_CODE = "123456";

export const DEMO_PLACE_ID = "demo-kristians-coffee-horbury";
export const DEMO_PHONE = "+44 1924 264821";

export const SOFIAS_PLACE_ID = "demo-sofias-dog-grooming-horbury";
export const SOFIAS_PHONE = "+44 1924 264822";

export const MOLLIES_PLACE_ID = "demo-mollies-nursery-horbury";
export const MOLLIES_PHONE = "+44 1924 264823";

export const DEMO_PLACE: PlaceDetails = {
  id: DEMO_PLACE_ID,
  name: "Kristian's Coffee",
  address: "27 High Street, Horbury, Wakefield WF4 5AA, UK",
  category: "Coffee Shop",
  rating: 4.7,
  reviews: 186,
  lat: 53.6604,
  lng: -1.5589,
  website: "https://kristians-coffee-ritual.base44.app",
  phone: DEMO_PHONE,
  openingHours: [
    "Monday: 7:30 AM – 4:00 PM",
    "Tuesday: 7:30 AM – 4:00 PM",
    "Wednesday: 7:30 AM – 4:00 PM",
    "Thursday: 7:30 AM – 4:00 PM",
    "Friday: 7:30 AM – 5:00 PM",
    "Saturday: 8:00 AM – 5:00 PM",
    "Sunday: 9:00 AM – 3:00 PM",
  ],
  categories: ["Coffee Shop", "Cafe", "Bakery", "Breakfast Restaurant"],
  status: "OPERATIONAL",
  photos: [],
  editorial:
    "Independent speciality coffee shop on Horbury high street serving single-origin espresso, brunch plates and house-baked pastries.",
  reviewSnippets: [
    "Best flat white in Wakefield — the staff always remember your order.",
    "Lovely little independent, the cinnamon buns sell out by lunchtime.",
    "Can get very busy on Saturday mornings but worth the wait.",
    "Great spot to work from, plenty of plugs and fast wifi.",
  ],
};

export const SOFIAS_PLACE: PlaceDetails = {
  id: SOFIAS_PLACE_ID,
  name: "Sofia's Dog Grooming",
  address: "41 High Street, Horbury, Wakefield WF4 5AB, UK",
  category: "Pet Groomer",
  rating: 4.9,
  reviews: 94,
  lat: 53.6607,
  lng: -1.5596,
  website: "https://sofia-gentle-groom.base44.app",
  phone: SOFIAS_PHONE,
  openingHours: [
    "Monday: Closed",
    "Tuesday: 8:30 AM – 5:00 PM",
    "Wednesday: 8:30 AM – 5:00 PM",
    "Thursday: 8:30 AM – 5:00 PM",
    "Friday: 8:30 AM – 5:00 PM",
    "Saturday: 9:00 AM – 3:00 PM",
    "Sunday: Closed",
  ],
  categories: ["Pet Groomer", "Dog Grooming", "Pet Care Service"],
  status: "OPERATIONAL",
  photos: [],
  editorial:
    "Independent dog grooming salon on Horbury high street offering gentle, low-stress grooming, hand-stripping, puppy introductions and de-shedding treatments.",
  reviewSnippets: [
    "Sofia is so calm with anxious dogs — our rescue actually enjoys going now.",
    "Best groom our cockapoo has ever had, and she smells amazing.",
    "Easy to book and always finishes on time.",
    "Lovely small salon, one dog at a time so it's never noisy.",
  ],
};

export const DEMO_PLACES: PlaceDetails[] = [DEMO_PLACE, SOFIAS_PLACE];

export function isDemoPlace(placeId: string | null | undefined) {
  return DEMO_PLACES.some((p) => p.id === placeId);
}

export function getDemoPlace(placeId: string | null | undefined): PlaceDetails | null {
  return DEMO_PLACES.find((p) => p.id === placeId) ?? null;
}

/** Contact channels used by the fixed-code demo verification flow. */
export function demoContacts(placeId: string) {
  const place = getDemoPlace(placeId);
  return { email: DEMO_OWNER_EMAIL, phone: place?.phone ?? DEMO_PHONE };
}

export function matchesDemoQuery(query: string) {
  return matchingDemoPlaces(query).length > 0;
}

/** Demo listings that should surface for a free-text business search. */
export function matchingDemoPlaces(query: string): PlaceDetails[] {
  const q = query.toLowerCase();
  const horbury = q.includes("horbury");
  const out: PlaceDetails[] = [];

  if (q.includes("kristian") || (horbury && (q.includes("coffee") || q.includes("cafe") || q.includes("café")))) {
    out.push(DEMO_PLACE);
  }
  if (
    q.includes("sofia") ||
    (horbury && (q.includes("groom") || q.includes("dog") || q.includes("pet")))
  ) {
    out.push(SOFIAS_PLACE);
  }
  return out;
}
