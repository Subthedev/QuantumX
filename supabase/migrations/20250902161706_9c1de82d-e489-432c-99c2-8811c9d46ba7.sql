-- Fix search_path for all functions
CREATE OR REPLACE FUNCTION public.grant_login_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Give 2 credits on first login of the day
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = NEW.id 
    AND updated_at > CURRENT_DATE
  ) THEN
    UPDATE public.profiles 
    SET credits = credits + 2,
        updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_credits(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT credits > 0 FROM public.profiles WHERE user_id = _user_id),
    FALSE
  )
$$;

CREATE OR REPLACE FUNCTION public.consume_credit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET credits = credits - 1
  WHERE user_id = _user_id AND credits > 0;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_feedback_credits(_user_id UUID, _credits INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET credits = credits + _credits,
      feedback_count = feedback_count + 1,
      last_feedback_shown = now()
  WHERE user_id = _user_id;
END;
$$;