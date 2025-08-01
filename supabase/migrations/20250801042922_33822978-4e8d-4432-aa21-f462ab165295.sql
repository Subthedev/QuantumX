-- Add contactsubhrajeet@gmail.com as a tester with unlimited report access
-- First, get the user_id for contactsubhrajeet@gmail.com from auth.users
-- Then insert them into user_roles with 'tester' role

-- Insert the tester role for contactsubhrajeet@gmail.com
-- We need to find their user_id first, then assign the role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'tester'::app_role
FROM auth.users 
WHERE email = 'contactsubhrajeet@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;