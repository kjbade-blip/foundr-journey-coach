CREATE TABLE public.user_journey_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_index integer NOT NULL,
  task_key text NOT NULL,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, stage_index, task_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_journey_notes TO authenticated;
GRANT ALL ON public.user_journey_notes TO service_role;
ALTER TABLE public.user_journey_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journey notes" ON public.user_journey_notes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);