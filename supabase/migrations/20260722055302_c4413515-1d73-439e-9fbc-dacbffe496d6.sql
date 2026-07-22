
CREATE TABLE public.mock_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id text,
  test_name text NOT NULL,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  accuracy numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  time_taken_seconds integer NOT NULL DEFAULT 0,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_tests TO authenticated;
GRANT ALL ON public.mock_tests TO service_role;
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mock tests" ON public.mock_tests FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX mock_tests_user_idx ON public.mock_tests(user_id, taken_at DESC);

CREATE TABLE public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id text NOT NULL,
  chapter_id text NOT NULL,
  last_question_index integer NOT NULL DEFAULT 0,
  total_time_seconds integer NOT NULL DEFAULT 0,
  last_practiced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject_id, chapter_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_sessions TO authenticated;
GRANT ALL ON public.practice_sessions TO service_role;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own practice sessions" ON public.practice_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER practice_sessions_updated
  BEFORE UPDATE ON public.practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
