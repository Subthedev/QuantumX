-- CRON SCHEDULE for 24/7 Signal Generation
-- Runs signal-generator Edge Function every 30 seconds

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule signal generator to run every 30 seconds
-- Note: Supabase's pg_cron runs on UTC time
SELECT cron.schedule(
  'signal-generator-24-7',           -- Job name
  '*/30 * * * * *',                  -- Every 30 seconds (cron expression)
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- View all scheduled jobs
-- SELECT * FROM cron.job;

-- Unschedule job (if needed for maintenance)
-- SELECT cron.unschedule('signal-generator-24-7');

-- View job run history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

/*
DEPLOYMENT INSTRUCTIONS:

1. Get your Supabase project details:
   - Project URL: https://YOUR_PROJECT_REF.supabase.co
   - Service Role Key: Get from Supabase Dashboard > Settings > API

2. Replace placeholders in the SQL above:
   - YOUR_PROJECT_REF: Your Supabase project reference ID
   - YOUR_SERVICE_ROLE_KEY: Your service role key (keep secret!)

3. Run this SQL in Supabase SQL Editor:
   - Go to Supabase Dashboard > SQL Editor
   - Create new query
   - Paste the modified SQL
   - Execute

4. Verify cron job is running:
   SELECT * FROM cron.job WHERE jobname = 'signal-generator-24-7';

5. Monitor execution:
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'signal-generator-24-7')
   ORDER BY start_time DESC
   LIMIT 10;

TROUBLESHOOTING:

If cron doesn't work on Supabase (free tier limitation):
- Alternative 1: Use Supabase's built-in webhook scheduling (Platform > Database > Webhooks)
- Alternative 2: Use external cron service (cron-job.org, EasyCron) to call the Edge Function
- Alternative 3: Use Vercel Cron Jobs or GitHub Actions to trigger the function

PERFORMANCE NOTES:
- Each run generates 1-2 signals maximum (rate-limited in code)
- Scans 10 top crypto symbols per run
- Total execution time: ~2-5 seconds per run
- Database load: Minimal (simple INSERT operations)
*/
