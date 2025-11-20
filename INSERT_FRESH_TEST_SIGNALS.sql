-- ====================================================================
-- INSERT FRESH LIVE TEST SIGNALS (Immediate Solution)
-- ====================================================================
-- This will create fresh signals that appear in your UI RIGHT NOW
-- Run this in Supabase SQL Editor
-- ====================================================================

-- Step 1: Delete old sample signals
DELETE FROM user_signals
WHERE user_id = '0e4499b5-a1de-4a37-b502-179e93d382ee';

-- Step 2: Insert 5 FRESH signals that expire in 4 hours (active now!)
INSERT INTO user_signals (
  user_id,
  signal_id,
  tier,
  symbol,
  signal_type,
  entry_price,
  stop_loss,
  take_profit,
  confidence,
  quality_score,
  timeframe,
  created_at,
  expires_at,
  status,
  metadata
) VALUES
-- Signal 1: BTC LONG
(
  '0e4499b5-a1de-4a37-b502-179e93d382ee',
  'BTCUSDT-' || EXTRACT(EPOCH FROM NOW())::bigint,
  'MAX',
  'BTCUSDT',
  'LONG',
  98500.00,
  97000.00,
  ARRAY[99500.00, 100500.00],
  92.5,
  88.0,
  '15m',
  NOW(),
  NOW() + INTERVAL '4 hours',
  'ACTIVE',
  jsonb_build_object(
    'strategy', 'Momentum Surge V2',
    'generatedBy', 'manual-test',
    'image', 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    'riskReward', 2.5
  )
),
-- Signal 2: ETH SHORT
(
  '0e4499b5-a1de-4a37-b502-179e93d382ee',
  'ETHUSDT-' || EXTRACT(EPOCH FROM NOW())::bigint,
  'MAX',
  'ETHUSDT',
  'SHORT',
  3850.00,
  3920.00,
  ARRAY[3780.00, 3710.00],
  88.0,
  85.5,
  '15m',
  NOW(),
  NOW() + INTERVAL '4 hours',
  'ACTIVE',
  jsonb_build_object(
    'strategy', 'Whale Shadow',
    'generatedBy', 'manual-test',
    'image', 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    'riskReward', 2.1
  )
),
-- Signal 3: SOL LONG
(
  '0e4499b5-a1de-4a37-b502-179e93d382ee',
  'SOLUSDT-' || EXTRACT(EPOCH FROM NOW())::bigint,
  'MAX',
  'SOLUSDT',
  'LONG',
  220.50,
  215.00,
  ARRAY[226.00, 232.00],
  90.0,
  87.2,
  '15m',
  NOW(),
  NOW() + INTERVAL '4 hours',
  'ACTIVE',
  jsonb_build_object(
    'strategy', 'Spring Trap',
    'generatedBy', 'manual-test',
    'image', 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    'riskReward', 2.8
  )
),
-- Signal 4: BNB LONG
(
  '0e4499b5-a1de-4a37-b502-179e93d382ee',
  'BNBUSDT-' || EXTRACT(EPOCH FROM NOW())::bigint,
  'MAX',
  'BNBUSDT',
  'LONG',
  685.00,
  670.00,
  ARRAY[698.00, 712.00],
  86.5,
  84.0,
  '15m',
  NOW(),
  NOW() + INTERVAL '4 hours',
  'ACTIVE',
  jsonb_build_object(
    'strategy', 'Funding Squeeze',
    'generatedBy', 'manual-test',
    'image', 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    'riskReward', 2.4
  )
),
-- Signal 5: XRP SHORT
(
  '0e4499b5-a1de-4a37-b502-179e93d382ee',
  'XRPUSDT-' || EXTRACT(EPOCH FROM NOW())::bigint,
  'MAX',
  'XRPUSDT',
  'SHORT',
  2.85,
  2.92,
  ARRAY[2.78, 2.71],
  89.0,
  86.5,
  '15m',
  NOW(),
  NOW() + INTERVAL '4 hours',
  'ACTIVE',
  jsonb_build_object(
    'strategy', 'Order Flow Tsunami',
    'generatedBy', 'manual-test',
    'image', 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    'riskReward', 2.6
  )
);

-- Step 3: Verify fresh signals were created
SELECT
  symbol,
  signal_type,
  confidence,
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_until_expiry,
  metadata->>'strategy' as strategy
FROM user_signals
WHERE user_id = '0e4499b5-a1de-4a37-b502-179e93d382ee'
ORDER BY created_at DESC;

-- Expected output: 5 fresh signals, all with 4 hours until expiry
