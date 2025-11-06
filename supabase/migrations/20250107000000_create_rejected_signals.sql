-- IGX Intelligence Hub - Rejected Signals Tracking
-- Created: January 7, 2025
-- Purpose: Track all rejected signals for transparency and debugging

CREATE TABLE IF NOT EXISTS rejected_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Signal details
  symbol TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('LONG', 'SHORT', 'NEUTRAL')),

  -- Rejection info
  rejection_stage TEXT NOT NULL CHECK (rejection_stage IN ('ALPHA', 'BETA', 'GAMMA', 'DELTA')),
  rejection_reason TEXT NOT NULL,

  -- Quality metrics
  quality_score DECIMAL,
  confidence_score DECIMAL,
  data_quality DECIMAL,

  -- Strategy breakdown (JSON)
  strategy_votes JSONB, -- Array of {strategy: string, vote: string, confidence: number}

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT rejected_signals_symbol_check CHECK (length(symbol) <= 20)
);

-- Indexes for fast querying
CREATE INDEX idx_rejected_signals_symbol ON rejected_signals(symbol);
CREATE INDEX idx_rejected_signals_stage ON rejected_signals(rejection_stage);
CREATE INDEX idx_rejected_signals_created_at ON rejected_signals(created_at DESC);

-- RLS (Row Level Security) - Public read for demo purposes
-- In production, restrict to authenticated users
ALTER TABLE rejected_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to rejected signals"
  ON rejected_signals
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to rejected signals"
  ON rejected_signals
  FOR INSERT
  WITH CHECK (true);

-- Automatic cleanup: Delete rejected signals older than 7 days
-- This prevents the table from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_rejected_signals()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rejected_signals
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Schedule cleanup (requires pg_cron extension)
-- Note: This is optional and requires enabling pg_cron in Supabase dashboard
-- SELECT cron.schedule(
--   'cleanup-rejected-signals',
--   '0 0 * * *', -- Every day at midnight
--   $$SELECT cleanup_old_rejected_signals()$$
-- );

COMMENT ON TABLE rejected_signals IS 'Institutional-grade signal rejection tracking for transparency and debugging';
COMMENT ON COLUMN rejected_signals.rejection_stage IS 'Pipeline stage where signal was rejected: ALPHA (strategy), BETA (consensus), GAMMA (market matcher), DELTA (quality filter)';
COMMENT ON COLUMN rejected_signals.rejection_reason IS 'Human-readable explanation of why the signal was rejected';
COMMENT ON COLUMN rejected_signals.quality_score IS 'Delta V2 quality score (0-100)';
COMMENT ON COLUMN rejected_signals.confidence_score IS 'Beta consensus confidence (0-100)';
COMMENT ON COLUMN rejected_signals.strategy_votes IS 'JSON array of individual strategy votes for analysis';
