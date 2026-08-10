-- 1. Data source register
CREATE TABLE public.data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.data_sources TO authenticated;
GRANT ALL ON public.data_sources TO service_role;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read data sources" ON public.data_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Backend manages data sources" ON public.data_sources FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Resolved ONS geographies
CREATE TABLE public.ons_geographies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  geography_type TEXT NOT NULL,
  geography_code TEXT NOT NULL,
  name TEXT NOT NULL,
  country TEXT,
  region TEXT,
  parent_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (geography_type, geography_code)
);
GRANT SELECT ON public.ons_geographies TO authenticated;
GRANT ALL ON public.ons_geographies TO service_role;
ALTER TABLE public.ons_geographies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read geographies" ON public.ons_geographies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Backend manages geographies" ON public.ons_geographies FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. ONS observations cache
CREATE TABLE public.ons_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  geography_type TEXT NOT NULL,
  geography_code TEXT NOT NULL,
  geography_name TEXT,
  metric TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'total',
  value DOUBLE PRECISION,
  unit TEXT,
  reference_period TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Office for National Statistics',
  source_url TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  refresh_after TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, geography_code, metric, category)
);
CREATE INDEX ons_observations_lookup_idx ON public.ons_observations (geography_code, dataset_id);
GRANT SELECT ON public.ons_observations TO authenticated;
GRANT ALL ON public.ons_observations TO service_role;
ALTER TABLE public.ons_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read observations" ON public.ons_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Backend manages observations" ON public.ons_observations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Location profiles
CREATE TABLE public.location_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  postcode TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  primary_geography_type TEXT NOT NULL,
  primary_geography_code TEXT NOT NULL,
  geographies JSONB NOT NULL DEFAULT '{}'::jsonb,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  unavailable JSONB NOT NULL DEFAULT '[]'::jsonb,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  refresh_after TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.location_profiles TO authenticated;
GRANT ALL ON public.location_profiles TO service_role;
ALTER TABLE public.location_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read location profiles" ON public.location_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Backend manages location profiles" ON public.location_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Saved analyses (per user)
CREATE TABLE public.location_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_profile_id UUID REFERENCES public.location_profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  business_type TEXT,
  overall_score INTEGER,
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX location_analyses_user_idx ON public.location_analyses (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_analyses TO authenticated;
GRANT ALL ON public.location_analyses TO service_role;
ALTER TABLE public.location_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own analyses" ON public.location_analyses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Timestamp triggers
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON public.data_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ons_geographies_updated_at BEFORE UPDATE ON public.ons_geographies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ons_observations_updated_at BEFORE UPDATE ON public.ons_observations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_location_profiles_updated_at BEFORE UPDATE ON public.location_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_location_analyses_updated_at BEFORE UPDATE ON public.location_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the source register
INSERT INTO public.data_sources (key, name, provider, url, description) VALUES
  ('ons_census_2021', 'Census 2021', 'Office for National Statistics', 'https://www.ons.gov.uk/census', 'Census 2021 topic summary tables for England and Wales, accessed via the ONS Nomis API.'),
  ('ons_population_estimates', 'Mid-year population estimates', 'Office for National Statistics', 'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates', 'Official mid-year population estimates by local authority.'),
  ('ons_ashe', 'Annual Survey of Hours and Earnings', 'Office for National Statistics', 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours', 'Gross weekly pay for residents, by local authority.'),
  ('ons_postcode_lookup', 'ONS Postcode Directory', 'Office for National Statistics', 'https://geoportal.statistics.gov.uk/', 'Postcode to statistical geography lookup (country, region, local authority, ward, MSOA, LSOA).'),
  ('google_places', 'Google Places', 'Google', 'https://developers.google.com/maps/documentation/places', 'Competitor and business location data. Not an ONS source.')
ON CONFLICT (key) DO NOTHING;