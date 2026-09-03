ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_unlocked_at timestamptz;
UPDATE public.profiles SET premium_unlocked_at = COALESCE(premium_unlocked_at, updated_at) WHERE is_premium = true;
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
  SET is_premium = true,
      premium_expires_at = NULL,
      premium_unlocked_at = COALESCE(premium_unlocked_at, now())
  WHERE id = _user_id;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.unlock_premium_for_user(uuid) FROM PUBLIC, anon, authenticated;