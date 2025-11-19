-- ================================================================
-- CREATE FIRST SIGNAL - Fixed Version
-- ================================================================
-- Creates a test signal to start the timer
-- No manual edits required - just run it!
-- ================================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get your user ID automatically
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'contactsubhrajeet@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email contactsubhrajeet@gmail.com';
  END IF;

  -- Create first signal with correct JSONB format
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
  ) VALUES (
    v_user_id,
    'BTCUSDT-' || EXTRACT(EPOCH FROM NOW())::text || '-MAX',
    'MAX',
    'BTCUSDT',
    'LONG',
    85,
    90,
    95000.00,
    jsonb_build_array(96900.00, 99000.00),  -- ✅ FIXED: JSONB array format
    93100.00,
    NOW() + INTERVAL '24 hours',
    jsonb_build_object(
      'strategy', 'Momentum Surge',
      'timeframe', '15m',
      'generatedBy', 'edge-function',
      'timestamp', NOW()::text,
      'image', 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
      'adaptiveExpiry', jsonb_build_object(
        'expiryHours', 18,
        'explanation', 'Test signal for timer',
        'volatility', 2.5
      )
    ),
    true,
    false,
    false
  );

  RAISE NOTICE '✅ Signal created successfully for user %', v_user_id;
END $$;

-- Verify signal was created
SELECT
  '✅ VERIFICATION' as status,
  created_at,
  symbol,
  signal_type,
  tier,
  confidence,
  entry_price,
  take_profit,
  stop_loss,
  metadata->>'generatedBy' as source,
  metadata->>'image' as has_logo
FROM user_signals
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC
LIMIT 1;

-- Show timer calculation
SELECT
  '⏱️  TIMER INFO' as info,
  created_at,
  created_at + INTERVAL '48 minutes' as next_drop_time,
  EXTRACT(EPOCH FROM (created_at + INTERVAL '48 minutes' - NOW()))::integer as seconds_remaining,
  TO_CHAR((created_at + INTERVAL '48 minutes' - NOW()), 'MI:SS') as time_remaining
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC
LIMIT 1;

-- ================================================================
-- EXPECTED OUTPUT
-- ================================================================
--
-- NOTICE: ✅ Signal created successfully for user abc-123-...
--
-- ✅ VERIFICATION:
-- created_at          | symbol   | signal_type | tier | source
-- --------------------|----------|-------------|------|---------------
-- 2025-01-19 12:00:00 | BTCUSDT  | LONG        | MAX  | edge-function
--
-- ⏱️  TIMER INFO:
-- next_drop_time      | seconds_remaining | time_remaining
-- --------------------|-------------------|---------------
-- 2025-01-19 12:48:00 | 2880              | 48:00
--
-- ================================================================
-- NEXT STEPS
-- ================================================================
--
-- 1. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)
-- 2. Go to: http://localhost:8080/intelligence-hub
-- 3. You should see:
--    - Timer counting down from 48:00
--    - BTC LONG signal card
--    - Quota: "1 of 30 signals remaining"
--
-- ================================================================
