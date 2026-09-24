// The 11 Found-r journey stages. Client-safe: definitions only.
// Progress is per-user and lives in the database (see journey.functions.ts).

export interface JourneyTask {
  key: string;
  label: string;
}

export interface JourneyStage {
  title: string;
  outputs: string[];
  ai: string[];
  tasks: JourneyTask[];
  ideas: string[];
}

const t = (key: string, label: string): JourneyTask => ({ key, label });

export const STAGES: JourneyStage[] = [
  {
    title: "Explore",
    outputs: ["Founder Readiness Score", "Founder Profile", "Recommended Industries"],
    ai: ["Founder Coach"],
    tasks: [
      t("skills", "List your skills, experience and strengths"),
      t("budget", "Set the money you could realistically invest"),
      t("time", "Decide how many hours a week you can commit"),
      t("goals", "Write down what success looks like in 3 years"),
      t("industries", "Shortlist 3 industries that interest you"),
    ],
    ideas: ["Talk to two local business owners about their first year", "Consider franchise vs independent routes"],
  },
  {
    title: "Discover Opportunities",
    outputs: ["Opportunity Shortlist", "Opportunity Rankings"],
    ai: ["Opportunity Engine"],
    tasks: [
      t("areas", "Pick 1–3 target towns or postcodes"),
      t("finder", "Run the Opportunity Finder for each idea"),
      t("shortlist", "Shortlist your top 3 opportunities"),
      t("rank", "Rank them by score and personal fit"),
    ],
    ideas: ["Try a blended concept (e.g. bookshop + wine bar)", "Compare areas with the Business Diversity Index"],
  },
  {
    title: "Validate Opportunity",
    outputs: ["Opportunity Score", "SWOT Analysis", "Viability Report", "Go / No-Go"],
    ai: ["Location Analyst", "Competitor Analyst", "Business Analyst"],
    tasks: [
      t("analysis", "Run a full Opportunity Analysis on your top choice"),
      t("competitors", "Review direct competitors nearby"),
      t("demand", "Check perceived demand vs competition"),
      t("swot", "Write a simple SWOT"),
      t("decision", "Make a Go / No-Go decision"),
    ],
    ideas: ["Visit competitors at peak times", "Run a quick survey or pop-up to test interest"],
  },
  {
    title: "Plan",
    outputs: ["Business Plan", "Funding Plan", "Launch Roadmap"],
    ai: ["Business Planner"],
    tasks: [
      t("model", "Define your offer, prices and target customer"),
      t("costs", "Estimate start-up and monthly running costs"),
      t("forecast", "Build a 12-month sales forecast"),
      t("plan", "Write your business plan"),
      t("roadmap", "Set a launch timeline with key dates"),
    ],
    ideas: ["Plan a best, expected and worst case", "Keep a 3-month cash buffer"],
  },
  {
    title: "Build Foundations",
    outputs: ["Company Setup Checklist", "Compliance Checklist"],
    ai: ["Compliance Advisor"],
    tasks: [
      t("structure", "Choose sole trader or limited company"),
      t("register", "Register with Companies House / HMRC"),
      t("bank", "Open a business bank account"),
      t("insurance", "Arrange business insurance"),
      t("licences", "Check licences and registrations you need"),
    ],
    ideas: ["Use accounting software from day one", "Book a free session with your local Growth Hub"],
  },
  {
    title: "Secure Funding",
    outputs: ["Funding Recommendations", "Finance Options"],
    ai: ["Funding Advisor"],
    tasks: [
      t("need", "Confirm how much funding you need"),
      t("options", "Compare loans, grants and investors"),
      t("apply", "Prepare and submit applications"),
      t("confirm", "Confirm funding is in place"),
    ],
    ideas: ["Look at the Start Up Loans scheme", "Check local council grants"],
  },
  {
    title: "Find Premises",
    outputs: ["Property Score", "Site Comparison Report"],
    ai: ["Location Selection Engine"],
    tasks: [
      t("requirements", "Set size, budget and feature requirements"),
      t("search", "Search and shortlist suitable premises"),
      t("view", "View at least 3 properties"),
      t("checks", "Check planning use class, lease and building condition"),
      t("sign", "Agree terms and sign the lease"),
    ],
    ideas: ["Ask about rent-free periods", "Get a solicitor to review the lease"],
  },
  {
    title: "Fit Out & Setup",
    outputs: ["Launch Readiness Score"],
    ai: ["Setup Advisor"],
    tasks: [
      t("design", "Plan the layout and fit-out"),
      t("quotes", "Get quotes from contractors"),
      t("equipment", "Order equipment and stock"),
      t("suppliers", "Set up suppliers and payment systems"),
      t("staff", "Recruit and train staff"),
    ],
    ideas: ["Buy quality second-hand equipment", "Build in a contingency for delays"],
  },
  {
    title: "Create Presence",
    outputs: ["Brand Pack", "Website Plan", "SEO Plan"],
    ai: ["Brand Advisor", "Marketing Advisor"],
    tasks: [
      t("brand", "Create your name, logo and brand colours"),
      t("website", "Launch a simple website"),
      t("google", "Set up your Google Business Profile"),
      t("social", "Create your social media accounts"),
    ],
    ideas: ["Share behind-the-scenes fit-out photos", "Claim your listing on local directories"],
  },
  {
    title: "Pre-Launch Marketing",
    outputs: ["Launch Campaign", "Social Content", "Marketing Calendar"],
    ai: ["Marketing Manager"],
    tasks: [
      t("campaign", "Plan your launch campaign"),
      t("calendar", "Create a 4-week content calendar"),
      t("list", "Start collecting emails or followers"),
      t("partners", "Reach out to local partners and press"),
    ],
    ideas: ["Offer a founding-customer discount", "Host a soft-launch evening"],
  },
  {
    title: "Launch",
    outputs: ["Launch Checklist", "Opening Dashboard"],
    ai: ["Launch Coach"],
    tasks: [
      t("softlaunch", "Run a soft launch and fix issues"),
      t("open", "Open your doors"),
      t("feedback", "Collect customer feedback in week one"),
      t("review", "Review your first month of numbers"),
    ],
    ideas: ["Ask happy customers for Google reviews", "Set up Competitor Intelligence to monitor your area"],
  },
];

