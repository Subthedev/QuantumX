-- CHECK SYSTEM STATUS - Run this in Supabase SQL Editor

-- 1. Check if tables exist
SELECT 'user_subscriptions' as table_name, COUNT(*) as row_count FROM user_subscriptions
UNION ALL
SELECT 'user_signal_quotas', COUNT(*) FROM user_signal_quotas
UNION ALL
SELECT 'user_signals', COUNT(*) FROM user_signals;

-- 2. Check if user has subscription
SELECT
  u.email,
  us.tier,
  us.status,
  us.current_period_start,
  us.current_period_end
FROM user_subscriptions us
JOIN auth.users u ON u.id = us.user_id
WHERE u.email = 'contactsubhrajeet@gmail.com';

-- 3. Check user signals
SELECT
  COUNT(*) as total_signals,
  tier,
  full_details
FROM user_signals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
GROUP BY tier, full_details;

-- 4. Check quota
SELECT * FROM user_signal_quotas
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
ORDER BY date DESC
LIMIT 5;

-- 5. If no subscription, create one
INSERT INTO user_subscriptions (user_id, tier, status, current_period_start, current_period_end)
SELECT
  id,
  'MAX'::user_tier,
  'active'::subscription_status,
  NOW(),
  NOW() + INTERVAL '1 month'
FROM auth.users
WHERE email = 'contactsubhrajeet@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET
  tier = 'MAX',
  status = 'active',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 month';

-- 6. Verify
SELECT
  u.email,
  us.tier,
  us.status,
  us.current_period_end
FROM user_subscriptions us
JOIN auth.users u ON u.id = us.user_id
WHERE u.email = 'contactsubhrajeet@gmail.com';
