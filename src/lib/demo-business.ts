// Demo / test business used to showcase the "claim my business" flow.
// It is a synthetic listing (not a real Google Place) so ownership verification
// can be demonstrated end-to-end without touching a real business profile.
import type { PlaceDetails } from "./business-profile";

export const DEMO_PLACE_ID = "demo-kristians-coffee-horbury";
export const DEMO_OWNER_EMAIL = "kj.bade@gmail.com";
export const DEMO_PHONE = "+44 1924 264821";
/** Fixed one-time code for the demo listing (no real email/SMS is sent). */
export const DEMO_CODE = "123456";

export function isDemoPlace(placeId: string | null | undefined) {
  return placeId === DEMO_PLACE_ID;
}

export function matchesDemoQuery(query: string) {
  const q = query.toLowerCase();
  return (
    q.includes("kristian") ||
    (q.includes("horbury") && (q.includes("coffee") || q.includes("cafe") || q.includes("café")))
  );
}

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
