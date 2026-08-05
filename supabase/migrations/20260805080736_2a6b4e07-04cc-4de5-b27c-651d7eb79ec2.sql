CREATE TYPE public.resource_type AS ENUM ('pyq_paper','formula_sheet','premium_note');

ALTER TABLE public.notes
  ADD COLUMN resource_type public.resource_type NOT NULL DEFAULT 'premium_note',
  ADD COLUMN year integer;

CREATE INDEX IF NOT EXISTS notes_resource_type_idx ON public.notes (resource_type);
CREATE INDEX IF NOT EXISTS notes_subject_year_idx ON public.notes (subject_id, year);