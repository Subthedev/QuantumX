-- CREATE TEST SIGNAL DIRECTLY IN DATABASE
-- This will bypass the signal generation system to test if UI works

-- Step 1: Ensure user has subscription
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

-- Step 2: Create test signals directly
INSERT INTO user_signals (
  user_id,
  signal_id,
  tier,
  symbol,
  signal_type,
  confidence,
  quality_score,
  entry_price,
  take_profit,
  stop_loss,
  expires_at,
  metadata,
  full_details,
  viewed,
  clicked
)
SELECT
  u.id,
  'test_signal_' || generate_series(1, 5),
  'MAX'::user_tier,
  CASE (generate_series(1, 5) % 5)
    WHEN 0 THEN 'BTC'
    WHEN 1 THEN 'ETH'
    WHEN 2 THEN 'SOL'
    WHEN 3 THEN 'BNB'
    ELSE 'ADA'
  END,
  CASE (generate_series(1, 5) % 2)
    WHEN 0 THEN 'LONG'
    ELSE 'SHORT'
  END,
  75 + (generate_series(1, 5) * 2)::numeric,  -- confidence 75-85
  80 + generate_series(1, 5)::numeric,        -- quality 80-85
  1000 + (generate_series(1, 5) * 100)::numeric,  -- entry price
  ARRAY[1200 + (generate_series(1, 5) * 100), 1300 + (generate_series(1, 5) * 100)]::numeric[],  -- take profit
  900 + (generate_series(1, 5) * 100)::numeric,   -- stop loss
  NOW() + INTERVAL '4 hours',
  jsonb_build_object('test', true, 'rank', generate_series(1, 5)),
  true,  -- full_details unlocked for MAX
  false,
  false
FROM auth.users u
WHERE u.email = 'contactsubhrajeet@gmail.com';

-- Step 3: Increment quota
INSERT INTO user_signal_quotas (user_id, date, signals_received)
SELECT
  id,
  CURRENT_DATE,
  5
FROM auth.users
WHERE email = 'contactsubhrajeet@gmail.com'
ON CONFLICT (user_id, date) DO UPDATE
SET signals_received = user_signal_quotas.signals_received + 5;

-- Step 4: Verify
SELECT
  'Created ' || COUNT(*) || ' test signals for ' || u.email as result
FROM user_signals us
JOIN auth.users u ON u.id = us.user_id
WHERE u.email = 'contactsubhrajeet@gmail.com'
  AND signal_id LIKE 'test_signal_%'
GROUP BY u.email;

-- Step 5: View the test signals
SELECT
  tier,
  symbol,
  signal_type,
  confidence,
  quality_score,
  entry_price,
  full_details,
  created_at
FROM user_signals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
ORDER BY created_at DESC
LIMIT 10;

-- ✅ After running this, refresh the Intelligence Hub page
-- You should immediately see 5 test signals!
