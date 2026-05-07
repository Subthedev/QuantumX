-- ============================================================================
-- QuantumX Phase 0: Server-side trading + autonomous brain persistence
--
-- This migration creates the schema for 24/7 server-side trading on Vercel Cron
-- and the shared autonomous_state row that lets the orchestrator brain persist
-- across both browser sessions and serverless invocations.
--
-- Tables:
--   1. arena_agent_sessions      — per-agent cumulative stats (one row per agent)
--   2. arena_active_positions    — currently open positions (one row per agent)
--   3. arena_trade_history       — append-only trade log (purged > 14 days)
--   4. arena_market_state        — last-known global market regime snapshot
--   5. autonomous_state          — singleton row with orchestrator JSONB blob
--
-- Plus: extension columns on intelligence_signals (regime, fear_greed_index,
-- funding_rate, thesis, invalidation) for the agent ingest pipeline.
--
-- Plus: Supabase Realtime publication entries so browser clients can subscribe
-- to changes instead of polling.
--
-- Apply via:
--   1. Supabase Dashboard → SQL Editor → paste this file → Run
--   OR
--   2. supabase db push (after `supabase login` and `supabase link`)
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. arena_agent_sessions — per-agent stats (alphax / betax / gammax)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.arena_agent_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              text NOT NULL UNIQUE,             -- 'alphax' | 'betax' | 'gammax'
  trades                integer NOT NULL DEFAULT 0,
  wins                  integer NOT NULL DEFAULT 0,
  pnl                   numeric NOT NULL DEFAULT 0,        -- cumulative %
  balance_delta         numeric NOT NULL DEFAULT 0,        -- $ change from initial $10k
  consecutive_losses    integer NOT NULL DEFAULT 0,
  circuit_breaker_level text NOT NULL DEFAULT 'ACTIVE',
  halted_until          timestamptz,
  last_trade_time       timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arena_agent_sessions_agent_id_idx
  ON public.arena_agent_sessions(agent_id);

-- Auto-bump updated_at on every UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS arena_agent_sessions_updated_at ON public.arena_agent_sessions;
CREATE TRIGGER arena_agent_sessions_updated_at
  BEFORE UPDATE ON public.arena_agent_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. arena_active_positions — open positions, one per agent at a time
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.arena_active_positions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                 text NOT NULL UNIQUE,
  position_id              text NOT NULL,
  symbol                   text NOT NULL,                 -- 'BTCUSDT'
  display_symbol           text NOT NULL,                 -- 'BTC/USD'
  direction                text NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  entry_price              numeric NOT NULL,
  current_price            numeric NOT NULL,
  quantity                 numeric NOT NULL,
  take_profit_price        numeric NOT NULL,
  stop_loss_price          numeric NOT NULL,
  strategy                 text,
  market_state_at_entry    text,
  entry_time               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arena_active_positions_agent_id_idx
  ON public.arena_active_positions(agent_id);
CREATE INDEX IF NOT EXISTS arena_active_positions_symbol_idx
  ON public.arena_active_positions(symbol);

DROP TRIGGER IF EXISTS arena_active_positions_updated_at ON public.arena_active_positions;
CREATE TRIGGER arena_active_positions_updated_at
  BEFORE UPDATE ON public.arena_active_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. arena_trade_history — append-only log of closed trades
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.arena_trade_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        text NOT NULL,
  timestamp       timestamptz NOT NULL DEFAULT now(),
  symbol          text NOT NULL,
  direction       text NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  entry_price     numeric NOT NULL,
  exit_price      numeric,
  quantity        numeric NOT NULL,
  pnl_percent     numeric,
  pnl_dollar      numeric,
  is_win          boolean,
  strategy        text,
  market_state    text,
  reason          text                                       -- 'TP' | 'SL' | 'TIMEOUT' | 'REGIME_CHANGE'
);

CREATE INDEX IF NOT EXISTS arena_trade_history_agent_id_idx
  ON public.arena_trade_history(agent_id);
CREATE INDEX IF NOT EXISTS arena_trade_history_timestamp_idx
  ON public.arena_trade_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS arena_trade_history_strategy_idx
  ON public.arena_trade_history(strategy);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. arena_market_state — most recent global regime snapshot
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.arena_market_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state           text NOT NULL,
  confidence      numeric NOT NULL DEFAULT 50,
  volatility      numeric NOT NULL DEFAULT 20,
  trend_strength  numeric NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS arena_market_state_updated_at ON public.arena_market_state;
CREATE TRIGGER arena_market_state_updated_at
  BEFORE UPDATE ON public.arena_market_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. autonomous_state — SINGLETON row holding orchestrator JSONB
