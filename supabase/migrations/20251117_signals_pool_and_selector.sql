-- Signals Pool and Intelligent Signal Selector Schema
-- Stores ALL Delta-approved signals before tier-based distribution

-- Create enum for signal status
CREATE TYPE signal_status AS ENUM (
  'approved_by_delta',  -- Just passed Delta, waiting for selection
  'published',          -- Selected and published to tiers
  'expired',            -- Expired before being published
  'rejected'            -- Rejected by selector
);

-- Create enum for market regime (matches the system)
CREATE TYPE market_regime AS ENUM (
  'BULLISH_TREND',
  'BEARISH_TREND',
  'SIDEWAYS',
  'HIGH_VOLATILITY',
  'LOW_VOLATILITY',
  'BREAKOUT',
  'BREAKDOWN',
  'CONSOLIDATION'
);

-- Signals Pool: Stores ALL signals that pass Delta V2
CREATE TABLE IF NOT EXISTS signals_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Signal identification
  signal_id TEXT NOT NULL UNIQUE, -- Unique ID for each signal
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('LONG', 'SHORT')),

  -- Quality metrics from Delta
  quality_score NUMERIC NOT NULL,
  ml_probability NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL,

  -- Market analysis
  signal_regime market_regime NOT NULL,
  strategy_name TEXT NOT NULL,

  -- Trading parameters
  entry_price NUMERIC NOT NULL,
  stop_loss NUMERIC NOT NULL,
  take_profit JSONB NOT NULL, -- Array of TP levels
  risk_reward_ratio NUMERIC,

  -- Additional metadata
  timeframe TEXT,
  indicators JSONB,
  metadata JSONB,

  -- Selection scoring (calculated by selector)
  regime_score NUMERIC DEFAULT 0,
  composite_score NUMERIC DEFAULT 0,

  -- Status tracking
  status signal_status NOT NULL DEFAULT 'approved_by_delta',
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Published Signals Metadata (tracks which pool signals are published)
CREATE TABLE IF NOT EXISTS published_signals_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_pool_id UUID NOT NULL REFERENCES signals_pool(id) ON DELETE CASCADE,

  -- Tier distribution
  published_to_tiers user_tier[] NOT NULL, -- ['FREE', 'PRO', 'MAX']
  tier_positions JSONB NOT NULL, -- {FREE: 1, PRO: 5, MAX: 12} - position in tier list

  -- Selection metadata
  selection_run_id UUID NOT NULL,
  current_regime market_regime NOT NULL,
  regime_match_score NUMERIC NOT NULL,
  composite_score NUMERIC NOT NULL,

  -- Performance tracking
  total_users_received INTEGER DEFAULT 0,

  -- Timestamps
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Selection Runs (tracks each periodic selection cycle)
CREATE TABLE IF NOT EXISTS signal_selection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Selection parameters
  current_regime market_regime NOT NULL,
  total_signals_in_pool INTEGER NOT NULL,
  signals_selected INTEGER NOT NULL,

  -- Tier distribution
  free_tier_signals INTEGER NOT NULL,
  pro_tier_signals INTEGER NOT NULL,
  max_tier_signals INTEGER NOT NULL,

  -- Run metadata
  selection_criteria JSONB,
  run_duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_signals_pool_status ON signals_pool(status);
CREATE INDEX idx_signals_pool_expires_at ON signals_pool(expires_at);
CREATE INDEX idx_signals_pool_signal_regime ON signals_pool(signal_regime);
CREATE INDEX idx_signals_pool_composite_score ON signals_pool(composite_score DESC);
CREATE INDEX idx_signals_pool_created_at ON signals_pool(created_at DESC);
CREATE INDEX idx_signals_pool_symbol ON signals_pool(symbol);

CREATE INDEX idx_published_signals_metadata_pool_id ON published_signals_metadata(signal_pool_id);
CREATE INDEX idx_published_signals_metadata_selection_run ON published_signals_metadata(selection_run_id);

CREATE INDEX idx_selection_runs_created_at ON signal_selection_runs(created_at DESC);
CREATE INDEX idx_selection_runs_regime ON signal_selection_runs(current_regime);

-- RLS Policies
ALTER TABLE signals_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_signals_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_selection_runs ENABLE ROW LEVEL SECURITY;

-- Service role full access (backend services need to manage signals)
CREATE POLICY "Service role full access to signals_pool"
  ON signals_pool FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to published_signals_metadata"
  ON published_signals_metadata FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to selection_runs"
  ON signal_selection_runs FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated users can view active signals in pool (for transparency)
CREATE POLICY "Authenticated users can view active signals"
  ON signals_pool FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND status IN ('approved_by_delta', 'published')
    AND expires_at > NOW()
  );

-- Update trigger for updated_at
CREATE TRIGGER update_signals_pool_updated_at
  BEFORE UPDATE ON signals_pool
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired signals from pool
CREATE OR REPLACE FUNCTION cleanup_expired_signals()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE signals_pool
  SET status = 'expired'
  WHERE status = 'approved_by_delta'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available signals for selection
CREATE OR REPLACE FUNCTION get_signals_for_selection()
RETURNS TABLE (
  id UUID,
  signal_id TEXT,
  symbol TEXT,
  signal_type TEXT,
  quality_score NUMERIC,
  ml_probability NUMERIC,
  confidence NUMERIC,
  signal_regime market_regime,
  strategy_name TEXT,
  entry_price NUMERIC,
  stop_loss NUMERIC,
  take_profit JSONB,
  risk_reward_ratio NUMERIC,
  composite_score NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.signal_id,
    sp.symbol,
    sp.signal_type,
    sp.quality_score,
    sp.ml_probability,
    sp.confidence,
    sp.signal_regime,
    sp.strategy_name,
    sp.entry_price,
    sp.stop_loss,
    sp.take_profit,
    sp.risk_reward_ratio,
    sp.composite_score,
    sp.created_at
  FROM signals_pool sp
  WHERE sp.status = 'approved_by_delta'
    AND sp.expires_at > NOW()
  ORDER BY sp.composite_score DESC, sp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE signals_pool IS 'Stores ALL signals that pass Delta V2 before tier-based selection';
COMMENT ON TABLE published_signals_metadata IS 'Tracks which pool signals are published to which tiers';
COMMENT ON TABLE signal_selection_runs IS 'Logs each periodic signal selection cycle';
COMMENT ON FUNCTION cleanup_expired_signals IS 'Marks expired signals in pool';
COMMENT ON FUNCTION get_signals_for_selection IS 'Returns available signals for intelligent selection';
