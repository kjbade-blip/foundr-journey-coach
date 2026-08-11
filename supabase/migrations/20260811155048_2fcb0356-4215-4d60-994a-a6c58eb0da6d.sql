ALTER TABLE public.location_analyses
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS radius_miles double precision NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS confidence_score integer,
  ADD COLUMN IF NOT EXISTS confidence_reason text,
  ADD COLUMN IF NOT EXISTS verdict text,
  ADD COLUMN IF NOT EXISTS verdict_reason text,
  ADD COLUMN IF NOT EXISTS analysis jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.companies_house_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_key text NOT NULL UNIQUE,
  postcode_district text,
  latitude double precision,
  longitude double precision,
  radius_miles double precision NOT NULL DEFAULT 1,
  active_count integer NOT NULL DEFAULT 0,
  incorporated_12m integer NOT NULL DEFAULT 0,
  incorporated_3y integer NOT NULL DEFAULT 0,
  dissolved_12m integer NOT NULL DEFAULT 0,
  dissolved_3y integer NOT NULL DEFAULT 0,
  net_change_12m integer NOT NULL DEFAULT 0,
  median_age_years double precision,
  sample jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'Companies House public data API',
  source_url text NOT NULL DEFAULT 'https://developer.company-information.service.gov.uk/',
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  refresh_after timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.companies_house_areas TO authenticated;
GRANT ALL ON public.companies_house_areas TO service_role;
ALTER TABLE public.companies_house_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read business market data"
  ON public.companies_house_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Backend manages business market data"
  ON public.companies_house_areas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER update_companies_house_areas_updated_at
  BEFORE UPDATE ON public.companies_house_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_journey_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_index integer NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  progress integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, stage_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_journey_stages TO authenticated;
GRANT ALL ON public.user_journey_stages TO service_role;
ALTER TABLE public.user_journey_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journey progress"
  ON public.user_journey_stages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_journey_stages_updated_at
  BEFORE UPDATE ON public.user_journey_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();