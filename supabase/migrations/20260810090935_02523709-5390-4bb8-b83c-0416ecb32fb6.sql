CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
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
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Repoint policies to the private helper
DROP POLICY IF EXISTS "Admins can view all claim verifications" ON public.business_claim_verifications;
CREATE POLICY "Admins can view all claim verifications"
ON public.business_claim_verifications FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all claims" ON public.business_claims;
CREATE POLICY "Admins can view all claims"
ON public.business_claims FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update all claims" ON public.business_claims;
CREATE POLICY "Admins can update all claims"
ON public.business_claims FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);