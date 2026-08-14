import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/foundr/Logo";
import { getMode, setMode, type Mode } from "@/lib/mode";
import {
  LayoutDashboard, Compass, Map, FileText, Store, GraduationCap,
  TrendingUp, Radar, Bell, Sparkles, Users, Search, Menu, X, ChevronDown, Bot, BarChart3, Building2,
  Settings, LogOut
} from "lucide-react";
import { FoundrAI } from "@/components/foundr/FoundrAI";
import { useAuth } from "@/features/auth/auth-context";
import { initialsFor } from "@/features/auth/profile";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

const START_NAV = [
  { to: "/app/dashboard",          label: "Dashboard",          icon: LayoutDashboard },
  { to: "/app/journey",            label: "My Journey",         icon: Map },
  { to: "/app/opportunity-finder", label: "Opportunity Finder", icon: Compass },
  { to: "/app/location-analysis",  label: "Location Analysis",   icon: BarChart3 },
  { to: "/app/bdi-compare",        label: "BDI Compare",        icon: BarChart3 },
  { to: "/app/reports",            label: "Reports",            icon: FileText },
  { to: "/app/marketplace",        label: "Marketplace",        icon: Store },
  { to: "/app/learning",           label: "Learning Centre",    icon: GraduationCap },
] as const;

const GROW_NAV = [
  { to: "/app/grow",             label: "Growth Dashboard",        icon: TrendingUp },
  { to: "/app/business-profile", label: "Business Profile",        icon: Building2 },
  { to: "/app/intelligence",  label: "Competitive Intelligence", icon: Radar },
  { to: "/app/competitors",  label: "Competitor Watchlist", icon: Radar },
  { to: "/app/location-analysis", label: "Location Analysis",  icon: BarChart3 },

  { to: "/app/bdi-compare",  label: "BDI Compare",           icon: BarChart3 },
  { to: "/app/alerts",       label: "Market Alerts",         icon: Bell },
  { to: "/app/advisor",      label: "AI Growth Advisor",     icon: Sparkles },
  { to: "/app/community",    label: "Community",             icon: Users },
  { to: "/app/marketplace",  label: "Marketplace",           icon: Store },
] as const;

function AppShell() {
  const navigate = useNavigate();
  const [mode, setLocalMode] = useState<Mode>("start");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const m = getMode();
    if (!m) { navigate({ to: "/onboarding" }); return; }
    setLocalMode(m);
    const handler = () => { const nm = getMode(); if (nm) setLocalMode(nm); };
    window.addEventListener("foundr:mode", handler);
    return () => window.removeEventListener("foundr:mode", handler);
  }, [navigate]);

  const nav = mode === "start" ? START_NAV : GROW_NAV;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setOpen(!open)} className="lg:hidden -ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-muted">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-[38px]" />
          </Link>
          <div className="ml-4 hidden flex-1 max-w-xl md:flex">
            <div className="flex w-full items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <input className="w-full bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Search businesses, postcodes, suppliers…" />
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">⌘K</kbd>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ModeSwitcher mode={mode} onChange={(m) => { setMode(m); setLocalMode(m); navigate({ to: m === "start" ? "/app/dashboard" : "/app/grow" }); }} />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        {/* Sidebar */}
        <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-16 left-0 z-20 w-72 border-r border-border bg-card p-4 transition lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0`}>
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} Icon={item.icon} onClick={() => setOpen(false)} />
            ))}
          </nav>
          <div className="mt-6 rounded-2xl border border-border bg-gradient-to-br from-accent to-card p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
              <Bot className="h-3.5 w-3.5" /> Found-r AI
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Your AI advisor is monitoring your journey for the next best action.</p>
          </div>
        </aside>

        {/* Main */}
        <main className="min-h-[calc(100vh-4rem)] flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>

      <FoundrAI />
    </div>
  );
}

function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const name = profile?.full_name ?? profile?.email ?? user?.email ?? "Your account";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-brand text-sm font-bold text-brand-foreground"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initialsFor(profile, user?.email)
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-pop">
          <div className="border-b border-border px-4 py-3">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{profile?.email ?? user?.email}</div>
          </div>
          <Link
            to="/app/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"
          >
            <Settings className="h-4 w-4" /> Account settings
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              void signOut().then(() => navigate({ to: "/login", replace: true }));
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function NavItem({ to, label, Icon, onClick }: { to: string; label: string; Icon: any; onClick: () => void }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-brand-dark text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      <Icon className={`h-4.5 w-4.5 ${active ? "text-brand" : ""}`} />
      <span>{label}</span>
    </Link>
  );
}

function ModeSwitcher({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
        <span className="hidden sm:inline">{mode === "start" ? "Start a Business" : "Grow My Business"}</span>
        <span className="sm:hidden">{mode === "start" ? "Start" : "Grow"}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-pop">
          {[
            { id: "start", label: "Start a Business" },
            { id: "grow", label: "Grow My Business" },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => { onChange(o.id as Mode); setOpen(false); }}
              className={`block w-full px-4 py-2.5 text-left text-sm ${mode === o.id ? "bg-accent text-foreground font-semibold" : "hover:bg-muted"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
