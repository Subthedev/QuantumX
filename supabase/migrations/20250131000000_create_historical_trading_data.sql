-- Historical Trading Data Tables
-- Stores order book and funding rate snapshots for analysis

-- Order Book History Table
CREATE TABLE IF NOT EXISTS order_book_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metrics
  mid_price DECIMAL(20, 8) NOT NULL,
  spread DECIMAL(20, 8) NOT NULL,
  spread_percent DECIMAL(10, 6) NOT NULL,
  total_bid_volume DECIMAL(20, 8) NOT NULL,
  total_ask_volume DECIMAL(20, 8) NOT NULL,
  buy_pressure DECIMAL(5, 2) NOT NULL,
  sell_pressure DECIMAL(5, 2) NOT NULL,
  bid_ask_ratio DECIMAL(10, 4) NOT NULL,

  -- Full order book data (JSONB for flexibility)
  bids JSONB NOT NULL,
  asks JSONB NOT NULL,

  -- Metadata
  last_update_id BIGINT,
  latency_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_orderbook_symbol_exchange_timestamp
  ON order_book_history(symbol, exchange, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_orderbook_timestamp
  ON order_book_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_orderbook_symbol
  ON order_book_history(symbol);

-- Funding Rate History Table
CREATE TABLE IF NOT EXISTS funding_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Funding data
  funding_rate DECIMAL(10, 6) NOT NULL,
  funding_time BIGINT NOT NULL,
  mark_price DECIMAL(20, 8) NOT NULL,
  next_funding_time BIGINT NOT NULL,
  predicted_funding_rate DECIMAL(10, 6),

  -- Averages
  avg_24h DECIMAL(10, 6),
  avg_7d DECIMAL(10, 6),
  trend TEXT CHECK (trend IN ('increasing', 'decreasing', 'stable')),

  -- Additional context
  market_cap BIGINT,
  market_cap_rank INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_funding_symbol_exchange_timestamp
  ON funding_rate_history(symbol, exchange, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_funding_timestamp
  ON funding_rate_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_funding_symbol
  ON funding_rate_history(symbol);

CREATE INDEX IF NOT EXISTS idx_funding_rate
  ON funding_rate_history(funding_rate DESC);

-- User Trading Alerts Table
CREATE TABLE IF NOT EXISTS trading_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Alert configuration
  alert_type TEXT NOT NULL CHECK (alert_type IN ('funding_rate', 'order_book_imbalance', 'spread', 'price', 'arbitrage')),
  symbol TEXT NOT NULL,
  exchange TEXT,

  -- Trigger conditions
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below', 'crosses', 'equals')),
  threshold DECIMAL(20, 8) NOT NULL,

  -- Notification preferences
  notify_push BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,
  notify_sms BOOLEAN DEFAULT false,

  -- Alert state
  enabled BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id
  ON trading_alerts(user_id);

CREATE INDEX IF NOT EXISTS idx_alerts_enabled
  ON trading_alerts(enabled) WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_alerts_symbol
  ON trading_alerts(symbol);

-- Enable Row Level Security
ALTER TABLE order_book_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_book_history (public read)
CREATE POLICY "Allow public read access to order book history"
  ON order_book_history
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for funding_rate_history (public read)
CREATE POLICY "Allow public read access to funding rate history"
  ON funding_rate_history
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for trading_alerts (user-specific)
CREATE POLICY "Users can view their own alerts"
  ON trading_alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alerts"
  ON trading_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON trading_alerts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
  ON trading_alerts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for trading_alerts
CREATE TRIGGER update_trading_alerts_updated_at
  BEFORE UPDATE ON trading_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old historical data (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_historical_data()
RETURNS void AS $$
BEGIN
  DELETE FROM order_book_history
  WHERE timestamp < NOW() - INTERVAL '30 days';

  DELETE FROM funding_rate_history
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE order_book_history IS 'Historical order book snapshots for all exchanges';
COMMENT ON TABLE funding_rate_history IS 'Historical funding rate data for perpetual futures';
COMMENT ON TABLE trading_alerts IS 'User-configured trading alerts and notifications';
