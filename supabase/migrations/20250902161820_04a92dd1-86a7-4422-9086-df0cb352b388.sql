-- Fix the remaining function with search_path
CREATE OR REPLACE FUNCTION public.can_generate_report(user_uuid uuid, coin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has credits
  IF public.has_credits(user_uuid) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has unlimited access (tester or admin role)
  IF public.can_generate_unlimited_reports(user_uuid) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;