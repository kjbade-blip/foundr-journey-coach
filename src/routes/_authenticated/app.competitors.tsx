import { createFileRoute, redirect } from "@tanstack/react-router";

// The Competitor Watchlist has been merged into Competitor Intelligence.
export const Route = createFileRoute("/_authenticated/app/competitors")({
  beforeLoad: () => {
    throw redirect({ to: "/app/intelligence" });
  },
});
