-- CREATE TEST SIGNALS - FIXED VERSION
-- This creates 5 test signals properly for testing the unified signal display

-- Step 1: Ensure user has MAX subscription
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

-- Step 2: Create test signals using a CTE
WITH signal_data AS (
  SELECT
    u.id as user_id,
    s.num,
    CASE s.num
      WHEN 1 THEN 'BTC'
      WHEN 2 THEN 'ETH'
      WHEN 3 THEN 'SOL'
      WHEN 4 THEN 'BNB'
      WHEN 5 THEN 'ADA'
    END as symbol,
    CASE (s.num % 2)
      WHEN 0 THEN 'SHORT'
      ELSE 'LONG'
    END as signal_type,
    (75 + (s.num * 2))::numeric as confidence,
    (80 + s.num)::numeric as quality_score,
    CASE s.num
      WHEN 1 THEN 45000::numeric  -- BTC
      WHEN 2 THEN 3200::numeric   -- ETH
      WHEN 3 THEN 150::numeric    -- SOL
      WHEN 4 THEN 620::numeric    -- BNB
      WHEN 5 THEN 0.65::numeric   -- ADA
    END as entry_price,
    CASE s.num
      WHEN 1 THEN '[46500, 48000, 50000]'::jsonb  -- BTC targets
      WHEN 2 THEN '[3350, 3500, 3700]'::jsonb     -- ETH targets
      WHEN 3 THEN '[165, 180, 200]'::jsonb        -- SOL targets
      WHEN 4 THEN '[680, 720, 800]'::jsonb        -- BNB targets
      WHEN 5 THEN '[0.72, 0.78, 0.85]'::jsonb     -- ADA targets
    END as take_profit,
    CASE s.num
      WHEN 1 THEN 44000::numeric  -- BTC stop loss
      WHEN 2 THEN 3100::numeric   -- ETH stop loss
      WHEN 3 THEN 145::numeric    -- SOL stop loss
      WHEN 4 THEN 600::numeric    -- BNB stop loss
      WHEN 5 THEN 0.62::numeric   -- ADA stop loss
    END as stop_loss,
    CASE (s.num % 3)
      WHEN 0 THEN 'Momentum Surge V2'
      WHEN 1 THEN 'Funding Squeeze'
      ELSE 'Order Flow Tsunami'
    END as strategy_name
  FROM auth.users u
  CROSS JOIN generate_series(1, 5) as s(num)
  WHERE u.email = 'contactsubhrajeet@gmail.com'
)
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
  user_id,
  'test_signal_' || num,
  'MAX'::user_tier,
  symbol,
  signal_type,
  confidence,
  quality_score,
  entry_price,
  take_profit,
  stop_loss,
  NOW() + INTERVAL '4 hours',
  jsonb_build_object(
    'test', true,
    'rank', num,
    'strategy', strategy_name
  ),
  true,  -- full_details unlocked for MAX
  false,
  false
FROM signal_data;

-- Step 3: Update quota
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
  take_profit,
  stop_loss,
  full_details,
  metadata->>'rank' as rank,
  metadata->>'strategy' as strategy,
  created_at
FROM user_signals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
  AND signal_id LIKE 'test_signal_%'
ORDER BY created_at DESC;

-- ✅ After running this, refresh the Intelligence Hub page
-- You should see 5 stunning premium signal cards with status badges!
