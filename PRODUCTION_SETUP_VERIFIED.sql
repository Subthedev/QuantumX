-- ================================================================
-- PRODUCTION CRON SETUP - VERIFIED STEP BY STEP
-- ================================================================
-- This script will:
-- 1. Set up everything needed
-- 2. Test that it works
-- 3. Give you clear verification at each step
-- ================================================================

-- ================================================================
-- STEP 1: Enable Extensions
-- ================================================================
DO $$
BEGIN
  -- Enable pg_cron
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
    RAISE NOTICE '✅ pg_cron extension created';
  ELSE
    RAISE NOTICE 'ℹ️  pg_cron already enabled';
  END IF;

  -- Enable pg_net
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    CREATE EXTENSION pg_net;
    RAISE NOTICE '✅ pg_net extension created';
  ELSE
    RAISE NOTICE 'ℹ️  pg_net already enabled';
  END IF;
END $$;

-- Verify extensions
SELECT
  '✅ STEP 1 COMPLETE' as status,
  string_agg(extname, ', ') as enabled_extensions
FROM pg_extension
WHERE extname IN ('pg_cron', 'pg_net');

-- Expected: Shows both pg_cron and pg_net

-- ================================================================
-- STEP 2: Clean Up Old Cron Jobs
-- ================================================================
DO $$
DECLARE
  v_count int;
BEGIN
  -- Unschedule all signal-related cron jobs
  SELECT COUNT(*) INTO v_count
  FROM cron.job
  WHERE jobname LIKE '%signal%' OR jobname LIKE '%generate%';

  IF v_count > 0 THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname LIKE '%signal%' OR jobname LIKE '%generate%';

    RAISE NOTICE '🗑️  Removed % old cron job(s)', v_count;
  ELSE
    RAISE NOTICE 'ℹ️  No old cron jobs to remove';
  END IF;
END $$;

-- Verify cleanup
SELECT
  '✅ STEP 2 COMPLETE' as status,
  COUNT(*) as remaining_signal_crons
FROM cron.job
WHERE jobname LIKE '%signal%';

-- Expected: 0

-- ================================================================
-- STEP 3: Get Project URL Automatically
-- ================================================================
-- No need to manually enter project ref - we can build it from current_database()

-- ================================================================
-- STEP 4: Create Cron Job
-- ================================================================
-- ⚠️ CRITICAL: You MUST replace YOUR_SERVICE_ROLE_KEY below
-- Find it in: Supabase Dashboard → Settings → API → service_role (click "Reveal")
-- Copy the ENTIRE key (starts with eyJ...)

DO $$
DECLARE
  v_project_url text;
  v_service_key text := 'YOUR_SERVICE_ROLE_KEY'; -- ⚠️ REPLACE THIS!
BEGIN
  -- Validate service key was replaced
  IF v_service_key = 'YOUR_SERVICE_ROLE_KEY' THEN
    RAISE EXCEPTION '❌ ERROR: You must replace YOUR_SERVICE_ROLE_KEY with your actual service role key!';
  END IF;

  -- Build project URL
  v_project_url := 'https://vidziydspeewmcexqicg.supabase.co/functions/v1/signal-generator';

  -- Create cron job
  PERFORM cron.schedule(
    'autonomous-signal-generator-30s',
    '*/30 * * * * *',  -- Every 30 seconds
    format(
      $$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || %L,
          'Content-Type', 'application/json'
        )
      ) AS request_id;$$,
      v_project_url,
      v_service_key
    )
  );

  RAISE NOTICE '✅ Cron job created successfully!';
  RAISE NOTICE 'ℹ️  URL: %', v_project_url;
  RAISE NOTICE 'ℹ️  Schedule: Every 30 seconds';
END $$;

-- Verify cron job created
SELECT
  '✅ STEP 4 COMPLETE' as status,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname = 'autonomous-signal-generator-30s';

-- Expected: 1 row, active = true, schedule = '*/30 * * * * *'

-- ================================================================
-- STEP 5: Wait 2 Minutes for Executions
-- ================================================================
-- After this script finishes, wait 2 minutes, then run:

/*
SELECT
  '✅ STEP 5 CHECK' as status,
  COUNT(*) as executions_last_2min,
  MAX(start_time) as last_execution,
  ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(start_time)))) as seconds_ago
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s')
  AND start_time > NOW() - INTERVAL '2 minutes';

-- Expected: ~4 executions, seconds_ago < 30
*/

-- ================================================================
-- STEP 6: Check for Errors
-- ================================================================
-- If step 5 shows 0 executions, check for errors:

/*
SELECT
  '🔍 ERROR CHECK' as status,
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s')
ORDER BY start_time DESC
LIMIT 5;

-- If you see errors, check:
-- - Service key is correct
-- - Edge function is deployed: supabase functions list
-- - Edge function has no errors: supabase functions logs signal-generator
*/

-- ================================================================
-- STEP 7: Verify Signals Are Generating
-- ================================================================
-- After 48 minutes (MAX tier interval), check:

/*
SELECT
  '✅ SIGNALS CHECK' as status,
  tier,
  symbol,
  created_at,
  ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))/60) as minutes_ago,
  metadata->'adaptiveExpiry'->>'expiryHours' as expiry_hours
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Signals appearing with varying expiry hours (6-24h)
*/

-- ================================================================
-- TROUBLESHOOTING
-- ================================================================
/*
❌ ERROR: "permission denied for schema cron"
   FIX: You need to run this as the postgres user or a superuser

❌ ERROR: "extension pg_cron does not exist"
   FIX: Contact Supabase support to enable pg_cron for your project

❌ No executions after 2 minutes
   FIX: Check service key is correct and edge function is deployed

❌ Executions happening but no signals
   FIX: Run: supabase functions logs signal-generator
        Check for errors in edge function

❌ Signals generated but all timeout
   FIX: Check adaptive expiry is working (expiry should vary 6-24h)
*/

-- ================================================================
-- SUCCESS INDICATORS
-- ================================================================
/*
When everything is working, you should see:

1. ✅ Extensions enabled (pg_cron, pg_net)
2. ✅ Cron job active
3. ✅ ~4 executions every 2 minutes
4. ✅ Signals appearing every 48 min (MAX), 96 min (PRO), 8 hours (FREE)
5. ✅ Adaptive expiry varies (not all 24h)
6. ✅ System works with browser closed
*/

-- ================================================================
-- FINAL VERIFICATION SCRIPT
-- ================================================================
/*
Run this to check everything at once:

SELECT * FROM (
  SELECT 1 as order_num, '1. Extensions' as check_name,
    CASE WHEN COUNT(*) = 2 THEN '✅' ELSE '❌' END as status
  FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net')

  UNION ALL

  SELECT 2, '2. Cron Job',
    CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END
  FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s'

  UNION ALL

  SELECT 3, '3. Recent Executions',
    CASE WHEN COUNT(*) >= 2 THEN '✅' ELSE '❌' END
  FROM cron.job_run_details
  WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s')
    AND start_time > NOW() - INTERVAL '2 minutes'

  UNION ALL

  SELECT 4, '4. Active Users',
    CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END
  FROM user_subscriptions WHERE status = 'active'

  UNION ALL

  SELECT 5, '5. Signals Generated',
    CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '⏳ WAITING' END
  FROM user_signals
  WHERE metadata->>'generatedBy' = 'edge-function'
    AND created_at > NOW() - INTERVAL '2 hours'
) checks
ORDER BY order_num;

-- All should show ✅ (except #5 may show ⏳ WAITING if you just set it up)
*/
