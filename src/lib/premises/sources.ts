// Pluggable commercial-property source registry.
//
// Found-r never scrapes behind logins, paywalls, bot protection or robots.txt
// restrictions. A source is either:
//   * "feed"     — we hold an official API key, affiliate feed or licensed data
//                  provider credential, and we ingest structured listings; or
//   * "outbound" — we build a search link carrying the user's criteria and send
//                  the user to the portal.
//
// Enabling a source is a data-layer change only. The UI reads whatever the
// registry returns, so a source can be added, disabled or replaced without
// touching any component.

import type { PropertyRequirements, PropertySourceInfo } from "./types";

export interface SourceDefinition {
  id: string;
  name: string;
  homepage: string;
  /** Env var that, when present on the server, switches this source to a feed. */
  feedEnvVar: string | null;
  note: string;
  buildSearchUrl: (req: PropertyRequirements) => string | null;
}

function q(req: PropertyRequirements): string {
  return encodeURIComponent(req.location.trim());
}

export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  {
    id: "rightmove_commercial",
    name: "Rightmove Commercial",
    homepage: "https://www.rightmove.co.uk/commercial-property-to-let.html",
    feedEnvVar: "RIGHTMOVE_FEED_KEY",
    note: "Largest UK commercial to-let index. Structured access requires a Rightmove data agreement; until one is in place Found-r links you straight to the filtered search.",
    buildSearchUrl: (req) =>
      `https://www.rightmove.co.uk/commercial-property-to-let/${q(req)}.html?radius=${req.radiusMiles}`,
  },
  {
    id: "zoopla_commercial",
    name: "Zoopla Commercial",
    homepage: "https://www.zoopla.co.uk/commercial/to-let/",
    feedEnvVar: "ZOOPLA_API_KEY",
    note: "Zoopla's commercial to-let listings. Feed ingestion needs an approved Zoopla API key.",
    buildSearchUrl: (req) => `https://www.zoopla.co.uk/commercial/to-let/property/?q=${q(req)}`,
  },
  {
    id: "openrent",
    name: "OpenRent",
    homepage: "https://www.openrent.co.uk/",
    feedEnvVar: "OPENRENT_API_KEY",
    note: "Direct-from-landlord lettings. Useful for small mixed-use and studio units where an agent is not involved.",
    buildSearchUrl: (req) => `https://www.openrent.co.uk/properties-to-rent/${q(req)}`,
  },
  {
    id: "novaloca",
    name: "NovaLoca / agent listings",
    homepage: "https://www.novaloca.com/",
    feedEnvVar: "NOVALOCA_FEED_KEY",
    note: "Aggregates listings from independent commercial agents, including units never advertised on consumer portals.",
    buildSearchUrl: (req) => `https://www.novaloca.com/commercial-property/search?location=${q(req)}`,
  },
  {
    id: "local_authority",
    name: "Local authority & town-centre schemes",
    homepage: "https://www.gov.uk/find-local-council",
    feedEnvVar: null,
    note: "Councils often hold their own vacant-unit registers, meanwhile-use schemes and rate-relief offers that never reach the portals.",
    buildSearchUrl: (req) =>
      `https://www.google.com/search?q=${encodeURIComponent(`${req.location} council commercial units to let vacant premises register`)}`,
  },
  {
    id: "agent_search",
    name: "Local commercial agents",
    homepage: "https://www.google.com/",
    feedEnvVar: null,
    note: "A public web search for agents covering your area. Many will have unlisted stock and will register your requirement.",
    buildSearchUrl: (req) =>
      `https://www.google.com/search?q=${encodeURIComponent(`commercial property to let ${req.location} agents`)}`,
  },
];

export function sourceInfoFor(req: PropertyRequirements, enabledFeeds: string[] = []): PropertySourceInfo[] {
  return SOURCE_DEFINITIONS.map((s) => ({
    id: s.id,
    name: s.name,
    homepage: s.homepage,
    mode: enabledFeeds.includes(s.id) ? ("feed" as const) : ("outbound" as const),
    enabled: true,
    note: s.note,
    searchUrl: s.buildSearchUrl(req),
  }));
}
