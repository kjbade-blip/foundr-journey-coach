import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listAnalyses from "./tools/list-analyses";
import getAnalysis from "./tools/get-analysis";
import journeyProgress from "./tools/journey-progress";
import competitorChanges from "./tools/competitor-changes";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "found-r",
  title: "Found-r",
  version: "0.1.0",
  instructions:
    "Tools for Found-r, a UK business intelligence platform. Read the signed-in user's saved location opportunity analyses, their business journey progress, and detected competitor changes. Every figure returned is sourced from published data — never invent or estimate statistics on top of these results.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listAnalyses, getAnalysis, journeyProgress, competitorChanges],
});
