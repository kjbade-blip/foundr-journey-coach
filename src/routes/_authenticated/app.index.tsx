import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const m = window.localStorage.getItem("foundr.mode");
      throw redirect({ to: m === "grow" ? "/app/grow" : "/app/dashboard" });
    }
    throw redirect({ to: "/app/dashboard" });
  },
});
