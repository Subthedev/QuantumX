-- SIGNAL LOGGING SYSTEM
-- Tracks EVERY strategy trigger and outcome for performance analysis
-- Essential for understanding what works and what doesn't

-- Table: strategy_triggers
-- Logs every time a strategy evaluates a coin (even if rejected)
CREATE TABLE IF NOT EXISTS strategy_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Coin & Context
  symbol VARCHAR(50) NOT NULL,
  strategy_name VARCHAR(50) NOT NULL,

  -- Market Context at Trigger Time
  trigger_reason TEXT NOT NULL,
  trigger_priority VARCHAR(10), -- HIGH, MEDIUM, LOW
  market_price NUMERIC(20, 8) NOT NULL,
  price_change_1h NUMERIC(10, 4),
  volume_24h NUMERIC(20, 2),
  market_phase VARCHAR(20),

  -- Strategy Output
  signal_generated BOOLEAN DEFAULT FALSE,
  signal_type VARCHAR(10), -- BUY or SELL
  confidence NUMERIC(5, 2),
  rejected BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,

  -- Strategy Analysis
  reasoning TEXT[],
  indicators JSONB,

  -- Performance Tracking
  linked_signal_id UUID, -- Reference to intelligence_signals if signal was created

  INDEX idx_strategy_triggers_symbol (symbol),
  INDEX idx_strategy_triggers_strategy (strategy_name),
  INDEX idx_strategy_triggers_created (created_at DESC),
  INDEX idx_strategy_triggers_signal (signal_generated, strategy_name)
);

-- Table: signal_outcomes
-- Tracks actual P&L outcomes of generated signals
CREATE TABLE IF NOT EXISTS signal_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Reference
  signal_id UUID NOT NULL REFERENCES intelligence_signals(id),
  strategy_name VARCHAR(50) NOT NULL,
  symbol VARCHAR(50) NOT NULL,

  -- Entry Data
  entry_price NUMERIC(20, 8),
  entry_time TIMESTAMPTZ,
  position_size NUMERIC(10, 4), -- For tracking if user actually took the trade

  -- Exit Data
  exit_price NUMERIC(20, 8),
  exit_time TIMESTAMPTZ,
  exit_reason VARCHAR(50), -- 'TARGET_1', 'TARGET_2', 'TARGET_3', 'STOP_LOSS', 'EXPIRED', 'MANUAL'

  -- P&L
  profit_loss_percent NUMERIC(10, 4),
  profit_loss_usd NUMERIC(20, 2),

  -- Target Hits
  target_1_hit BOOLEAN DEFAULT FALSE,
  target_1_hit_time TIMESTAMPTZ,
  target_2_hit BOOLEAN DEFAULT FALSE,
  target_2_hit_time TIMESTAMPTZ,
  target_3_hit BOOLEAN DEFAULT FALSE,
  target_3_hit_time TIMESTAMPTZ,
  stop_loss_hit BOOLEAN DEFAULT FALSE,
  stop_loss_hit_time TIMESTAMPTZ,

  -- Max Move
  max_profit_percent NUMERIC(10, 4), -- How high did it go
  max_drawdown_percent NUMERIC(10, 4), -- How low did it go

  -- Final Status
  outcome VARCHAR(20), -- 'SUCCESS', 'FAILED', 'PARTIAL', 'EXPIRED'

  INDEX idx_signal_outcomes_signal (signal_id),
  INDEX idx_signal_outcomes_strategy (strategy_name),
  INDEX idx_signal_outcomes_symbol (symbol),
  INDEX idx_signal_outcomes_outcome (outcome, strategy_name)
);

