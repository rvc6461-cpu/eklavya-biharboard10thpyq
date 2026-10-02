CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  exam_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view app settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.motivation_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_text text NOT NULL,
  quote_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.motivation_quotes TO anon;
GRANT SELECT ON public.motivation_quotes TO authenticated;
GRANT ALL ON public.motivation_quotes TO service_role;
ALTER TABLE public.motivation_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active motivation quotes" ON public.motivation_quotes FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins can manage motivation quotes" ON public.motivation_quotes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER motivation_quotes_updated_at BEFORE UPDATE ON public.motivation_quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS set_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS question_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_option integer,
  ADD COLUMN IF NOT EXISTS revealed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuffle boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuffle_seed bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS appearance_mode text NOT NULL DEFAULT 'dark';
UPDATE public.profiles SET appearance_mode = 'dark' WHERE appearance_mode IS NULL;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, exam_year, appearance_mode) ON public.profiles TO authenticated;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_appearance_mode_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_appearance_mode_check CHECK (appearance_mode IN ('light', 'dark', 'system'));
