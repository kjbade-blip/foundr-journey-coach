-- Crime categories (police.uk taxonomy)
CREATE TABLE public.crime_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  business_relevance text,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.crime_categories TO authenticated;
GRANT ALL ON public.crime_categories TO service_role;
ALTER TABLE public.crime_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read crime categories" ON public.crime_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Backend manages crime categories" ON public.crime_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER update_crime_categories_updated_at BEFORE UPDATE ON public.crime_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cached monthly crime counts for a circular area (police.uk street-level API)
CREATE TABLE public.crime_area_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_key text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_miles double precision NOT NULL DEFAULT 1,
  month text NOT NULL,
  total integer NOT NULL DEFAULT 0,
  by_category jsonb NOT NULL DEFAULT '{}'::jsonb,
  lsoa_code text,
  local_authority_code text,
  region_code text,
  source text NOT NULL DEFAULT 'Police.uk street-level crime API (Home Office)',
  source_url text NOT NULL DEFAULT 'https://data.police.uk/docs/method/crime-street/',
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  refresh_after timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (area_key, month)
);
CREATE INDEX crime_area_months_area_idx ON public.crime_area_months (area_key, month DESC);
GRANT SELECT ON public.crime_area_months TO authenticated;
GRANT ALL ON public.crime_area_months TO service_role;
ALTER TABLE public.crime_area_months ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read crime area months" ON public.crime_area_months FOR SELECT TO authenticated USING (true);
CREATE POLICY "Backend manages crime area months" ON public.crime_area_months FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER update_crime_area_months_updated_at BEFORE UPDATE ON public.crime_area_months FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Business-type relevance weights per crime category
CREATE TABLE public.crime_business_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_key text NOT NULL,
  category_slug text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_key, category_slug)
);
GRANT SELECT ON public.crime_business_weights TO authenticated;
GRANT ALL ON public.crime_business_weights TO service_role;
ALTER TABLE public.crime_business_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read crime weights" ON public.crime_business_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Backend manages crime weights" ON public.crime_business_weights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER update_crime_business_weights_updated_at BEFORE UPDATE ON public.crime_business_weights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fixed comparison areas measured with the identical method
CREATE TABLE public.crime_reference_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  area_type text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  population integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.crime_reference_areas TO authenticated;
GRANT ALL ON public.crime_reference_areas TO service_role;
ALTER TABLE public.crime_reference_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read reference areas" ON public.crime_reference_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Backend manages reference areas" ON public.crime_reference_areas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER update_crime_reference_areas_updated_at BEFORE UPDATE ON public.crime_reference_areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crime_reference_areas (key, name, area_type, latitude, longitude) VALUES
  ('london_city_centre', 'Central London (Covent Garden)', 'major city centre', 51.5117, -0.1240),
  ('manchester_centre', 'Manchester city centre', 'major city centre', 53.4794, -2.2453),
  ('birmingham_centre', 'Birmingham city centre', 'major city centre', 52.4796, -1.9026),
  ('leeds_centre', 'Leeds city centre', 'major city centre', 53.7965, -1.5478),
  ('bristol_centre', 'Bristol city centre', 'major city centre', 51.4536, -2.5975),
  ('cardiff_centre', 'Cardiff city centre', 'major city centre', 51.4816, -3.1791),
  ('reading_town', 'Reading town centre', 'town centre', 51.4551, -0.9787),
  ('york_town', 'York city centre', 'town centre', 53.9590, -1.0815),
  ('harrogate_town', 'Harrogate town centre', 'market town', 53.9925, -1.5418),
  ('bury_st_edmunds', 'Bury St Edmunds', 'market town', 52.2456, 0.7113),
  ('solihull_suburb', 'Solihull (suburban)', 'suburb', 52.4118, -1.7776),
  ('sutton_suburb', 'Sutton, London (suburban)', 'suburb', 51.3618, -0.1945),
  ('didsbury_suburb', 'Didsbury, Manchester (suburban)', 'suburb', 53.4180, -2.2310),
  ('keswick_rural', 'Keswick, Cumbria (rural)', 'rural', 54.6013, -3.1347),
  ('hay_on_wye_rural', 'Hay-on-Wye (rural)', 'rural', 52.0757, -3.1272);

INSERT INTO public.crime_categories (slug, name, business_relevance, sort_order) VALUES
  ('anti-social-behaviour', 'Anti-social behaviour', 'Affects customer comfort, dwell time and evening trade.', 10),
  ('bicycle-theft', 'Bicycle theft', 'Relevant where customers or staff arrive by bike.', 20),
  ('burglary', 'Burglary', 'Direct risk to stock, equipment and premises security costs.', 30),
  ('criminal-damage-arson', 'Criminal damage and arson', 'Shopfront and property damage; affects insurance premiums.', 40),
  ('drugs', 'Drugs', 'Contextual indicator of street environment.', 50),
  ('other-theft', 'Other theft', 'General theft risk to property and customer belongings.', 60),
  ('possession-of-weapons', 'Possession of weapons', 'Staff safety consideration, particularly for late opening.', 70),
  ('public-order', 'Public order', 'Concentrated around night-time economy; affects staffing needs.', 80),
  ('robbery', 'Robbery', 'Serious risk for cash-handling and late-opening businesses.', 90),
  ('shoplifting', 'Shoplifting', 'The single largest direct loss risk for retail.', 100),
  ('theft-from-the-person', 'Theft from the person', 'Indicates busy footfall areas with pickpocketing risk.', 110),
  ('vehicle-crime', 'Vehicle crime', 'Affects customer parking confidence and delivery vehicles.', 120),
  ('violent-crime', 'Violence and sexual offences', 'Staff safety, especially for evening and late-night trading.', 130),
  ('other-crime', 'Other crime', 'Residual police-recorded categories.', 140);