CREATE TABLE public.user_journey_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_index integer NOT NULL,
  task_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, stage_index, task_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_journey_tasks TO authenticated;
GRANT ALL ON public.user_journey_tasks TO service_role;
ALTER TABLE public.user_journey_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journey tasks" ON public.user_journey_tasks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);