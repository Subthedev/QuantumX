-- =====================================================
-- Agent System Tables - 3-Agent Specialization
-- =====================================================
-- Creates tables for tracking agent performance and activity
-- Part of the Phase 1 implementation of the 5x17 Strategy Matrix
-- =====================================================

-- Agent types enum
DO $$ BEGIN
  CREATE TYPE agent_type AS ENUM ('alphaX', 'betaX', 'QuantumX');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Market state enum (if not already exists)
DO $$ BEGIN
  CREATE TYPE market_state_type AS ENUM (
    'BULLISH_HIGH_VOL',
    'BULLISH_LOW_VOL',
    'BEARISH_HIGH_VOL',
    'BEARISH_LOW_VOL',
    'RANGEBOUND'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- Agent Performance Tracking Table
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent agent_type NOT NULL,

  -- Performance metrics
  total_signals INTEGER DEFAULT 0,
  successful_signals INTEGER DEFAULT 0,
  failed_signals INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 50.0,

  -- Quality metrics
  avg_confidence NUMERIC DEFAULT 80.0,
  avg_quality_score NUMERIC DEFAULT 75.0,

  -- Market state activity
  market_states_active market_state_type[] DEFAULT ARRAY[]::market_state_type[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per agent
  CONSTRAINT unique_agent UNIQUE (agent)
);

-- =====================================================
-- Agent Activity Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent info
  agent agent_type NOT NULL,
  strategy TEXT NOT NULL,

  -- Signal details
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('LONG', 'SHORT')),
  confidence NUMERIC NOT NULL,
  quality_score NUMERIC NOT NULL,

  -- Market context
  market_state market_state_type NOT NULL,

  -- Metadata
  metadata JSONB,

  -- Outcome tracking (updated later when signal expires)
  outcome TEXT CHECK (outcome IN ('SUCCESS', 'FAILED', 'EXPIRED', 'PENDING')),
  profit_loss_percent NUMERIC,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- =====================================================
-- Market State History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS market_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Market state info
  state market_state_type NOT NULL,
  confidence NUMERIC NOT NULL,

  -- Metrics
  volatility NUMERIC NOT NULL,
  trend_strength NUMERIC NOT NULL,
  volume_24h_change NUMERIC,
  market_cap_change_24h NUMERIC,

  -- Additional metadata
  metadata JSONB,

  -- Timestamp
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_agent_activity_agent ON agent_activity_log(agent);
CREATE INDEX IF NOT EXISTS idx_agent_activity_symbol ON agent_activity_log(symbol);
CREATE INDEX IF NOT EXISTS idx_agent_activity_market_state ON agent_activity_log(market_state);
CREATE INDEX IF NOT EXISTS idx_agent_activity_outcome ON agent_activity_log(outcome);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created_at ON agent_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_state_history_state ON market_state_history(state);
CREATE INDEX IF NOT EXISTS idx_market_state_history_detected_at ON market_state_history(detected_at DESC);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_state_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access to agent performance (for UI display)
CREATE POLICY "Anyone can view agent performance"
  ON agent_performance FOR SELECT
  USING (true);

-- Service role can manage all tables
CREATE POLICY "Service role full access to agent_performance"
  ON agent_performance FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to agent_activity_log"
  ON agent_activity_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to market_state_history"
  ON market_state_history FOR ALL
  USING (auth.role() = 'service_role');

-- Allow public read access to activity log (for transparency)
CREATE POLICY "Anyone can view agent activity"
  ON agent_activity_log FOR SELECT
  USING (true);

-- Allow public read access to market state history
CREATE POLICY "Anyone can view market state history"
  ON market_state_history FOR SELECT
  USING (true);

-- =====================================================
-- Initialize Agent Performance Records
-- =====================================================
INSERT INTO agent_performance (agent, total_signals, successful_signals, win_rate, avg_confidence, avg_quality_score)
VALUES
  ('alphaX', 0, 0, 50.0, 80.0, 75.0),
  ('betaX', 0, 0, 50.0, 78.0, 73.0),
  ('QuantumX', 0, 0, 50.0, 82.0, 77.0)
ON CONFLICT (agent) DO NOTHING;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to update agent performance after signal resolution
CREATE OR REPLACE FUNCTION update_agent_performance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if outcome changed to a final state
  IF NEW.outcome IN ('SUCCESS', 'FAILED', 'EXPIRED') AND OLD.outcome = 'PENDING' THEN
    UPDATE agent_performance
    SET
      total_signals = total_signals + 1,
      successful_signals = CASE
        WHEN NEW.outcome = 'SUCCESS' THEN successful_signals + 1
        ELSE successful_signals
      END,
      failed_signals = CASE
        WHEN NEW.outcome IN ('FAILED', 'EXPIRED') THEN failed_signals + 1
        ELSE failed_signals
      END,
      win_rate = CASE
        WHEN total_signals + 1 > 0 THEN
          ((successful_signals + CASE WHEN NEW.outcome = 'SUCCESS' THEN 1 ELSE 0 END)::NUMERIC / (total_signals + 1)) * 100
        ELSE 50.0
      END,
      updated_at = NOW()
    WHERE agent = NEW.agent;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update performance when activity log outcome changes
DROP TRIGGER IF EXISTS agent_activity_outcome_trigger ON agent_activity_log;
CREATE TRIGGER agent_activity_outcome_trigger
  AFTER UPDATE OF outcome ON agent_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_performance();

-- Function to log market state changes
CREATE OR REPLACE FUNCTION log_market_state_change(
  p_state market_state_type,
  p_confidence NUMERIC,
  p_volatility NUMERIC,
  p_trend_strength NUMERIC,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO market_state_history (
    state,
    confidence,
    volatility,
    trend_strength,
    metadata,
    detected_at
  )
  VALUES (
    p_state,
    p_confidence,
    p_volatility,
    p_trend_strength,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE agent_performance IS 'Tracks cumulative performance metrics for each trading agent (alphaX/betaX/QuantumX)';
COMMENT ON TABLE agent_activity_log IS 'Logs all signal generation activities and outcomes for agent learning';
COMMENT ON TABLE market_state_history IS 'Historical record of market state detections for analysis and backtesting';

COMMENT ON FUNCTION update_agent_performance IS 'Automatically updates agent performance when signal outcomes are resolved';
COMMENT ON FUNCTION log_market_state_change IS 'Logs detected market state changes for historical tracking';

-- =====================================================
-- Verification Query
-- =====================================================
SELECT
  'Agent system tables created successfully' as message,
  (SELECT COUNT(*) FROM agent_performance) as agent_records,
  (SELECT COUNT(*) FROM agent_activity_log) as activity_logs,
  (SELECT COUNT(*) FROM market_state_history) as market_state_records;
