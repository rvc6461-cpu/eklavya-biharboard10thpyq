
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN CREATE TYPE public.question_difficulty AS ENUM ('easy','medium','hard'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.question_status AS ENUM ('draft','published'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short text NOT NULL,
  glyph text NOT NULL DEFAULT '★',
  hue text NOT NULL DEFAULT 'from-indigo-500 to-violet-600',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT SELECT ON public.subjects TO anon;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_read_active" ON public.subjects FOR SELECT USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "subjects_admin_write" ON public.subjects FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, slug)
);
CREATE INDEX IF NOT EXISTS chapters_subject_idx ON public.chapters(subject_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT SELECT ON public.chapters TO anon;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters_read_active" ON public.chapters FOR SELECT USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "chapters_admin_write" ON public.chapters FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_chapters_updated BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer smallint NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  difficulty public.question_difficulty NOT NULL DEFAULT 'medium',
  is_pyq boolean NOT NULL DEFAULT true,
  year int,
  explanation text,
  tags text[] NOT NULL DEFAULT '{}',
  status public.question_status NOT NULL DEFAULT 'published',
  legacy_id text UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS questions_chapter_idx ON public.questions(chapter_id);
CREATE INDEX IF NOT EXISTS questions_subject_idx ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS questions_status_idx ON public.questions(status);
CREATE INDEX IF NOT EXISTS questions_text_trgm ON public.questions USING gin (text gin_trgm_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT ON public.questions TO anon;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_read_published" ON public.questions FOR SELECT USING (status = 'published' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "questions_admin_write" ON public.questions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_questions_updated BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.mock_test_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  time_limit_seconds int NOT NULL DEFAULT 1800,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_test_templates TO authenticated;
GRANT ALL ON public.mock_test_templates TO service_role;
ALTER TABLE public.mock_test_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mock_templates_read_published" ON public.mock_test_templates FOR SELECT USING (is_published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mock_templates_admin_write" ON public.mock_test_templates FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_mock_templates_updated BEFORE UPDATE ON public.mock_test_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.mock_test_questions (
  template_id uuid NOT NULL REFERENCES public.mock_test_templates(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (template_id, question_id)
);
CREATE INDEX IF NOT EXISTS mtq_template_idx ON public.mock_test_questions(template_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_test_questions TO authenticated;
GRANT ALL ON public.mock_test_questions TO service_role;
ALTER TABLE public.mock_test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mtq_read_if_visible" ON public.mock_test_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.mock_test_templates t WHERE t.id = template_id AND (t.is_published OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "mtq_admin_write" ON public.mock_test_questions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  pdf_url text NOT NULL,
  is_premium boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  download_count int NOT NULL DEFAULT 0,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_read_published" ON public.notes FOR SELECT USING (is_published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notes_admin_write" ON public.notes FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read_sent" ON public.notifications FOR SELECT USING (sent_at IS NOT NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notifications_admin_write" ON public.notifications FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_notifications_updated BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "profiles_admin_read_all" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "attempts_admin_read_all" ON public.attempts FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "mistakes_admin_read_all" ON public.mistakes FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "bookmarks_admin_read_all" ON public.bookmarks FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "mock_tests_admin_read_all" ON public.mock_tests FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.auto_grant_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'rvc6461@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_grant_admin ON auth.users;
CREATE TRIGGER trg_auto_grant_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'rvc6461@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.subjects (slug, name, short, glyph, hue, sort_order) VALUES
  ('math','Mathematics','Math','∑','from-indigo-500 to-violet-600',1),
  ('science','Science','Sci','⚛','from-emerald-500 to-teal-600',2),
  ('sst','Social Science','SST','❖','from-amber-500 to-orange-600',3),
  ('english','English','Eng','✎','from-sky-500 to-blue-600',4),
  ('hindi','Hindi','Hin','ह','from-rose-500 to-pink-600',5),
  ('sanskrit','Sanskrit','Sans','ॐ','from-yellow-500 to-orange-600',6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.chapters (subject_id, slug, name, sort_order)
SELECT s.id, c.slug, c.name, c.sort_order FROM (VALUES
  ('math','real-numbers','Real Numbers',1),
  ('math','polynomials','Polynomials',2),
  ('math','trigonometry','Introduction to Trigonometry',3),
  ('science','chemical-reactions','Chemical Reactions and Equations',1),
  ('science','light','Light – Reflection and Refraction',2),
  ('sst','nationalism-india','Nationalism in India',1),
  ('english','grammar','Grammar — Tenses',1),
  ('hindi','vyakaran','व्याकरण — संधि',1),
  ('sanskrit','vyakaran-sandhi','व्याकरणम् — सन्धि',1),
  ('sanskrit','shabda-roop','शब्द-रूपाणि',2),
  ('sanskrit','dhatu-roop','धातु-रूपाणि',3)
) AS c(subject_slug, slug, name, sort_order)
JOIN public.subjects s ON s.slug = c.subject_slug
ON CONFLICT (subject_id, slug) DO NOTHING;

DO $seed$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM (VALUES
    ('m1-1','math','real-numbers',2024,'The HCF of 96 and 404 is:','2','4','8','12',1,'404 = 96×4 + 20, 96 = 20×4 + 16, 20 = 16×1 + 4, 16 = 4×4. So HCF = 4.'),
    ('m1-2','math','real-numbers',2023,'Which of the following is an irrational number?','√4','√9','√7','√16',2,'√7 is irrational because 7 is not a perfect square.'),
    ('m1-3','math','real-numbers',2022,'The decimal expansion of 13/3125 will terminate after how many places?','3','4','5','6',2,'3125 = 5⁵, so decimal terminates after 5 places.'),
    ('m1-4','math','real-numbers',2024,'If two positive integers a and b are written as a = x³y² and b = xy³, then HCF(a,b) is:','xy²','xy³','x³y³','x²y²',0,'HCF takes the lowest power of each common prime: x¹y².'),
    ('m2-1','math','polynomials',2024,'If α and β are zeroes of x² − 5x + 6, then α + β is:','−5','5','6','−6',1,'Sum of zeroes = −b/a = 5.'),
    ('m2-2','math','polynomials',2023,'The degree of polynomial 3x⁴ − 2x³ + x − 7 is:','2','3','4','7',2,'Highest power of x is 4.'),
    ('m2-3','math','polynomials',2022,'A quadratic polynomial whose zeroes are 2 and −3 is:','x² + x − 6','x² − x − 6','x² − x + 6','x² + x + 6',0,'Sum=−1, Product=−6 → x² − (sum)x + product = x² + x − 6.'),
    ('m3-1','math','trigonometry',2024,'The value of sin 30° + cos 60° is:','1/2','1','√3/2','0',1,'sin 30° = 1/2, cos 60° = 1/2, sum = 1.'),
    ('m3-2','math','trigonometry',2023,'If tan θ = 4/3, then sin θ is:','3/5','4/5','3/4','5/4',1,'Opp=4, Adj=3, Hyp=5. sin θ = Opp/Hyp = 4/5.'),
    ('m3-3','math','trigonometry',2022,'sec²θ − tan²θ = ?','0','1','−1','2',1,'Identity: sec²θ − tan²θ = 1.'),
    ('s1-1','science','chemical-reactions',2024,'Rusting of iron is an example of:','Combination','Displacement','Oxidation','Reduction',2,'Iron loses electrons to oxygen — it is oxidised.'),
    ('s1-2','science','chemical-reactions',2023,'The chemical formula of quick lime is:','CaO','Ca(OH)₂','CaCO₃','CaCl₂',0,'Quick lime is calcium oxide, CaO.'),
    ('s1-3','science','chemical-reactions',2022,'Which gas is evolved when zinc reacts with dilute HCl?','O₂','Cl₂','H₂','CO₂',2,'Zn + 2HCl → ZnCl₂ + H₂↑.'),
    ('s2-1','science','light',2024,'The image formed by a plane mirror is always:','Real and inverted','Virtual and erect','Real and erect','Virtual and inverted',1,'Plane mirrors form virtual, erect, laterally inverted images of the same size.'),
    ('s2-2','science','light',2023,'The SI unit of power of a lens is:','metre','dioptre','watt','candela',1,'Power P = 1/f (in metres). Unit is dioptre (D).'),
    ('s2-3','science','light',2022,'Refractive index of water is approximately:','1.00','1.33','1.50','2.42',1,'n_water ≈ 1.33.'),
    ('h1-1','sst','nationalism-india',2024,'The Non-Cooperation Movement was launched in:','1919','1920','1922','1930',1,'Launched by Gandhi ji in 1920.'),
    ('h1-2','sst','nationalism-india',2023,'The Dandi March was associated with:','Khilafat Movement','Civil Disobedience','Quit India','Swadeshi',1,'Dandi March (1930) started the Civil Disobedience Movement.'),
    ('h1-3','sst','nationalism-india',2022,'Who wrote ''Vande Mataram''?','Tagore','Bankim Chandra','Sarojini Naidu','Tilak',1,'Bankim Chandra Chattopadhyay wrote it in his novel Anandamath.'),
    ('e1-1','english','grammar',2024,'She _____ to school every day.','go','goes','going','gone',1,'Third person singular in simple present takes -s.'),
    ('e1-2','english','grammar',2023,'The passive form of ''He writes a letter'' is:','A letter is written by him','A letter was written by him','A letter has been written by him','A letter being written by him',0,'Simple present passive: is/are + V3.'),
    ('hi1-1','hindi','vyakaran',2024,'''विद्यालय'' में कौन सी संधि है?','स्वर संधि','व्यंजन संधि','विसर्ग संधि','इनमें से कोई नहीं',0,'विद्या + आलय → दीर्घ स्वर संधि (आ + आ = आ)।'),
    ('hi1-2','hindi','vyakaran',2023,'''सूर्योदय'' का संधि-विच्छेद है:','सूर्य + उदय','सूर्यो + दय','सूर: + उदय','सूर + उदय',0,'सूर्य + उदय → गुण संधि (अ + उ = ओ)।'),
    ('sa1-1','sanskrit','vyakaran-sandhi',2024,'''रमा + ईशः'' इत्यस्य सन्धिः कः?','रमेशः','रमीशः','रमाईशः','रमयीशः',0,'आ + ई = ए (गुण सन्धि) → रमेशः।'),
    ('sa1-2','sanskrit','vyakaran-sandhi',2023,'''सूर्य + उदयः'' इत्यस्य सन्धिः कः?','सूर्योदयः','सूर्यउदयः','सूर्यैदयः','सूर्यादयः',0,'अ + उ = ओ (गुण सन्धि) → सूर्योदयः।'),
    ('sa1-3','sanskrit','vyakaran-sandhi',2022,'''देव + इन्द्रः'' इत्यस्य सन्धिः कः?','देवेन्द्रः','देवीन्द्रः','देवैन्द्रः','देवइन्द्रः',0,'अ + इ = ए (गुण सन्धि) → देवेन्द्रः।'),
    ('sa2-1','sanskrit','shabda-roop',2024,'''बालक'' शब्दस्य प्रथमा विभक्तेः एकवचनं किम्?','बालकः','बालकौ','बालकाः','बालकम्',0,'अकारान्त पुल्लिङ्ग — प्रथमा एकवचन → बालकः।'),
    ('sa2-2','sanskrit','shabda-roop',2023,'''लता'' शब्दस्य तृतीया विभक्तेः एकवचनं किम्?','लतया','लतायाः','लतायाम्','लताम्',0,'आकारान्त स्त्रीलिङ्ग — तृतीया एकवचन → लतया।'),
    ('sa3-1','sanskrit','dhatu-roop',2024,'''भू'' धातोः लट् लकारे प्रथमपुरुष एकवचनं किम्?','भवति','भवतः','भवन्ति','भवामि',0,'भू → लट् लकार, प्रथम पुरुष, एकवचन → भवति।'),
    ('sa3-2','sanskrit','dhatu-roop',2022,'''पठ्'' धातोः लट् लकारे उत्तमपुरुष एकवचनं किम्?','पठामि','पठसि','पठति','पठावः',0,'पठ् → लट् लकार, उत्तम पुरुष, एकवचन → पठामि।')
  ) AS v(legacy_id,subject_slug,chapter_slug,year,text,a,b,c,d,correct,explanation)
  LOOP
    INSERT INTO public.questions
      (legacy_id, subject_id, chapter_id, text, option_a, option_b, option_c, option_d,
       correct_answer, difficulty, is_pyq, year, explanation, status)
    SELECT rec.legacy_id, s.id, ch.id, rec.text, rec.a, rec.b, rec.c, rec.d,
      rec.correct, 'medium'::public.question_difficulty, true, rec.year, rec.explanation, 'published'::public.question_status
    FROM public.subjects s
    JOIN public.chapters ch ON ch.subject_id = s.id AND ch.slug = rec.chapter_slug
    WHERE s.slug = rec.subject_slug
    ON CONFLICT (legacy_id) DO NOTHING;
  END LOOP;
END $seed$;
