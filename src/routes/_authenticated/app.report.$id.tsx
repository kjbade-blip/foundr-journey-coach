import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/foundr/ui";
import { OpportunityReport } from "@/components/foundr/opportunity/OpportunityReport";
import { getOpportunityAnalysis } from "@/lib/opportunity.functions";

export const Route = createFileRoute("/_authenticated/app/report/$id")({
  head: () => ({
    meta: [
      { title: "Opportunity Report · Found-r" },
      { name: "description", content: "View a saved Opportunity Analysis with every figure sourced." },
      { property: "og:title", content: "Opportunity Report · Found-r" },
      { property: "og:description", content: "View a saved Opportunity Analysis with every figure sourced." },
    ],
  }),
  component: ReportView,
});

function ReportView() {
  const { id } = Route.useParams();
  const fn = useServerFn(getOpportunityAnalysis);
  const { data, isLoading, isError } = useQuery({ queryKey: ["opportunity-analysis", id], queryFn: () => fn({ data: { id } }) });
  return (
    <div>
      <Link to="/app/reports" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All reports
      </Link>
      <PageHeader eyebrow="Opportunity Report" title={data ? `${data.location?.displayName ?? ""}`.trim() || "Saved analysis" : "Saved analysis"} />
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading report…</div>
      ) : isError || !data ? (
        <p className="text-sm text-muted-foreground">This report couldn't be found or has no saved analysis.</p>
      ) : (
        <OpportunityReport analysis={data} />
      )}
    </div>
  );
}