-- Table: strategy_performance_daily
-- Aggregated daily performance metrics per strategy
CREATE TABLE IF NOT EXISTS strategy_performance_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  strategy_name VARCHAR(50) NOT NULL,

  -- Trigger Stats
  total_triggers INTEGER DEFAULT 0,
  signals_generated INTEGER DEFAULT 0,
  signals_rejected INTEGER DEFAULT 0,

  -- Signal Stats
  total_signals INTEGER DEFAULT 0,
  successful_signals INTEGER DEFAULT 0,
  failed_signals INTEGER DEFAULT 0,
  expired_signals INTEGER DEFAULT 0,

  -- Performance Metrics
  success_rate NUMERIC(5, 2),
  avg_profit_percent NUMERIC(10, 4),
  avg_loss_percent NUMERIC(10, 4),
  profit_factor NUMERIC(10, 4),
  total_profit_usd NUMERIC(20, 2),
  total_loss_usd NUMERIC(20, 2),

  -- Risk Metrics
  sharpe_ratio NUMERIC(10, 4),
  max_drawdown_percent NUMERIC(10, 4),
  win_streak INTEGER DEFAULT 0,
  loss_streak INTEGER DEFAULT 0,

  -- Best/Worst
  best_trade_percent NUMERIC(10, 4),
  worst_trade_percent NUMERIC(10, 4),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date, strategy_name),
  INDEX idx_strategy_perf_daily_date (date DESC),
  INDEX idx_strategy_perf_daily_strategy (strategy_name)
);

-- Table: data_source_health
-- Monitors health of WebSocket/HTTP data sources
CREATE TABLE IF NOT EXISTS data_source_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  source_name VARCHAR(50) NOT NULL, -- 'BINANCE_WS', 'HTTP_FALLBACK', 'COINGECKO'
  status VARCHAR(20) NOT NULL, -- 'ONLINE', 'OFFLINE', 'DEGRADED'

  -- Metrics
  data_points_received INTEGER DEFAULT 0,
  validation_failures INTEGER DEFAULT 0,
  latency_ms INTEGER,
  uptime_percent NUMERIC(5, 2),

  -- Issues
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  INDEX idx_data_source_health_source (source_name),
  INDEX idx_data_source_health_timestamp (timestamp DESC)
);

-- Function: Update strategy performance daily
CREATE OR REPLACE FUNCTION update_strategy_performance_daily()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO strategy_performance_daily (
    date,
    strategy_name,
    total_signals,
    successful_signals,
    failed_signals
  ) VALUES (
    CURRENT_DATE,
    NEW.strategy_name,
    1,
    CASE WHEN NEW.outcome = 'SUCCESS' THEN 1 ELSE 0 END,
    CASE WHEN NEW.outcome = 'FAILED' THEN 1 ELSE 0 END
  )
  ON CONFLICT (date, strategy_name)
  DO UPDATE SET
    total_signals = strategy_performance_daily.total_signals + 1,
    successful_signals = strategy_performance_daily.successful_signals +
      CASE WHEN NEW.outcome = 'SUCCESS' THEN 1 ELSE 0 END,
    failed_signals = strategy_performance_daily.failed_signals +
      CASE WHEN NEW.outcome = 'FAILED' THEN 1 ELSE 0 END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update daily performance
CREATE TRIGGER trigger_update_strategy_performance_daily
AFTER INSERT OR UPDATE ON signal_outcomes
FOR EACH ROW
EXECUTE FUNCTION update_strategy_performance_daily();

-- Add RLS policies for authenticated users
ALTER TABLE strategy_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_performance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_source_health ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all logging data
CREATE POLICY "Allow authenticated users to read strategy_triggers"
  ON strategy_triggers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read signal_outcomes"
  ON signal_outcomes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read strategy_performance_daily"
  ON strategy_performance_daily FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read data_source_health"
  ON data_source_health FOR SELECT
  TO authenticated
  USING (true);

-- System can insert into all tables
CREATE POLICY "Allow service role to insert strategy_triggers"
  ON strategy_triggers FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service role to insert signal_outcomes"
  ON signal_outcomes FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role to manage strategy_performance_daily"
  ON strategy_performance_daily FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role to manage data_source_health"
  ON data_source_health FOR ALL
  TO service_role
  USING (true);

COMMENT ON TABLE strategy_triggers IS 'Logs every strategy evaluation - used to track what triggers analysis and why';
COMMENT ON TABLE signal_outcomes IS 'Tracks actual P&L outcomes of generated signals for performance analysis';
COMMENT ON TABLE strategy_performance_daily IS 'Daily aggregated performance metrics per strategy';
COMMENT ON TABLE data_source_health IS 'Monitors health and uptime of data sources (WebSocket, HTTP fallback)';
