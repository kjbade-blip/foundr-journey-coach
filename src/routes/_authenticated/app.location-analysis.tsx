import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

// Location Analysis now lives inside Opportunity Finder; keep old links working.
export const Route = createFileRoute("/_authenticated/app/location-analysis")({
  validateSearch: z.object({ q: z.string().optional(), type: z.string().optional() }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/app/opportunity-finder",
      search: { ...(search.q ? { location: search.q } : {}), ...(search.type ? { type: search.type } : {}) },
      replace: true,
    });
  },
});
