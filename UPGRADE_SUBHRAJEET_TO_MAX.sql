-- Upgrade contactsubhrajeet@gmail.com to MAX tier
-- Run this in Supabase SQL Editor

-- First, find the user
SELECT id, email FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com';

-- If user exists, upgrade to MAX tier (1 month)
UPDATE user_subscriptions
SET
  tier = 'MAX',
  status = 'active',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 month'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com'
);

-- Verify the upgrade
SELECT
  u.email,
  us.tier,
  us.status,
  us.current_period_end
FROM user_subscriptions us
JOIN auth.users u ON u.id = us.user_id
WHERE u.email = 'contactsubhrajeet@gmail.com';

-- Should show: contactsubhrajeet@gmail.com, MAX, active, (date 1 month from now)
