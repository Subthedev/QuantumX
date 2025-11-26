-- Arena Session Storage - Production-grade persistence for trading data
-- Replaces localStorage for critical trading state

-- Arena agent sessions table
CREATE TABLE IF NOT EXISTS arena_agent_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL UNIQUE,
  trades INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  pnl DECIMAL(20, 8) DEFAULT 0,
  balance_delta DECIMAL(20, 8) DEFAULT 0,
  daily_pnl DECIMAL(20, 8) DEFAULT 0,
  consecutive_losses INTEGER DEFAULT 0,
  circuit_breaker_level TEXT DEFAULT 'ACTIVE',
  halted_until TIMESTAMPTZ,
  last_trade_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Arena trade history table
CREATE TABLE IF NOT EXISTS arena_trade_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  exit_price DECIMAL(20, 8),
  quantity DECIMAL(20, 8) NOT NULL,
  pnl_percent DECIMAL(10, 4),
  pnl_dollar DECIMAL(20, 8),
  is_win BOOLEAN,
  strategy TEXT,
  market_state TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Arena active positions table
CREATE TABLE IF NOT EXISTS arena_active_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL UNIQUE,
  position_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  display_symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  current_price DECIMAL(20, 8),
  quantity DECIMAL(20, 8) NOT NULL,
  take_profit_price DECIMAL(20, 8),
  stop_loss_price DECIMAL(20, 8),
  strategy TEXT,
  market_state_at_entry TEXT,
  entry_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Arena market state table
CREATE TABLE IF NOT EXISTS arena_market_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL,
  confidence DECIMAL(5, 2),
  volatility DECIMAL(5, 2),
  trend_strength DECIMAL(5, 2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_arena_trade_history_agent ON arena_trade_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_arena_trade_history_timestamp ON arena_trade_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_arena_agent_sessions_agent ON arena_agent_sessions(agent_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_arena_agent_sessions_updated_at ON arena_agent_sessions;
CREATE TRIGGER update_arena_agent_sessions_updated_at
  BEFORE UPDATE ON arena_agent_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_arena_active_positions_updated_at ON arena_active_positions;
CREATE TRIGGER update_arena_active_positions_updated_at
  BEFORE UPDATE ON arena_active_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE arena_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_active_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_market_state ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (for demo - in production, add user_id column and proper auth)
CREATE POLICY "Allow public read arena_agent_sessions" ON arena_agent_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert arena_agent_sessions" ON arena_agent_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update arena_agent_sessions" ON arena_agent_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow public read arena_trade_history" ON arena_trade_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert arena_trade_history" ON arena_trade_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read arena_active_positions" ON arena_active_positions FOR SELECT USING (true);
CREATE POLICY "Allow public insert arena_active_positions" ON arena_active_positions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update arena_active_positions" ON arena_active_positions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete arena_active_positions" ON arena_active_positions FOR DELETE USING (true);

CREATE POLICY "Allow public read arena_market_state" ON arena_market_state FOR SELECT USING (true);
CREATE POLICY "Allow public insert arena_market_state" ON arena_market_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update arena_market_state" ON arena_market_state FOR UPDATE USING (true);

-- Insert initial market state
INSERT INTO arena_market_state (state, confidence, volatility, trend_strength)
VALUES ('RANGEBOUND', 50, 20, 0)
ON CONFLICT DO NOTHING;
