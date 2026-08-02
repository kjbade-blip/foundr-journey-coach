CREATE TABLE public.business_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  business_name text NOT NULL,
  method text NOT NULL,
  confidence integer NOT NULL DEFAULT 80,
  verified_target text,
  verified_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, place_id)
);

GRANT SELECT ON public.business_verifications TO authenticated;
GRANT ALL ON public.business_verifications TO service_role;
ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications"
ON public.business_verifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  method text NOT NULL,
  target_hash text NOT NULL,
  masked_target text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX verification_requests_lookup_idx
ON public.verification_requests (user_id, place_id, created_at DESC);

CREATE TABLE public.verification_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  place_id text,
  method text,
  event text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  detail text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.verification_audit_log TO authenticated;
GRANT ALL ON public.verification_audit_log TO service_role;
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit entries"
ON public.verification_audit_log FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX verification_audit_log_rate_idx
ON public.verification_audit_log (user_id, created_at DESC);