-- Explicit backend-only write policies

-- business_claim_verifications
CREATE POLICY "Backend only writes claim verifications"
ON public.business_claim_verifications
FOR ALL TO service_role
USING (true) WITH CHECK (true);
GRANT ALL ON public.business_claim_verifications TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.business_claim_verifications FROM authenticated, anon;

-- user_roles: only admins/backend may assign roles
CREATE POLICY "Backend only manages roles"
ON public.user_roles
FOR ALL TO service_role
USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
GRANT ALL ON public.user_roles TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;

-- verification_audit_log
CREATE POLICY "Backend only writes audit log"
ON public.verification_audit_log
FOR ALL TO service_role
USING (true) WITH CHECK (true);
GRANT ALL ON public.verification_audit_log TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.verification_audit_log FROM authenticated, anon;

-- SECURITY DEFINER functions should not be directly callable via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- authenticated keeps EXECUTE on has_role only because RLS policies evaluate it as the caller
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;