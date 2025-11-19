-- ================================================================
-- DIAGNOSTIC: CHECK WHAT'S ACTUALLY WORKING
-- ================================================================
-- Run this FIRST to see what's set up and what's broken
-- ================================================================

-- ================================================================
-- CHECK 1: Cron Extension Enabled?
-- ================================================================
SELECT
  '1️⃣ CRON EXTENSION CHECK' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED - Run: CREATE EXTENSION pg_cron;'
  END as status
FROM pg_extension
WHERE extname = 'pg_cron';

-- ================================================================
-- CHECK 2: Net Extension Enabled?
-- ================================================================
SELECT
  '2️⃣ NET EXTENSION CHECK' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED - Run: CREATE EXTENSION pg_net;'
  END as status
FROM pg_extension
WHERE extname = 'pg_net';

-- ================================================================
-- CHECK 3: Cron Job Exists?
-- ================================================================
SELECT
  '3️⃣ CRON JOB CHECK' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ EXISTS (jobname: ' || string_agg(jobname, ', ') || ')'
    ELSE '❌ NO CRON JOB - Need to create it!'
  END as status,
  CASE
    WHEN COUNT(*) > 0 THEN
      CASE
        WHEN bool_and(active) THEN '✅ Active'
        ELSE '⚠️ INACTIVE - Job exists but is disabled!'
      END
    ELSE NULL
  END as active_status
FROM cron.job
WHERE jobname LIKE '%signal%';

-- ================================================================
-- CHECK 4: Cron Job Details (if exists)
-- ================================================================
SELECT
  '4️⃣ CRON JOB DETAILS' as check_name,
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname LIKE '%signal%'
ORDER BY jobname;

-- Expected: schedule = '*/30 * * * * *' (every 30 seconds)

-- ================================================================
-- CHECK 5: Recent Cron Executions?
-- ================================================================
SELECT
  '5️⃣ RECENT EXECUTIONS' as check_name,
  COUNT(*) as executions_last_10min,
  MAX(start_time) as last_execution,
  EXTRACT(EPOCH FROM (NOW() - MAX(start_time))) as seconds_since_last,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ NO EXECUTIONS - Cron not running!'
    WHEN MAX(start_time) < NOW() - INTERVAL '1 minute' THEN '⚠️ STALE - Last execution > 1 min ago'
    WHEN COUNT(*) < 10 THEN '⚠️ TOO FEW - Should be ~20 executions in 10 min'
    ELSE '✅ RUNNING PROPERLY'
  END as status
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%signal%')
  AND start_time > NOW() - INTERVAL '10 minutes';

-- ================================================================
-- CHECK 6: Any Failed Executions?
-- ================================================================
SELECT
  '6️⃣ FAILED EXECUTIONS' as check_name,
  COUNT(*) as failed_count,
  MAX(start_time) as last_failure,
  string_agg(DISTINCT return_message, '; ') as error_messages
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%signal%')
  AND status = 'failed'
  AND start_time > NOW() - INTERVAL '1 hour';

-- ================================================================
-- CHECK 7: Active Users Exist?
-- ================================================================
SELECT
  '7️⃣ ACTIVE USERS CHECK' as check_name,
  tier,
  COUNT(*) as user_count
FROM user_subscriptions
WHERE status = 'active'
GROUP BY tier
ORDER BY tier;

-- Expected: At least 1 user per tier

-- ================================================================
-- CHECK 8: Recent Signals Generated?
-- ================================================================
SELECT
  '8️⃣ RECENT SIGNALS' as check_name,
  tier,
  COUNT(*) as signals_last_24h,
  MAX(created_at) as last_signal,
  EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))/60 as minutes_since_last
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY tier
ORDER BY tier;

-- Expected:
-- MAX: Should have signals (48 min intervals)
-- PRO: Should have signals (96 min intervals)
-- FREE: May not have signals yet (8 hour intervals)

-- ================================================================
-- CHECK 9: Signal Expiry Times Adaptive?
-- ================================================================
SELECT
  '9️⃣ ADAPTIVE EXPIRY CHECK' as check_name,
  COUNT(*) as total_signals,
  COUNT(*) FILTER (WHERE metadata->'adaptiveExpiry' IS NOT NULL) as has_adaptive_expiry,
  ROUND(AVG((metadata->'adaptiveExpiry'->>'expiryHours')::numeric), 1) as avg_expiry_hours,
  MIN((metadata->'adaptiveExpiry'->>'expiryHours')::numeric) as min_expiry,
  MAX((metadata->'adaptiveExpiry'->>'expiryHours')::numeric) as max_expiry,
  CASE
    WHEN COUNT(*) FILTER (WHERE metadata->'adaptiveExpiry' IS NOT NULL) = 0 THEN '❌ NO ADAPTIVE EXPIRY'
    WHEN AVG((metadata->'adaptiveExpiry'->>'expiryHours')::numeric) = 24 THEN '⚠️ ALL 24H - Not adaptive!'
    WHEN MIN((metadata->'adaptiveExpiry'->>'expiryHours')::numeric) < 6 THEN '⚠️ TOO LOW - Min should be 6h'
    WHEN MAX((metadata->'adaptiveExpiry'->>'expiryHours')::numeric) > 24 THEN '⚠️ TOO HIGH - Max should be 24h'
    ELSE '✅ WORKING - Varies between 6-24h'
  END as status
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
  AND created_at > NOW() - INTERVAL '24 hours';

-- ================================================================
-- CHECK 10: Edge Function Deployable?
-- ================================================================
-- Run this in terminal, not SQL:
-- supabase functions list
-- Should show: signal-generator | ACTIVE | version 9+

-- ================================================================
-- SUMMARY
-- ================================================================
-- If you see:
-- ✅ ALL CHECKS PASSING → System is working, just needs time
-- ❌ Cron extension not enabled → Run: CREATE EXTENSION pg_cron;
-- ❌ Cron job doesn't exist → Run SETUP_CRON_FINAL.sql
-- ❌ No executions → Check cron job command (service key might be wrong)
-- ❌ No signals → Check edge function logs: supabase functions logs signal-generator
-- ❌ No users → Add users to user_subscriptions table
-- ================================================================
