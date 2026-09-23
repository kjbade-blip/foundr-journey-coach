-- Replace USING (true) read policies on shared reference/cache tables with a
-- real predicate: only a genuinely authenticated session may read them.
-- Also make sure the anon role has no read access to these tables.

DROP POLICY IF EXISTS "Anyone signed in can read business market data" ON public.companies_house_areas;
CREATE POLICY "Signed-in users can read business market data"
  ON public.companies_house_areas FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.companies_house_areas FROM anon;

DROP POLICY IF EXISTS "Anyone signed in can read crime area months" ON public.crime_area_months;
CREATE POLICY "Signed-in users can read crime area months"
  ON public.crime_area_months FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.crime_area_months FROM anon;

DROP POLICY IF EXISTS "Anyone signed in can read crime weights" ON public.crime_business_weights;
CREATE POLICY "Signed-in users can read crime weights"
  ON public.crime_business_weights FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.crime_business_weights FROM anon;

DROP POLICY IF EXISTS "Anyone signed in can read crime categories" ON public.crime_categories;
CREATE POLICY "Signed-in users can read crime categories"
  ON public.crime_categories FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.crime_categories FROM anon;

DROP POLICY IF EXISTS "Anyone signed in can read reference areas" ON public.crime_reference_areas;
CREATE POLICY "Signed-in users can read reference areas"
  ON public.crime_reference_areas FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.crime_reference_areas FROM anon;

DROP POLICY IF EXISTS "Anyone signed in can read data sources" ON public.data_sources;
CREATE POLICY "Signed-in users can read data sources"
  ON public.data_sources FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.data_sources FROM anon;

DROP POLICY IF EXISTS "Anyone signed in can read location profiles" ON public.location_profiles;
CREATE POLICY "Signed-in users can read location profiles"
  ON public.location_profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.location_profiles FROM anon;

DROP POLICY IF EXISTS "Anyone signed in can read geographies" ON public.ons_geographies;
CREATE POLICY "Signed-in users can read geographies"
  ON public.ons_geographies FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.ons_geographies FROM anon;

DROP POLICY IF EXISTS "Anyone signed in can read observations" ON public.ons_observations;
CREATE POLICY "Signed-in users can read observations"
  ON public.ons_observations FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.ons_observations FROM anon;

GRANT SELECT ON public.companies_house_areas TO authenticated;
GRANT SELECT ON public.crime_area_months TO authenticated;
GRANT SELECT ON public.crime_business_weights TO authenticated;
GRANT SELECT ON public.crime_categories TO authenticated;
GRANT SELECT ON public.crime_reference_areas TO authenticated;
GRANT SELECT ON public.data_sources TO authenticated;
GRANT SELECT ON public.location_profiles TO authenticated;
GRANT SELECT ON public.ons_geographies TO authenticated;
GRANT SELECT ON public.ons_observations TO authenticated;