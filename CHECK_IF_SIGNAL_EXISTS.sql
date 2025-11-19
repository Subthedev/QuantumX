-- Quick check - Did the signal get created?

SELECT
  'Signal Check' as status,
  COUNT(*) as total_signals,
  COUNT(*) FILTER (WHERE metadata->>'generatedBy' = 'edge-function') as edge_signals
FROM user_signals;

-- Show recent signal details
SELECT
  created_at,
  symbol,
  signal_type,
  tier,
  confidence,
  metadata->>'generatedBy' as source
FROM user_signals
ORDER BY created_at DESC
LIMIT 5;

-- Check if timer will work
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Timer should start - Signal exists!'
    ELSE '❌ Timer cannot start - No signals yet'
  END as timer_status
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function';
