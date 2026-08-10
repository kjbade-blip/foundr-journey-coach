import { createFileRoute } from "@tanstack/react-router";

/**
 * Refreshes the fixed crime reference areas used to benchmark any analysed
 * location. Called monthly by a scheduled job once the Home Office publishes
 * a new month of street-level crime data.
 *
 * Public prefix, so the caller is verified here with the project apikey.
 */
export const Route = createFileRoute("/api/public/refresh-crime-benchmarks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        const expected =
          process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        if (!expected || key !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { refreshReferenceAreas } = await import("@/lib/crime/profile.server");
        try {
          const result = await refreshReferenceAreas();
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("[Crime] benchmark refresh failed:", error);
          return Response.json({ ok: false, error: "refresh failed" }, { status: 500 });
        }
      },
    },
  },
});
