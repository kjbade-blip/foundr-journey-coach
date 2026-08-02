import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw } from "lucide-react";
import { clearProfile } from "@/lib/business-profile";
import { clearLocalVerification } from "@/lib/verification";
import { resetDemoBusiness } from "@/lib/verification.functions";

/**
 * One-click reset of the synthetic "Kristian's Coffee" demo listing so the
 * ownership claim flow can be tested end-to-end again from a clean slate.
 */
export function ResetDemoButton({
  className = "",
  label = "Reset demo listing",
  to = "/discover",
}: {
  className?: string;
  label?: string;
  to?: string;
}) {
  const navigate = useNavigate();
  const reset = useServerFn(resetDemoBusiness);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await reset({ data: {} });
    } catch {
      /* still clear local state so the flow can be retried */
    }
    clearProfile();
    clearLocalVerification();
    setBusy(false);
    void navigate({ to });
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${className}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      {busy ? "Resetting…" : label}
    </button>
  );
}
