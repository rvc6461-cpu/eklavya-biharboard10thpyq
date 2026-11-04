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
  session_created_at timestamptz;
  user_name text;
  active_id uuid;
BEGIN
  IF uid IS NULL OR session_text IS NULL OR session_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  current_session_id := session_text::uuid;
  SELECT s.created_at INTO session_created_at
  FROM auth.sessions AS s
  WHERE s.id = current_session_id AND s.user_id = uid;

  IF session_created_at IS NULL THEN
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
  WHERE id = uid
    AND (active_session_id IS NULL
      OR active_session_id = current_session_id
      OR session_created_at >= now() - interval '5 minutes');

  SELECT p.active_session_id INTO active_id
  FROM public.profiles AS p
  WHERE p.id = uid;

  RETURN active_id = current_session_id;
END;
$function$;