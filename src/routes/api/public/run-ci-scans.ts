import { createFileRoute } from "@tanstack/react-router";

/**
 * Runs the weekly competitive intelligence scan for every monitored business.
 * Called by a scheduled job. Public prefix, so the caller is verified here
 * with the project apikey.
 */
export const Route = createFileRoute("/api/public/run-ci-scans")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        const expected = process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        if (!expected || key !== expected) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runScan } = await import("@/lib/ci/scan.server");

        const { data: businesses, error } = await supabaseAdmin.from("ci_businesses").select("*");
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        let scanned = 0;
        let failed = 0;
        for (const b of businesses ?? []) {
          try {
            await runScan(supabaseAdmin as never, b.user_id, {
              id: b.id,
              name: b.name,
              placeId: b.place_id,
              lat: b.lat,
              lng: b.lng,
              businessType: b.business_type,
              searchTerm: b.search_term,
              radiusMiles: Number(b.radius_miles),
            });
            scanned += 1;
          } catch (e) {
            failed += 1;
            console.error(`[CI] scheduled scan failed for ${b.id}:`, e);
          }
        }
        return Response.json({ ok: true, scanned, failed });
      },
    },
  },
});
