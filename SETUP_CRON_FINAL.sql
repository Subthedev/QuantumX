-- ================================================================
-- SETUP 24/7 AUTONOMOUS CRON JOB - READY TO RUN
-- ================================================================
-- INSTRUCTIONS:
-- 1. Find YOUR_SERVICE_ROLE_KEY below (line 35)
-- 2. Replace it with your actual service role key
-- 3. Run this entire script
-- ================================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Remove any old cron jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN
    SELECT jobid FROM cron.job
    WHERE jobname LIKE '%signal%' OR jobname LIKE '%generate%'
  LOOP
    PERFORM cron.unschedule(job_record.jobid);
  END LOOP;
END $$;

-- Step 3: Create the 24/7 cron job
-- ⚠️ IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY below with your actual key
-- Find it in: Supabase Dashboard → Project Settings → API → service_role key (click "Reveal")

SELECT cron.schedule(
  'autonomous-signal-generator-30s',
  '*/30 * * * * *',  -- Every 30 seconds
  $$
  SELECT net.http_post(
    url := 'https://vidziydspeewmcexqicg.supabase.co/functions/v1/signal-generator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);

-- Step 4: Verify cron job was created
SELECT
  '✅ CRON JOB CREATED' as status,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname = 'autonomous-signal-generator-30s';

-- Expected output: 1 row with active = true

-- ================================================================
-- AFTER RUNNING THIS:
-- ================================================================
-- Wait 2 minutes, then run this to verify it's working:

-- SELECT
--   '✅ EXECUTIONS CHECK' as status,
--   COUNT(*) as executions_last_2min
-- FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s')
--   AND start_time > NOW() - INTERVAL '2 minutes';

-- Expected: ~4 executions (runs every 30 seconds)

-- ================================================================
-- TO VIEW LOGS:
-- ================================================================
-- Run in terminal: supabase functions logs signal-generator --tail
