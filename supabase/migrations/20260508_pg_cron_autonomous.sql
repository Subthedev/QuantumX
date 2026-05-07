-- ============================================================================
-- QuantumX — pg_cron + pg_net autonomous scheduler
--
-- Replaces GitHub Actions as the trigger for trade-tick + signal-tick.
-- Once applied, Supabase calls Vercel directly every minute / 5 min, with
-- zero external dependencies. Survives a paused GitHub repo, an OAuth-scope
-- block, or anything else that breaks the GH Actions path.
--
-- Apply via:
--   1. Supabase Dashboard → SQL Editor → paste this file → Run
--   2. Verify with the SELECT statements at the bottom
--
-- One-time human action: paste the CRON_SECRET into the placeholder below.
-- After that, the system runs forever.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enable extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Private config table — holds the bearer secret so we don't bake it into
--    the cron SQL (which is visible in pg_stat_activity to anyone with admin).
--    Service-role only via RLS. Service-role bypasses RLS so the function
--    below can read it; everyone else gets nothing.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.cron_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE private.cron_config ENABLE ROW LEVEL SECURITY;
-- No policies = no row access for anon/authenticated. Service-role bypasses.

-- ⚠️ ONE-TIME: replace the placeholder below with your actual CRON_SECRET.
-- The value is the same as the Vercel env var CRON_SECRET (also stored as
-- the GitHub Actions secret of the same name).
INSERT INTO private.cron_config (key, value)
VALUES ('cron_secret', 'PASTE_YOUR_CRON_SECRET_HERE')
ON CONFLICT (key) DO NOTHING;
-- To rotate later:
--   UPDATE private.cron_config SET value = 'new_secret' WHERE key = 'cron_secret';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tick-run log — every cron call writes one row here. Used for monitoring
--    and to detect a stalled scheduler. Auto-pruned to last 7 days.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tick_runs (
  id          bigserial PRIMARY KEY,
  endpoint    text        NOT NULL,        -- 'trade-tick' | 'signal-tick'
  request_id  bigint,                       -- pg_net request id (FK to net.http_request_queue)
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  http_status integer,
  response    jsonb,
  duration_ms integer
);

CREATE INDEX IF NOT EXISTS tick_runs_scheduled_at_idx ON public.tick_runs (scheduled_at DESC);
CREATE INDEX IF NOT EXISTS tick_runs_endpoint_idx     ON public.tick_runs (endpoint, scheduled_at DESC);

ALTER TABLE public.tick_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tick_runs' AND policyname='tick_runs_read') THEN
    CREATE POLICY tick_runs_read ON public.tick_runs
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

GRANT SELECT ON public.tick_runs TO anon, authenticated;
GRANT ALL    ON public.tick_runs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.tick_runs_id_seq TO service_role;

-- Add to realtime so a dashboard can stream tick failures live
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tick_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tick_runs;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Tick caller function — fires the HTTP request and logs the queued id.
--    pg_net is async: net.http_get returns a request id, the response lands
--    in net.http_response_queue ~asynchronously. We log the request id so a
--    follow-up worker can join responses if we want.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.fire_tick(p_endpoint text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, extensions, net
AS $$
DECLARE
  v_secret text;
  v_url    text;
  v_req_id bigint;
BEGIN
  SELECT value INTO v_secret FROM private.cron_config WHERE key = 'cron_secret';
  IF v_secret IS NULL OR v_secret = 'PASTE_YOUR_CRON_SECRET_HERE' THEN
    RAISE EXCEPTION 'cron_secret not configured. UPDATE private.cron_config SET value = ''<your CRON_SECRET>'' WHERE key = ''cron_secret'';';
  END IF;

  v_url := 'https://quantumx.org.in/api/agents/' || p_endpoint;

  v_req_id := net.http_get(
    url     := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  );

  -- Log the firing. http_status + response are filled in by the response
  -- harvester (see step 5) once pg_net actually has the response.
  INSERT INTO public.tick_runs (endpoint, request_id, scheduled_at)
  VALUES (p_endpoint, v_req_id, now());

  -- Best-effort prune: keep only last 7 days of tick logs.
  DELETE FROM public.tick_runs WHERE scheduled_at < now() - interval '7 days';

  RETURN v_req_id;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Response harvester — pg_cron job that joins finished pg_net responses
--    back to the tick_runs row. Runs every minute (cheap).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.harvest_tick_responses()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, extensions, net
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  WITH harvested AS (
    UPDATE public.tick_runs t
    SET
      http_status = r.status_code,
      response    = COALESCE(r.content::jsonb, jsonb_build_object('raw', r.content)),
      duration_ms = EXTRACT(EPOCH FROM (r.created - t.scheduled_at)) * 1000
    FROM net._http_response r
    WHERE t.request_id = r.id
      AND t.http_status IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_updated FROM harvested;
  RETURN v_updated;
EXCEPTION WHEN undefined_table THEN
  -- Older pg_net versions store responses in `net.http_response`. Fall back.
  WITH harvested AS (
    UPDATE public.tick_runs t
    SET
      http_status = r.status_code,
      response    = COALESCE(r.content::jsonb, jsonb_build_object('raw', r.content)),
      duration_ms = EXTRACT(EPOCH FROM (r.created - t.scheduled_at)) * 1000
    FROM net.http_response r
    WHERE t.request_id = r.id
      AND t.http_status IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_updated FROM harvested;
  RETURN v_updated;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Schedule the cron jobs.
--    pg_cron lives in the `cron` schema. cron.schedule(jobname, schedule, sql)
--    is idempotent if we use unique jobnames and remove old ones first.
-- ─────────────────────────────────────────────────────────────────────────────

-- Clean any prior scheduling under these names (no-op if absent)
SELECT cron.unschedule(jobid) FROM cron.job
WHERE jobname IN ('quantumx-trade-tick', 'quantumx-signal-tick', 'quantumx-harvest-responses');

SELECT cron.schedule(
  'quantumx-trade-tick',
  '* * * * *',                              -- every minute
  $cmd$ SELECT private.fire_tick('trade-tick'); $cmd$
);

SELECT cron.schedule(
  'quantumx-signal-tick',
  '*/5 * * * *',                            -- every 5 minutes
  $cmd$ SELECT private.fire_tick('signal-tick'); $cmd$
);

SELECT cron.schedule(
  'quantumx-harvest-responses',
  '* * * * *',                              -- every minute
  $cmd$ SELECT private.harvest_tick_responses(); $cmd$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION (run these after applying)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Confirm all 3 jobs are scheduled and active
--    SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'quantumx-%';

-- 2. Wait 1-2 minutes, then look for tick rows
--    SELECT id, endpoint, scheduled_at, http_status, duration_ms,
--           response->>'ok' AS ok, response->>'opened' AS opened,
--           response->>'published' AS published
--    FROM public.tick_runs
--    ORDER BY scheduled_at DESC LIMIT 20;

-- 3. Live-verify everything is current
--    SELECT endpoint, MAX(scheduled_at) AS last_run, COUNT(*) AS runs_24h
--    FROM public.tick_runs
--    WHERE scheduled_at > now() - interval '24 hours'
--    GROUP BY endpoint;

-- ============================================================================
-- DONE. After applying:
--   - trade-tick fires every minute
--   - signal-tick fires every 5 minutes
--   - tick_runs row appears within ~5 seconds of each fire (response harvest)
--   - System runs autonomously forever — no GitHub, no external scheduler
-- ============================================================================
