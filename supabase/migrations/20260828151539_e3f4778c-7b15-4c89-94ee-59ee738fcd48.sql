
CREATE TABLE public.user_businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_number TEXT,
  address TEXT,
  postcode TEXT,
  status TEXT,
  industry TEXT,
  website TEXT,
  place_id TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_businesses TO authenticated;
GRANT ALL ON public.user_businesses TO service_role;

ALTER TABLE public.user_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own businesses" ON public.user_businesses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX user_businesses_user_id_idx ON public.user_businesses(user_id);

CREATE TRIGGER user_businesses_updated_at
  BEFORE UPDATE ON public.user_businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_path TEXT CHECK (onboarding_path IN ('open_business','grow_business')),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS role_title TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS x_url TEXT,
  ADD COLUMN IF NOT EXISTS other_url TEXT,
  ADD COLUMN IF NOT EXISTS active_business_id UUID REFERENCES public.user_businesses(id) ON DELETE SET NULL;