export interface StageProgress {
  stageIndex: number;
  progress: number;
  status: string;
}

export interface TaskCheck {
  stageIndex: number;
  taskKey: string;
}

/** Checked-task keys per stage. */
export function checkedMap(rows: TaskCheck[]): Set<string>[] {
  const out = STAGES.map(() => new Set<string>());
  for (const r of rows) {
    const stage = STAGES[r.stageIndex];
    if (stage && stage.tasks.some((x) => x.key === r.taskKey)) out[r.stageIndex]!.add(r.taskKey);
  }
  return out;
}

export function stagePercent(stageIndex: number, checked: Set<string>): number {
  const total = STAGES[stageIndex]?.tasks.length ?? 0;
  if (total === 0) return 0;
  return Math.round((checked.size / total) * 100);
}

/** Overall = checked tasks / all required tasks across the journey. */
export function overallPercent(checked: Set<string>[]): number {
  const total = STAGES.reduce((s, st) => s + st.tasks.length, 0);
  if (total === 0) return 0;
  const done = checked.reduce((s, c) => s + c.size, 0);
  return Math.round((done / total) * 100);
}

// Legacy helpers (kept for other callers).
export function overallProgress(rows: StageProgress[]): number {
  const total = rows.reduce((s, r) => s + r.progress, 0);
  return Math.round(total / STAGES.length);
}

export function progressMap(rows: StageProgress[]): number[] {
  const out = STAGES.map(() => 0);
  for (const r of rows) if (r.stageIndex >= 0 && r.stageIndex < out.length) out[r.stageIndex] = r.progress;
  return out;
}