--
-- Why singleton: the autonomous orchestrator has exactly one global state.
-- Both the browser (when a tab is open) and the Vercel cron read+update this
-- so position multipliers, strategy bias, and accuracy windows persist.
--
-- Schema is JSONB so we can evolve the orchestrator without further migrations.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.autonomous_state (
  id          text PRIMARY KEY DEFAULT 'singleton'         -- only one row, ever
              CHECK (id = 'singleton'),
  state       jsonb NOT NULL DEFAULT '{}'::jsonb,
  decisions   jsonb NOT NULL DEFAULT '[]'::jsonb,           -- last 50 adaptive decisions
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- Optimistic-concurrency token: increments on every write so cron retries
  -- can detect lost updates.
  version     bigint NOT NULL DEFAULT 0
);

DROP TRIGGER IF EXISTS autonomous_state_updated_at ON public.autonomous_state;
CREATE TRIGGER autonomous_state_updated_at
  BEFORE UPDATE ON public.autonomous_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the singleton row so `update` always finds it
INSERT INTO public.autonomous_state (id, state, decisions, version)
VALUES ('singleton', '{}'::jsonb, '[]'::jsonb, 0)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. intelligence_signals — extension columns required by api/agents/ingest.ts
-- These columns are referenced in ingest.ts:130-138 but not in the original
-- schema. Add IF NOT EXISTS so re-running the migration is safe.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS regime           text,
  ADD COLUMN IF NOT EXISTS fear_greed_index integer,
  ADD COLUMN IF NOT EXISTS funding_rate     numeric,
  ADD COLUMN IF NOT EXISTS thesis           text,
  ADD COLUMN IF NOT EXISTS invalidation     text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Row Level Security (RLS)
--
-- Policy: all arena_* tables and autonomous_state are READABLE by everyone
-- (anonymous and authenticated), but WRITABLE only by the service-role key.
-- The Vercel cron uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely;
-- the browser uses the anon key and is therefore read-only.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.arena_agent_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_active_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_trade_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_market_state     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_state       ENABLE ROW LEVEL SECURITY;

-- Read-only anonymous + authenticated access
DO $$
BEGIN
  -- arena_agent_sessions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'arena_agent_sessions_read'
                 AND tablename = 'arena_agent_sessions') THEN
    CREATE POLICY arena_agent_sessions_read ON public.arena_agent_sessions
      FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- arena_active_positions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'arena_active_positions_read'
                 AND tablename = 'arena_active_positions') THEN
    CREATE POLICY arena_active_positions_read ON public.arena_active_positions
      FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- arena_trade_history
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'arena_trade_history_read'
                 AND tablename = 'arena_trade_history') THEN
    CREATE POLICY arena_trade_history_read ON public.arena_trade_history
      FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- arena_market_state
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'arena_market_state_read'
                 AND tablename = 'arena_market_state') THEN
    CREATE POLICY arena_market_state_read ON public.arena_market_state
      FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- autonomous_state
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'autonomous_state_read'
                 AND tablename = 'autonomous_state') THEN
    CREATE POLICY autonomous_state_read ON public.autonomous_state
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Realtime publication — broadcast row changes to subscribed clients
--
-- After this migration, the browser can do:
--   supabase.channel('arena')
--     .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_active_positions' }, ...)
--     .subscribe()
-- and receive live updates without polling.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Add to the default supabase_realtime publication if not already a member
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'arena_active_positions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_active_positions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'arena_agent_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_agent_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'arena_trade_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_trade_history;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'autonomous_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.autonomous_state;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Grants — anon + authenticated have SELECT, service_role has full access
-- (RLS already enforces this; explicit grants for clarity)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.arena_agent_sessions   TO anon, authenticated;
GRANT SELECT ON public.arena_active_positions TO anon, authenticated;
GRANT SELECT ON public.arena_trade_history    TO anon, authenticated;
GRANT SELECT ON public.arena_market_state     TO anon, authenticated;
GRANT SELECT ON public.autonomous_state       TO anon, authenticated;

GRANT ALL ON public.arena_agent_sessions   TO service_role;
GRANT ALL ON public.arena_active_positions TO service_role;
GRANT ALL ON public.arena_trade_history    TO service_role;
GRANT ALL ON public.arena_market_state     TO service_role;
GRANT ALL ON public.autonomous_state       TO service_role;

-- ============================================================================
-- DONE. After applying:
--   1. Add CRON_SECRET (random hex) and SUPABASE_SERVICE_ROLE_KEY to Vercel env
--   2. Browser becomes read-only on these tables (writes go through cron)
--   3. Realtime subscriptions replace polling loops
--   4. The autonomous_state row is the shared brain across browser + cron
-- ============================================================================
