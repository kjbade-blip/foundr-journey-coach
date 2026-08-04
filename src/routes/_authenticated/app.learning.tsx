import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/foundr/ui";
import { PlayCircle, BookOpen, Clock } from "lucide-react";

export const Route = createFileRoute("/app/learning")({
  head: () => ({ meta: [{ title: "Learning Centre · Found-r" }] }),
  component: Learning,
});

const COURSES = [
  { t: "Validating a brick-and-mortar idea", d: "6 lessons · 42 min", level: "Beginner" },
  { t: "Reading an Opportunity Report", d: "4 lessons · 28 min", level: "Beginner" },
  { t: "Negotiating a commercial lease", d: "8 lessons · 1h 12m", level: "Intermediate" },
  { t: "Funding your first site", d: "10 lessons · 1h 35m", level: "Intermediate" },
  { t: "Local SEO for high-street shops", d: "7 lessons · 55 min", level: "Beginner" },
  { t: "Multi-site operating playbook", d: "12 lessons · 2h 10m", level: "Advanced" },
];

function Learning() {
  return (
    <div>
      <PageHeader eyebrow="Learning Centre" title="Operator-grade education." subtitle="Bite-sized courses, templates and live workshops from people who've actually opened the doors." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COURSES.map((c) => (
          <Card key={c.t}>
            <div className="grid h-32 place-items-center rounded-xl bg-gradient-to-br from-accent to-card text-brand-dark">
              <PlayCircle className="h-12 w-12" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Pill>{c.level}</Pill>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {c.d}</span>
            </div>
            <h3 className="mt-2 text-lg font-bold">{c.t}</h3>
            <button className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark hover:underline"><BookOpen className="h-4 w-4" /> Start course</button>
          </Card>
        ))}
      </div>
    </div>
  );
}
