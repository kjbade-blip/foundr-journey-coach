import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/foundr/Logo";
import { setMode } from "@/lib/mode";
import { Rocket, TrendingUp, ArrowRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started · Found-r" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"start" | "grow" | null>(null);

  function choose(m: "start" | "grow") {
    setMode(m);
    navigate({ to: m === "start" ? "/app/dashboard" : "/discover" });
  }


  return (
    <div className="min-h-screen bg-hero-gradient">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-12 sm:px-6">
        <Logo className="h-10" />
        <div className="mt-10 w-full text-center">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">Which best describes you?</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">We'll tailor your dashboard, journey and AI advisors. You can switch modes anytime.</p>
        </div>
        <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
          {[
            { id: "start", icon: Rocket, title: "I want to start a business", body: "Discover opportunities, validate them with data, and follow an 11-stage launch roadmap." },
            { id: "grow",  icon: TrendingUp, title: "I already own a business", body: "Monitor competitors, react to market alerts, and let the AI Growth Advisor surface your next move." },
          ].map((c) => {
            const Icon = c.icon;
            const active = selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id as any)}
                onDoubleClick={() => choose(c.id as any)}
                className={`group text-left rounded-3xl border bg-card p-7 transition shadow-soft hover:-translate-y-0.5 ${active ? "border-brand-dark ring-2 ring-brand" : "border-border hover:border-brand-dark/30"}`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-brand-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-2xl font-bold">{c.title}</h3>
                <p className="mt-2 text-muted-foreground">{c.body}</p>
              </button>
            );
          })}
        </div>
        <button
          disabled={!selected}
          onClick={() => selected && choose(selected)}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-dark px-7 py-3.5 text-base font-semibold text-white disabled:opacity-40"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
