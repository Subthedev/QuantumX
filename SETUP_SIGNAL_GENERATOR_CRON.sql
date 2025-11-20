-- =====================================================
-- =€ Signal Generator Cron Job Setup
-- =====================================================
-- This sets up automated signal generation for all tiers
--
--   IMPORTANT: Replace these placeholders BEFORE running:
--    - YOUR_PROJECT_REF (e.g., abcdefghijklmnop)
--    - YOUR_SERVICE_ROLE_KEY (from Supabase Dashboard ’ Settings ’ API)
-- =====================================================

-- Step 1: Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Remove any existing signal generator cron jobs (if they exist)
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN
    SELECT jobid, jobname
    FROM cron.job
    WHERE jobname IN ('signal-generator-max-tier', 'signal-generator-pro-tier', 'signal-generator-free-tier')
  LOOP
    PERFORM cron.unschedule(job_record.jobid);
    RAISE NOTICE 'Removed existing job: %', job_record.jobname;
  END LOOP;
END $$;

-- Step 3: Schedule MAX tier (every 48 minutes = ~30 signals/24h)
SELECT cron.schedule(
  'signal-generator-max-tier',
  '*/48 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"tier": "MAX"}'::jsonb
    ) as request_id;
  $$
);

-- Step 4: Schedule PRO tier (every 96 minutes = ~15 signals/24h)
SELECT cron.schedule(
  'signal-generator-pro-tier',
  '*/96 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"tier": "PRO"}'::jsonb
    ) as request_id;
  $$
);

-- Step 5: Schedule FREE tier (every 8 hours = 3 signals/24h)
SELECT cron.schedule(
  'signal-generator-free-tier',
  '0 */8 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"tier": "FREE"}'::jsonb
    ) as request_id;
  $$
);

-- Step 6: Verify cron jobs were created
SELECT
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname LIKE 'signal-generator%'
ORDER BY jobname;

-- =====================================================
-- =Ë Verification Queries (run these after setup)
-- =====================================================

-- Check recent cron executions
-- SELECT
--   j.jobname,
--   r.status,
--   r.start_time,
--   r.end_time,
--   r.return_message
-- FROM cron.job_run_details r
-- JOIN cron.job j ON j.jobid = r.jobid
-- WHERE j.jobname LIKE 'signal-generator%'
-- ORDER BY r.start_time DESC
-- LIMIT 20;

-- Check if signals are being created
-- SELECT
--   COUNT(*) as total_signals,
--   tier,
--   MAX(created_at) as last_signal_time
-- FROM user_signals
-- GROUP BY tier;
