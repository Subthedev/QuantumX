-- ====================================================================
-- DELETE OLD SIGNALS AND ENABLE FRESH SIGNAL GENERATION
-- ====================================================================
-- Run this in Supabase SQL Editor to clear old/expired signals
-- This will allow the signal generator to create fresh live signals
-- ====================================================================

-- Step 1: Check current signals (before deletion)
SELECT
  COUNT(*) as total_signals,
  tier,
  MAX(created_at) as last_signal_time,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_signals,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_signals
FROM user_signals
WHERE user_id = '0e4499b5-a1de-4a37-b502-179e93d382ee'
GROUP BY tier;

-- Step 2: Delete ALL old signals for this user
-- This will reset the timer and allow immediate fresh signal generation
DELETE FROM user_signals
WHERE user_id = '0e4499b5-a1de-4a37-b502-179e93d382ee';

-- Step 3: Verify deletion
SELECT COUNT(*) as remaining_signals
FROM user_signals
WHERE user_id = '0e4499b5-a1de-4a37-b502-179e93d382ee';
-- Should return 0

-- ====================================================================
-- NEXT STEP: Trigger Signal Generator (Browser Console)
-- ====================================================================
-- After running this SQL, run this code in your browser console:
--
-- fetch('https://vidziydspeewmcexqicg.supabase.co/functions/v1/signal-generator', {
--   method: 'POST',
--   headers: {
--     'Content-Type': 'application/json',
--     'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZHppeWRzcGVld21jZXhxaWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDc3MzIsImV4cCI6MjA2OTQyMzczMn0.cn4UuIO1zg-vtNZbHuVhTHK0fuZIIGFhNzz4hwkdwvg'
--   },
--   body: JSON.stringify({ tier: 'MAX' })
-- })
-- .then(res => res.json())
-- .then(data => console.log('✅ Generated:', data))
--
-- ====================================================================

-- Alternative: Delete only EXPIRED signals (keep recent ones if any)
-- DELETE FROM user_signals
-- WHERE user_id = '0e4499b5-a1de-4a37-b502-179e93d382ee'
-- AND expires_at <= NOW();

-- Alternative: Delete signals older than 1 hour
-- DELETE FROM user_signals
-- WHERE user_id = '0e4499b5-a1de-4a37-b502-179e93d382ee'
-- AND created_at < NOW() - INTERVAL '1 hour';
