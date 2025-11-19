-- ================================================================
-- DIAGNOSE WHY SIGNALS NOT APPEARING IN FRONTEND
-- ================================================================

-- Step 1: Check if ANY signals exist in database
SELECT
  'Total Signals' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ NO SIGNALS - Edge function did not create any'
    ELSE '✅ Signals exist in database'
  END as status
FROM user_signals;

-- Step 2: Check signals created by edge function (last 1 hour)
SELECT
  'Edge Function Signals (Last Hour)' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ NO signals from edge function in last hour'
    ELSE '✅ Edge function created ' || COUNT(*)::text || ' signal(s)'
  END as status
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
AND created_at > NOW() - INTERVAL '1 hour';

-- Step 3: Show recent signals with details
SELECT
  created_at,
  user_id,
  symbol,
  signal_type,
  tier,
  confidence,
  metadata->>'generatedBy' as generated_by,
  CASE
    WHEN user_id IS NULL THEN '❌ NULL user_id'
    ELSE '✅ Has user_id'
  END as user_id_status
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Check if your user has any signals
-- Replace 'YOUR_USER_EMAIL' with your actual email
SELECT
  'Your Signals' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ NO signals for your user'
    ELSE '✅ You have ' || COUNT(*)::text || ' signal(s)'
  END as status
FROM user_signals us
JOIN auth.users au ON au.id = us.user_id
WHERE au.email = 'contactsubhrajeet@gmail.com';

-- Step 5: Show your subscription details
SELECT
  'Your Subscription' as check_type,
  tier,
  status,
  user_id,
  CASE
    WHEN tier = 'MAX' AND status = 'active' THEN '✅ MAX tier active'
    WHEN tier = 'PRO' AND status = 'active' THEN '✅ PRO tier active'
    WHEN tier = 'FREE' AND status = 'active' THEN '✅ FREE tier active'
    ELSE '❌ Issue with tier or status'
  END as subscription_status
FROM user_subscriptions
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com'
);

-- Step 6: Check if signal's user_id matches your user_id
SELECT
  us.created_at,
  us.symbol,
  us.user_id as signal_user_id,
  sub.user_id as your_user_id,
  CASE
    WHEN us.user_id = sub.user_id THEN '✅ MATCH - Signal should appear'
    ELSE '❌ MISMATCH - Signal will NOT appear (wrong user_id)'
  END as match_status
FROM user_signals us
CROSS JOIN (
  SELECT user_id FROM user_subscriptions
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
  LIMIT 1
) sub
WHERE us.metadata->>'generatedBy' = 'edge-function'
ORDER BY us.created_at DESC
LIMIT 5;

-- ================================================================
-- TROUBLESHOOTING GUIDE
-- ================================================================
--
-- CASE 1: "NO SIGNALS - Edge function did not create any"
-- Fix: Edge function failed or no users found
-- Action: Check edge function logs in Supabase Dashboard
--
-- CASE 2: "NO signals from edge function in last hour"
-- Fix: Edge function created signals but >1 hour ago
-- Action: Manually trigger edge function again
--
-- CASE 3: "NULL user_id"
-- Fix: Edge function not assigning user_id correctly
-- Action: Check edge function code at line 444 (user_id assignment)
--
-- CASE 4: "NO signals for your user"
-- Fix: Signals created but for different user
-- Possible causes:
--   - Multiple users in user_subscriptions
--   - Edge function assigned to wrong user_id
-- Action: Check Step 6 results
--
-- CASE 5: "MISMATCH - Signal will NOT appear"
-- Fix: Signal's user_id doesn't match your user_id
-- Action: Delete wrong signals and regenerate:
--   DELETE FROM user_signals WHERE metadata->>'generatedBy' = 'edge-function';
--   Then trigger edge function again
--
-- ================================================================
