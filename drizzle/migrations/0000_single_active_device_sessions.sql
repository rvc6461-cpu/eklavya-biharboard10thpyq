ALTER TABLE public.profiles ADD COLUMN active_session_id uuid;

CREATE OR REPLACE FUNCTION public.is_active_device_session()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  uid uuid := auth.uid();
  session_text text := auth.jwt() ->> 'session_id';
  active_id uuid;
BEGIN
  IF uid IS NULL OR session_text IS NULL OR session_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  SELECT p.active_session_id INTO active_id
  FROM public.profiles AS p
  WHERE p.id = uid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN active_id IS NULL OR active_id = session_text::uuid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_active_device_session()
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  uid uuid := auth.uid();
  session_text text := auth.jwt() ->> 'session_id';
  current_session_id uuid;
  user_phone text;
  user_name text;
  active_id uuid;
BEGIN
  IF uid IS NULL OR session_text IS NULL OR session_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  current_session_id := session_text::uuid;
  SELECT u.phone, COALESCE(NULLIF(u.raw_user_meta_data ->> 'display_name', ''), NULLIF(u.raw_user_meta_data ->> 'name', ''), u.phone, 'Student')
  INTO user_phone, user_name
  FROM auth.users AS u
  WHERE u.id = uid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (uid, user_name)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles
  SET active_session_id = current_session_id,
      display_name = COALESCE(display_name, user_name),
      updated_at = now()
  WHERE id = uid AND active_session_id IS NULL;

  SELECT p.active_session_id INTO active_id
  FROM public.profiles AS p
  WHERE p.id = uid;

  RETURN active_id = current_session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_active_device_session()
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  uid uuid := auth.uid();
  session_text text := auth.jwt() ->> 'session_id';
  current_session_id uuid;
  session_created_at timestamptz;
  user_name text;
BEGIN
  IF uid IS NULL OR session_text IS NULL OR session_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  current_session_id := session_text::uuid;
  SELECT s.created_at INTO session_created_at
  FROM auth.sessions AS s
  WHERE s.id = current_session_id AND s.user_id = uid;

  IF session_created_at IS NULL OR session_created_at < now() - interval '5 minutes' THEN
    RETURN false;
  END IF;

  SELECT COALESCE(NULLIF(u.raw_user_meta_data ->> 'display_name', ''), NULLIF(u.raw_user_meta_data ->> 'name', ''), u.phone, 'Student')
  INTO user_name
  FROM auth.users AS u
  WHERE u.id = uid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (uid, user_name)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles
  SET active_session_id = current_session_id,
      display_name = COALESCE(display_name, user_name),
      updated_at = now()
  WHERE id = uid;

  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.is_active_device_session() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_active_device_session() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_active_device_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_device_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_active_device_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_active_device_session() TO authenticated;

REVOKE INSERT, UPDATE ON TABLE public.profiles FROM authenticated;
GRANT INSERT (id, display_name, avatar_url, exam_year, appearance_mode) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_url, exam_year, appearance_mode) ON TABLE public.profiles TO authenticated;

CREATE POLICY active_device_session_required_app_settings ON public.app_settings AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_attempts ON public.attempts AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_bookmarks ON public.bookmarks AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_chapters ON public.chapters AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_feedback ON public.feedback AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_mistakes ON public.mistakes AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_mock_test_questions ON public.mock_test_questions AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_mock_test_templates ON public.mock_test_templates AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_mock_tests ON public.mock_tests AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_motivation_quotes ON public.motivation_quotes AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_notes ON public.notes AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_notification_preferences ON public.notification_preferences AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_notifications ON public.notifications AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_practice_sessions ON public.practice_sessions AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_profiles ON public.profiles AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_questions ON public.questions AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_referral_codes ON public.referral_codes AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_referrals ON public.referrals AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_sub_subjects ON public.sub_subjects AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_subjects ON public.subjects AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());
CREATE POLICY active_device_session_required_user_roles ON public.user_roles AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_device_session()) WITH CHECK (public.is_active_device_session());