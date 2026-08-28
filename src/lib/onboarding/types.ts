export type OnboardingPath = "open_business" | "grow_business";

export interface ActiveBusiness {
  id: string;
  name: string;
  companyNumber: string | null;
  address: string | null;
  postcode: string | null;
  status: string | null;
  industry: string | null;
  website: string | null;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
}

export interface OnboardingProfile {
  path: OnboardingPath | null;
  completedAt: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  postcode: string;
  roleTitle: string;
  linkedinUrl: string;
  websiteUrl: string;
  instagramUrl: string;
  xUrl: string;
  otherUrl: string;
}

export interface OnboardingState {
  profile: OnboardingProfile;
  activeBusiness: ActiveBusiness | null;
}

/** One candidate returned by the business finder. */
export interface BusinessMatch {
  key: string;
  name: string;
  address: string | null;
  postcode: string | null;
  companyNumber: string | null;
  status: string | null;
  industry: string | null;
  website: string | null;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "companies_house" | "places";
}
