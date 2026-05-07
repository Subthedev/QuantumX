-- Server-side signal generation tables (Phase 2)
-- Applied to project abdjyaumafnewqjhsjlq via MCP. Replay on a fresh project
-- to recreate the schema.

CREATE TABLE IF NOT EXISTS public.intelligence_signals (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol                   text NOT NULL,
  signal_type              text NOT NULL CHECK (signal_type IN ('LONG', 'SHORT', 'NEUTRAL')),
  confidence               numeric NOT NULL,
  current_price            numeric,
  entry_min                numeric,
  entry_max                numeric,
  entry_price              numeric,
  target_1                 numeric,
  target_2                 numeric,
  target_3                 numeric,
  stop_loss                numeric,
  exit_price               numeric,
  hit_target               integer,
  hit_stop_loss            boolean,
  profit_loss_percent      numeric,
  risk_level               text NOT NULL DEFAULT 'MEDIUM',
  strength                 text NOT NULL DEFAULT '5',
  status                   text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','completed')),
  timeframe                text NOT NULL DEFAULT '4h',
  expires_at               timestamptz NOT NULL,
  completed_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  regime                   text,
  fear_greed_index         integer,
  funding_rate             numeric,
  thesis                   text,
  invalidation             text
);
CREATE INDEX IF NOT EXISTS intelligence_signals_status_idx     ON public.intelligence_signals(status);
CREATE INDEX IF NOT EXISTS intelligence_signals_symbol_idx     ON public.intelligence_signals(symbol);
CREATE INDEX IF NOT EXISTS intelligence_signals_created_at_idx ON public.intelligence_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS intelligence_signals_expires_at_idx ON public.intelligence_signals(expires_at);

DROP TRIGGER IF EXISTS intelligence_signals_updated_at ON public.intelligence_signals;
CREATE TRIGGER intelligence_signals_updated_at
  BEFORE UPDATE ON public.intelligence_signals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.signal_outcomes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id        uuid NOT NULL,
  symbol           text NOT NULL,
  direction        text NOT NULL,
  strategy         text,
  market_regime    text,
  entry_price      numeric,
  exit_price       numeric,
  return_pct       numeric,
  outcome          text NOT NULL,
  ml_outcome       text,
  training_value   numeric,
  quality_score    numeric,
  ml_probability   numeric,
  hold_duration_ms bigint,
  exit_reason      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signal_outcomes_signal_id_idx  ON public.signal_outcomes(signal_id);
CREATE INDEX IF NOT EXISTS signal_outcomes_symbol_idx     ON public.signal_outcomes(symbol);
CREATE INDEX IF NOT EXISTS signal_outcomes_created_at_idx ON public.signal_outcomes(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='intelligence_signals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.intelligence_signals;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='signal_outcomes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.signal_outcomes;
  END IF;
END $$;
