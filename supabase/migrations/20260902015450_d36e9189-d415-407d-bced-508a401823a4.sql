-- Phase 4B secure referrals, premium unlock, preferences, and feedback

DO $$ BEGIN
  CREATE TYPE public.referral_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referral code" ON public.referral_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER referral_codes_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  device_fingerprint_hash text,
  status public.referral_status NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_not_self CHECK (referrer_id <> referred_id)
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view referrals involving them" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX referrals_referrer_status_idx ON public.referrals(referrer_id, status, created_at DESC);
CREATE UNIQUE INDEX referrals_verified_device_idx
  ON public.referrals(device_fingerprint_hash)
  WHERE status = 'verified' AND device_fingerprint_hash IS NOT NULL;

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_reminders boolean NOT NULL DEFAULT true,
  study_goal_reminders boolean NOT NULL DEFAULT true,
  streak_reminders boolean NOT NULL DEFAULT true,
  premium_updates boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('suggestion', 'bug', 'feedback')),
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own feedback" ON public.feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users send own feedback" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view feedback" ON public.feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX feedback_user_created_idx ON public.feedback(user_id, created_at DESC);

-- Browser clients may edit profile presentation fields, but not premium state.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, exam_year) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.unlock_premium_for_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  verified_count integer;
BEGIN
  SELECT count(*) INTO verified_count
  FROM public.referrals
  WHERE referrer_id = _user_id AND status = 'verified';

  IF verified_count < 10 THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET is_premium = true, premium_expires_at = NULL
  WHERE id = _user_id;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.unlock_premium_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_premium_for_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing_code text;
  candidate text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT code INTO existing_code FROM public.referral_codes WHERE user_id = uid;
  IF existing_code IS NOT NULL THEN RETURN existing_code; END IF;

  LOOP
    candidate := substr(upper(md5(uid::text || clock_timestamp()::text || random()::text)), 1, 8);
    INSERT INTO public.referral_codes(user_id, code)
    VALUES (uid, candidate)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT code INTO existing_code FROM public.referral_codes WHERE user_id = uid;
    IF existing_code IS NOT NULL THEN RETURN existing_code; END IF;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_or_create_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_referral_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_code_value text := upper(trim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
  device_token text := trim(COALESCE(NEW.raw_user_meta_data->>'device_token', ''));
  referrer uuid;
  device_hash text;
BEGIN
  IF referral_code_value = '' OR device_token = '' THEN RETURN NEW; END IF;

  SELECT user_id INTO referrer
  FROM public.referral_codes
  WHERE code = referral_code_value;

  IF referrer IS NULL OR referrer = NEW.id THEN RETURN NEW; END IF;
  device_hash := md5(device_token);

  IF EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referred_id = NEW.id
       OR (status = 'verified' AND device_fingerprint_hash = device_hash)
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.referrals(
    referrer_id, referred_id, referral_code, device_fingerprint_hash, status, verified_at
  ) VALUES (
    referrer, NEW.id, referral_code_value, device_hash, 'verified', now()
  ) ON CONFLICT (referred_id) DO NOTHING;

  PERFORM public.unlock_premium_for_user(referrer);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_referral_for_new_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_verify_referral_for_new_user ON auth.users;
CREATE TRIGGER trg_verify_referral_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.verify_referral_for_new_user();

-- Ensure all future referral inserts (including trusted moderation workflows)
-- re-evaluate the lifetime unlock atomically.
CREATE OR REPLACE FUNCTION public.refresh_referrer_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'verified' THEN
    PERFORM public.unlock_premium_for_user(NEW.referrer_id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_referrer_premium() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_refresh_referrer_premium ON public.referrals;
CREATE TRIGGER trg_refresh_referrer_premium
  AFTER INSERT OR UPDATE OF status ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.refresh_referrer_premium();

-- Backfill referral codes for existing accounts without exposing write access.
INSERT INTO public.referral_codes(user_id, code)
SELECT u.id, substr(upper(md5(u.id::text)), 1, 8)
FROM auth.users u
LEFT JOIN public.referral_codes c ON c.user_id = u.id
WHERE c.user_id IS NULL
ON CONFLICT DO NOTHING;

-- Make new profiles receive a code automatically as well.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, substr(upper(md5(NEW.id::text)), 1, 8))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;