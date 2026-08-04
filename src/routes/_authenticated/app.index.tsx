import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const m = window.localStorage.getItem("foundr.mode");
      throw redirect({ to: m === "grow" ? "/app/grow" : "/app/dashboard" });
    }
    throw redirect({ to: "/app/dashboard" });
  },
});
