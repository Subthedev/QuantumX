-- ================================================================
-- SETUP 24/7 AUTONOMOUS SIGNAL GENERATION CRON JOB
-- ================================================================
-- This creates a Supabase cron job that runs every 30 seconds
-- to generate signals automatically in the background
-- ================================================================

-- STEP 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- STEP 2: Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- STEP 3: Remove any existing signal-generator cron jobs
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname LIKE '%signal-generator%' OR jobname LIKE '%generate-signals%';

-- STEP 4: Create the 24/7 autonomous cron job
-- ⚠️ IMPORTANT: Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- Find it in: Supabase Dashboard → Project Settings → API → Project URL
-- Example: https://abcdefghijklmnop.supabase.co → YOUR_PROJECT_REF = "abcdefghijklmnop"

-- ⚠️ IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY with your service role key
-- Find it in: Supabase Dashboard → Project Settings → API → service_role key (secret)

SELECT cron.schedule(
  'autonomous-signal-generator-30s',
  '*/30 * * * * *',  -- Every 30 seconds
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);

-- STEP 5: Verify cron job was created
SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'autonomous-signal-generator-30s';

-- Expected output: Should show 1 row with schedule '*/30 * * * * *'

-- STEP 6: Check cron job execution history (run this after a few minutes)
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s')
ORDER BY start_time DESC
LIMIT 10;

-- ================================================================
-- TROUBLESHOOTING
-- ================================================================

-- If cron job is not running, check:

-- 1. Verify pg_cron extension is enabled:
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Verify pg_net extension is enabled:
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- 3. Check for any failed executions:
SELECT *
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC
LIMIT 5;

-- 4. Manually test edge function:
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator',
  headers := jsonb_build_object(
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
    'Content-Type', 'application/json'
  )
) AS test_request;

-- ================================================================
-- IMPORTANT NOTES
-- ================================================================

/*
1. ⚠️ REPLACE PLACEHOLDERS:
   - YOUR_PROJECT_REF: Your Supabase project reference (from Project URL)
   - YOUR_SERVICE_ROLE_KEY: Your service role key (secret, from API settings)

2. ✅ SCHEDULE EXPLANATION:
   - '*/30 * * * * *' = Every 30 seconds
   - Edge function has tier-aware logic to check if signals should be generated
   - Most executions will return "No tiers ready" (this is normal and efficient)
   - Signals will only generate when tier intervals are met

3. ✅ WHAT HAPPENS:
   - Cron runs every 30 seconds
   - Calls signal-generator edge function
   - Edge function checks each tier (FREE/PRO/MAX)
   - Only generates if tier interval has passed:
     * FREE: Every 8 hours
     * PRO: Every 96 minutes
     * MAX: Every 48 minutes
   - Returns immediately if no tiers ready (fast, efficient)

4. ✅ MONITORING:
   - Check edge function logs: `supabase functions logs signal-generator`
   - Check cron execution: Query cron.job_run_details table
   - Check signals: Query user_signals table

5. ✅ COST:
   - Cron runs ~2,880 times per day (every 30s)
   - Most executions return immediately (~15ms each)
   - Only ~60-90 executions actually generate signals
   - Very low cost and resource usage

6. ⚠️ SECURITY:
   - Service role key has full database access
   - Never expose it in client-side code
   - Cron job runs server-side only (secure)
*/

-- ================================================================
-- SUCCESS INDICATORS
-- ================================================================

-- After setup, you should see:

-- 1. Cron job listed:
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s';
-- Expected: 1 row, active = true

-- 2. Regular executions:
SELECT COUNT(*) as execution_count
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s')
  AND start_time > NOW() - INTERVAL '5 minutes';
-- Expected: ~10 executions in last 5 minutes (every 30s)

-- 3. Signals being generated:
SELECT
  tier,
  COUNT(*) as signals_last_hour,
  MAX(created_at) as last_signal_time
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY tier;
-- Expected: Signals appearing based on tier intervals

-- ================================================================
-- READY FOR 24/7 AUTONOMOUS OPERATION!
-- ================================================================
