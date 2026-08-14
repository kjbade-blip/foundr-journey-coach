
CREATE TABLE public.ci_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  place_id TEXT,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'business',
  search_term TEXT,
  radius_miles NUMERIC NOT NULL DEFAULT 1,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ci_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.ci_businesses ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  place_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_m INTEGER,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'identified',
  source TEXT NOT NULL DEFAULT 'foundr',
  relevance INTEGER NOT NULL DEFAULT 50,
  competitor_score INTEGER,
  dismissed_reason TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ci_competitors_status_chk CHECK (status IN ('identified','tracked','dismissed','user_added','inactive')),
  CONSTRAINT ci_competitors_unique_place UNIQUE (business_id, place_id)
);
CREATE INDEX ci_competitors_business_idx ON public.ci_competitors (business_id, status);

CREATE TABLE public.ci_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES public.ci_competitors ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rating NUMERIC,
  reviews INTEGER,
  business_status TEXT,
  category TEXT,
  website TEXT,
  price_level TEXT,
  competitor_score INTEGER,
  opening_hours JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ci_snapshots_competitor_idx ON public.ci_snapshots (competitor_id, captured_at DESC);

CREATE TABLE public.ci_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.ci_businesses ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_competitors INTEGER NOT NULL DEFAULT 0,
  tracked_competitors INTEGER NOT NULL DEFAULT 0,
  new_competitors INTEGER NOT NULL DEFAULT 0,
  closed_competitors INTEGER NOT NULL DEFAULT 0,
  competition_score INTEGER,
  avg_rating NUMERIC,
  avg_reviews NUMERIC,
  market_density NUMERIC,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ci_scans_business_idx ON public.ci_scans (business_id, ran_at DESC);

CREATE TABLE public.ci_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.ci_businesses ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  competitor_id UUID REFERENCES public.ci_competitors ON DELETE CASCADE,
  scan_id UUID REFERENCES public.ci_scans ON DELETE SET NULL,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'informational',
  priority INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai JSONB,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ci_changes_severity_chk CHECK (severity IN ('critical','important','opportunity','informational'))
);
CREATE INDEX ci_changes_business_idx ON public.ci_changes (business_id, created_at DESC);

CREATE TABLE public.ci_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.ci_businesses ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  scan_id UUID REFERENCES public.ci_scans ON DELETE SET NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  what_we_found TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  what_to_consider JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence TEXT NOT NULL DEFAULT 'moderate',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ci_opportunities_business_idx ON public.ci_opportunities (business_id, created_at DESC);

CREATE TABLE public.ci_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  business_id UUID REFERENCES public.ci_businesses ON DELETE CASCADE,
  competitor_place_id TEXT,
  competitor_name TEXT,
  decision TEXT NOT NULL,
  reason TEXT,
  business_type TEXT,
  distance_m INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ci_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  business_id UUID REFERENCES public.ci_businesses ON DELETE CASCADE,
  new_competitors BOOLEAN NOT NULL DEFAULT true,
  major_changes BOOLEAN NOT NULL DEFAULT true,
  closures BOOLEAN NOT NULL DEFAULT true,
  opportunities BOOLEAN NOT NULL DEFAULT true,
  market_changes BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ci_alert_settings_unique UNIQUE (user_id, business_id),
  CONSTRAINT ci_alert_settings_freq_chk CHECK (frequency IN ('immediate','daily','weekly','off'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_competitors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_scans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_changes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_alert_settings TO authenticated;
GRANT ALL ON public.ci_businesses TO service_role;
GRANT ALL ON public.ci_competitors TO service_role;
GRANT ALL ON public.ci_snapshots TO service_role;
GRANT ALL ON public.ci_scans TO service_role;
GRANT ALL ON public.ci_changes TO service_role;
GRANT ALL ON public.ci_opportunities TO service_role;
GRANT ALL ON public.ci_decisions TO service_role;
GRANT ALL ON public.ci_alert_settings TO service_role;

ALTER TABLE public.ci_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ci_businesses" ON public.ci_businesses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own ci_competitors" ON public.ci_competitors FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own ci_snapshots" ON public.ci_snapshots FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own ci_scans" ON public.ci_scans FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own ci_changes" ON public.ci_changes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own ci_opportunities" ON public.ci_opportunities FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own ci_decisions" ON public.ci_decisions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own ci_alert_settings" ON public.ci_alert_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_ci_businesses_updated_at BEFORE UPDATE ON public.ci_businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ci_competitors_updated_at BEFORE UPDATE ON public.ci_competitors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ci_alert_settings_updated_at BEFORE UPDATE ON public.ci_alert_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
