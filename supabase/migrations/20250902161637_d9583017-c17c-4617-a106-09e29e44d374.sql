-- Add credits to profiles table
ALTER TABLE public.profiles 
ADD COLUMN credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN last_feedback_shown TIMESTAMP WITH TIME ZONE,
ADD COLUMN feedback_count INTEGER NOT NULL DEFAULT 0;

-- Create feedback_responses table
CREATE TABLE public.feedback_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_1 TEXT,
  question_2 TEXT,
  question_3 TEXT,
  question_4 TEXT,
  question_5 TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on feedback_responses
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback_responses
CREATE POLICY "Users can insert their own feedback"
ON public.feedback_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON public.feedback_responses
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to grant login credits
CREATE OR REPLACE FUNCTION public.grant_login_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to check if user has credits
CREATE OR REPLACE FUNCTION public.has_credits(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT credits > 0 FROM public.profiles WHERE user_id = _user_id),
    FALSE
  )
$$;

-- Create function to consume credits
CREATE OR REPLACE FUNCTION public.consume_credit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET credits = credits - 1
  WHERE user_id = _user_id AND credits > 0;
  
  RETURN FOUND;
END;
$$;

-- Create function to grant feedback credits
CREATE OR REPLACE FUNCTION public.grant_feedback_credits(_user_id UUID, _credits INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET credits = credits + _credits,
      feedback_count = feedback_count + 1,
      last_feedback_shown = now()
  WHERE user_id = _user_id;
END;
$$;