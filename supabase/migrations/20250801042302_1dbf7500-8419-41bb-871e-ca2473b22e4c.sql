-- Create an enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'tester', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable Row Level Security on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to check if user can generate unlimited reports
CREATE OR REPLACE FUNCTION public.can_generate_unlimited_reports(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(_user_id, 'tester') OR public.has_role(_user_id, 'admin')
$$;

-- Update the existing can_generate_report function to include unlimited access for testers
CREATE OR REPLACE FUNCTION public.can_generate_report(user_uuid UUID, coin TEXT)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Check if user has unlimited access (tester or admin role)
  IF public.can_generate_unlimited_reports(user_uuid) THEN
    RETURN TRUE;
  END IF;
  
  -- Regular users: check 24-hour limit
  RETURN NOT EXISTS (
    SELECT 1 
    FROM public.crypto_reports 
    WHERE user_id = user_uuid 
    AND coin_symbol = coin 
    AND created_at > now() - INTERVAL '24 hours'
  );
END;
$$;