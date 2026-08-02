-- Roles (needed for admin access on claims)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Business ownership claims
CREATE TABLE IF NOT EXISTS public.business_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id text NOT NULL,
  business_name text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  verification_method text,
  verification_status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

-- Only one verified owner per business
CREATE UNIQUE INDEX IF NOT EXISTS business_claims_one_verified_owner
  ON public.business_claims (business_id)
  WHERE status = 'verified';

CREATE INDEX IF NOT EXISTS business_claims_user_idx ON public.business_claims (user_id);

GRANT SELECT, INSERT, UPDATE ON public.business_claims TO authenticated;
GRANT ALL ON public.business_claims TO service_role;
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own claims" ON public.business_claims
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own claims" ON public.business_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own pending claim" ON public.business_claims
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims" ON public.business_claims
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all claims" ON public.business_claims
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_business_claims_updated_at
  BEFORE UPDATE ON public.business_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Immutable verification attempt history
CREATE TABLE IF NOT EXISTS public.business_claim_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.business_claims(id) ON DELETE CASCADE,
  verification_type text NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending',
  verification_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_claim_verifications_claim_idx
  ON public.business_claim_verifications (claim_id, created_at DESC);

GRANT SELECT ON public.business_claim_verifications TO authenticated;
GRANT ALL ON public.business_claim_verifications TO service_role;
ALTER TABLE public.business_claim_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claim verifications" ON public.business_claim_verifications
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.business_claims c
      WHERE c.id = claim_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all claim verifications" ON public.business_claim_verifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
