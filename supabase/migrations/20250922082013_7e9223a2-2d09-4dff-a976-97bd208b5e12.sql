-- Add tester role for contactsubhrajeet@gmail.com
-- First ensure the user exists and get their ID
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Get the user ID for the email
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com';
    
    -- If user exists, add tester role
    IF user_uuid IS NOT NULL THEN
        -- Insert tester role (ignore if already exists)
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_uuid, 'tester')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Tester role added for user %', user_uuid;
    ELSE
        RAISE NOTICE 'User with email contactsubhrajeet@gmail.com not found. They need to sign up first.';
    END IF;
END $$;