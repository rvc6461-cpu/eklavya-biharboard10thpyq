
-- Sub Subjects: middle layer between Subject and Chapter
CREATE TABLE public.sub_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_id, slug)
);
CREATE INDEX sub_subjects_subject_idx ON public.sub_subjects(subject_id);

GRANT SELECT ON public.sub_subjects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sub_subjects TO authenticated;
GRANT ALL ON public.sub_subjects TO service_role;

ALTER TABLE public.sub_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_subjects_read_active" ON public.sub_subjects FOR SELECT
  USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sub_subjects_admin_write" ON public.sub_subjects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_sub_subjects_updated BEFORE UPDATE ON public.sub_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link chapters to a sub-subject (nullable to avoid breaking existing rows)
ALTER TABLE public.chapters
  ADD COLUMN sub_subject_id UUID REFERENCES public.sub_subjects(id) ON DELETE SET NULL;
CREATE INDEX chapters_sub_subject_idx ON public.chapters(sub_subject_id);

-- Optional language column on questions (per Phase 1 CSV spec)
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS language TEXT;
