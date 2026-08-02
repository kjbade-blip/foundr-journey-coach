CREATE POLICY "Backend only verification requests"
ON public.verification_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);