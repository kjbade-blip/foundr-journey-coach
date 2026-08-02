GRANT SELECT ON public.business_verifications TO authenticated;
GRANT ALL ON public.business_verifications TO service_role;
GRANT ALL ON public.verification_requests TO service_role;
GRANT SELECT ON public.verification_audit_log TO authenticated;
GRANT ALL ON public.verification_audit_log TO service_role;