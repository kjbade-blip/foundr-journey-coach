import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/foundr/ui";
import { MessageCircle, Award, Calendar, MapPin } from "lucide-react";
import { GoogleMap, type MapMarker } from "@/components/foundr/GoogleMap";

export const Route = createFileRoute("/_authenticated/app/community")({
  head: () => ({ meta: [{ title: "Community · Found-r" }] }),
  component: Community,
});

const POSTS = [
  { a: "Priya S.", role: "Cafe owner · SW11", t: "How are you handling milk price hikes?", r: 18, b: "Switched to a local dairy co-op — 9% cheaper and a great social story. AMA." },
  { a: "James O.", role: "Gym founder · M20", t: "Best POS for class bookings + retail?", r: 24, b: "Looking at TeamUp + Square. Anyone running both?" },
  { a: "Hana K.", role: "Bakery · LS6", t: "Tips for opening week marketing?", r: 41, b: "We're 3 weeks out — would love a checklist if anyone has one." },
];

const EVENTS = [
  { t: "Lambeth indie operators meetup", d: "Tue 24 Jun · 7pm", loc: "Brixton", lat: 51.4613, lng: -0.1156 },
  { t: "Battersea founders breakfast",   d: "Fri 27 Jun · 8am", loc: "Battersea", lat: 51.4761, lng: -0.1633 },
  { t: "Funding clinic with NatWest",    d: "Thu 26 Jun · 12pm", loc: "Online" },
  { t: "Local SEO workshop",             d: "Wed 2 Jul · 10am", loc: "Online" },
];

function Community() {
  return (
    <div>
      <PageHeader eyebrow="Community" title="Operators helping operators." subtitle="Forums, industry groups, local meetups and expert recognition." />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          {POSTS.map((p) => (
            <Card key={p.t}>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand text-sm font-bold text-brand-foreground">{p.a[0]}</div>
                <div>
                  <div className="font-semibold">{p.a}</div>
                  <div className="text-xs text-muted-foreground">{p.role}</div>
                </div>
                <Pill tone="brand"><Award className="mr-1 h-3 w-3" /> Expert</Pill>
              </div>
              <h3 className="mt-3 font-bold">{p.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.b}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {p.r} replies</span>
                <button className="ml-auto rounded-full bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white">Reply</button>
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border p-4 text-xs font-bold uppercase tracking-wider text-brand-dark">In-person events near you</div>
            <div className="h-[220px] w-full bg-muted">
              <GoogleMap
                center={{ lat: 51.4690, lng: -0.1400 }}
                zoom={12}
                markers={EVENTS.filter((e) => e.lat && e.lng).map((e, i) => ({
                  lat: e.lat!, lng: e.lng!, label: String(i + 1), title: `${e.t} · ${e.loc}`,
                }))}
                className="h-full w-full"
              />
            </div>
          </Card>
          <Card>
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Upcoming events</div>
            <ul className="mt-3 space-y-3">
              {EVENTS.map((e) => (
                <li key={e.t} className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent"><Calendar className="h-4 w-4 text-brand-dark" /></div>
                  <div>
                    <div className="text-sm font-semibold">{e.t}</div>
                    <div className="text-xs text-muted-foreground">{e.d} · <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.loc}</span></div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Your reputation</div>
            <div className="mt-3 text-4xl font-extrabold">428</div>
            <div className="text-sm text-muted-foreground">Top 8% of operators in Lambeth</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="brand">Helpful</Pill>
              <Pill tone="good">Validator</Pill>
              <Pill>First post</Pill>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
