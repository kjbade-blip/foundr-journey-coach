import { useEffect, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";

export function VerificationSuccess({ businessName, onDone }: { businessName: string; onDone: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 30);
    const d = setTimeout(onDone, 2600);
    return () => { clearTimeout(t); clearTimeout(d); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 backdrop-blur-sm">
      <div
        className={`flex flex-col items-center px-6 text-center transition-all duration-700 ${shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
      >
        <span className="relative grid h-28 w-28 place-items-center rounded-full bg-[color:var(--success)]/12">
          <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--success)]/20" />
          <Check className="h-14 w-14 text-[color:var(--success)]" strokeWidth={3} />
        </span>
        <h2 className="mt-8 text-3xl font-extrabold tracking-tight sm:text-4xl">Business Verified</h2>
        <p className="mt-3 max-w-md text-muted-foreground">
          You've successfully verified ownership of <strong>{businessName}</strong>. All business management features are now unlocked.
        </p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--success)]/12 px-4 py-2 text-sm font-bold text-[color:var(--success)]">
          <ShieldCheck className="h-4 w-4" /> Verified Business
        </span>
      </div>
    </div>
  );
}
