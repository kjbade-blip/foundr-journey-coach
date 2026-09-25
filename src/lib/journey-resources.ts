// Per-stage tools, marketplace categories and learning topics for My Journey.
// Client-safe definitions only.

export type StageTool = "opportunity-finder" | "bdi-compare" | "premises" | "location-analysis";

export interface Partner {
  name: string;
  cat: string;
  tag: string;
  rating: number;
  reviews: number;
  price: string;
}

// Sample marketplace listings (illustrative, not live partner data).
export const PARTNERS: Partner[] = [
  { name: "Ledger & Co", cat: "Accountants", tag: "Small business specialists", rating: 4.9, reviews: 312, price: "From £79/mo" },
  { name: "BrightBank", cat: "Banks", tag: "Free business account", rating: 4.7, reviews: 1240, price: "£0 setup" },
  { name: "ShieldSure", cat: "Insurers", tag: "Hospitality & retail cover", rating: 4.8, reviews: 521, price: "From £24/mo" },
  { name: "GrowthLab", cat: "Marketing", tag: "Local SEO + paid social", rating: 4.6, reviews: 188, price: "From £950/mo" },
  { name: "Cornerstone Property", cat: "Commercial Agents", tag: "UK high-street units", rating: 4.5, reviews: 94, price: "Negotiated" },
  { name: "Stripe Terminal Pro", cat: "POS", tag: "Card readers + dashboards", rating: 4.9, reviews: 2200, price: "From £29/mo" },
  { name: "Watt&Wire", cat: "Utilities", tag: "Multi-site energy procurement", rating: 4.4, reviews: 76, price: "Free quote" },
  { name: "Found Talent", cat: "Recruiters", tag: "Hourly hospitality hiring", rating: 4.7, reviews: 405, price: "12% placement" },
];

export interface StageResources {
  tools: StageTool[];
  showReports: boolean;
  partnerCats: string[];
  videos: string[]; // topics; linked to a YouTube search
}

export const STAGE_RESOURCES: StageResources[] = [
  /* Explore */ { tools: [], showReports: true, partnerCats: ["Accountants"], videos: ["How to choose the right business to start UK", "Franchise vs independent business UK"] },
  /* Discover */ { tools: ["opportunity-finder", "bdi-compare"], showReports: true, partnerCats: [], videos: ["How to find a profitable local business idea", "Market research for a small business UK"] },
  /* Validate */ { tools: ["opportunity-finder", "bdi-compare", "location-analysis"], showReports: true, partnerCats: ["Accountants"], videos: ["How to validate a business idea", "How to do a SWOT analysis for a small business"] },
  /* Plan */ { tools: [], showReports: false, partnerCats: ["Accountants", "Finance"], videos: ["How to write a business plan UK", "Cash flow forecast for a new business"] },
  /* Foundations */ { tools: [], showReports: false, partnerCats: ["Solicitors", "Banks", "Insurers"], videos: ["Sole trader vs limited company UK", "How to register a company with Companies House"] },
  /* Funding */ { tools: [], showReports: false, partnerCats: ["Finance", "Banks"], videos: ["Start Up Loans UK explained", "How to get funding for a small business UK"] },
  /* Premises */ { tools: ["premises", "location-analysis"], showReports: false, partnerCats: ["Commercial Agents", "Solicitors"], videos: ["How to negotiate a commercial lease UK", "Business rates explained UK"] },
  /* Fit out */ { tools: [], showReports: false, partnerCats: ["POS", "Utilities"], videos: ["Shop fit out on a budget", "Choosing a POS system for a small business"] },
  /* Presence */ { tools: [], showReports: false, partnerCats: ["Web & SEO", "Marketing"], videos: ["Google Business Profile setup guide", "Local SEO for small businesses"] },
  /* Pre-launch */ { tools: [], showReports: false, partnerCats: ["Marketing", "Recruiters"], videos: ["Pre-launch marketing for a local business", "How to hire your first employee UK"] },
  /* Launch */ { tools: [], showReports: false, partnerCats: ["Marketing"], videos: ["Grand opening ideas for a small business", "First 90 days running a new business"] },
];

export const videoUrl = (topic: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`;
