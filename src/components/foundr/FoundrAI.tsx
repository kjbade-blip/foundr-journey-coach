import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Sparkles } from "lucide-react";

type Msg = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "What's my next best action?",
  "Find me a coffee shop opportunity in SW11",
  "How do I validate my idea?",
  "Show competitor risks near me",
];

const SCRIPTED: Record<string, string> = {
  "next": "Based on your journey, the next best action is to complete your Founder Readiness Score in the Explore stage — it takes about 4 minutes and unlocks tailored opportunities.",
  "coffee": "I can run an Opportunity Finder for speciality coffee in SW11. Expected Opportunity Score: 84/100 with weak premium-coffee supply and strong daytime footfall. Want me to draft the full report?",
  "validate": "I'll trigger the Location, Competitor and Business Analysts and synthesise an Opportunity Score, SWOT and Go/No-Go in under 60 seconds.",
  "competitor": "Two competitors within 0.4mi added Sunday brunch this month and one is hiring two baristas — a signal of expansion. Want me to draft a counter-offer?",
};

function reply(q: string) {
  const k = Object.keys(SCRIPTED).find((k) => q.toLowerCase().includes(k));
  return k ? SCRIPTED[k] : "Good question — I'll pull the relevant data, run the right specialist agent and come back with a defensible answer plus the next best action.";
}

export function FoundrAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Hi, I'm Found-r AI. Ask me anything about your journey, market, competitors or next steps." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [msgs, open]);

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setTimeout(() => setMsgs((m) => [...m, { role: "ai", text: reply(t) }]), 450);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-3 text-sm font-semibold text-white shadow-pop transition hover:scale-[1.02]"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-brand-foreground"><Bot className="h-3.5 w-3.5" /></span>
        Ask Found-r AI
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex h-[640px] max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-pop">
            <div className="flex items-center justify-between border-b border-border bg-brand-dark px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-foreground"><Sparkles className="h-4 w-4" /></span>
                <div>
                  <div className="text-sm font-bold">Found-r AI</div>
                  <div className="text-xs text-white/60">Your persistent business advisor</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-brand-dark text-white" : "bg-muted text-foreground"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-muted">
                    {s}
                  </button>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Found-r AI…" className="w-full bg-transparent text-sm outline-none" />
                <button type="submit" className="grid h-8 w-8 place-items-center rounded-full bg-brand text-brand-foreground"><Send className="h-4 w-4" /></button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
