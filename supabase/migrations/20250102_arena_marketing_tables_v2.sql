-- Arena Marketing Data Pipeline V2
-- Creates tables matching arenaSupabaseStorage.ts schema exactly
-- Required for real-time marketing stats API

-- Drop existing tables if they exist (safe for recreation)
DROP TABLE IF EXISTS arena_trade_history CASCADE;
DROP TABLE IF EXISTS arena_active_positions CASCADE;
DROP TABLE IF EXISTS arena_agent_sessions CASCADE;
DROP TABLE IF EXISTS arena_market_state CASCADE;

-- 1. Arena Agent Sessions (agent trading stats and balance)
CREATE TABLE arena_agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT UNIQUE NOT NULL, -- 'alphax', 'betax', 'gammax'
  trades INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  pnl NUMERIC DEFAULT 0,
  balance_delta NUMERIC DEFAULT 0,
  consecutive_losses INTEGER DEFAULT 0,
  circuit_breaker_level TEXT DEFAULT 'ACTIVE',
  halted_until TIMESTAMP,
  last_trade_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_arena_sessions_agent ON arena_agent_sessions(agent_id);

-- 2. Arena Trade History (completed trades)
CREATE TABLE arena_trade_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'LONG' or 'SHORT'
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  quantity NUMERIC NOT NULL,
  pnl_percent NUMERIC,
  pnl_dollar NUMERIC,
  is_win BOOLEAN,
  strategy TEXT,
  market_state TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_arena_trades_timestamp ON arena_trade_history(timestamp DESC);
CREATE INDEX idx_arena_trades_agent ON arena_trade_history(agent_id);
CREATE INDEX idx_arena_trades_symbol ON arena_trade_history(symbol);

-- 3. Arena Active Positions (currently open trades)
CREATE TABLE arena_active_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT UNIQUE NOT NULL,
  position_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  display_symbol TEXT NOT NULL, -- THIS IS THE CRITICAL COLUMN
  direction TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  take_profit_price NUMERIC,
  stop_loss_price NUMERIC,
  strategy TEXT,
  market_state_at_entry TEXT,
  entry_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_arena_positions_agent ON arena_active_positions(agent_id);

-- 4. Arena Market State (current market regime)
CREATE TABLE arena_market_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  volatility NUMERIC NOT NULL,
  trend_strength NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Enable Row Level Security (but allow service role to access)
ALTER TABLE arena_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_active_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_market_state ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write (for edge functions)
-- Drop policies if they exist, then create them
DROP POLICY IF EXISTS "Service role can access arena_agent_sessions" ON arena_agent_sessions;
CREATE POLICY "Service role can access arena_agent_sessions" ON arena_agent_sessions
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role can access arena_trade_history" ON arena_trade_history;
CREATE POLICY "Service role can access arena_trade_history" ON arena_trade_history
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role can access arena_active_positions" ON arena_active_positions;
CREATE POLICY "Service role can access arena_active_positions" ON arena_active_positions
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role can access arena_market_state" ON arena_market_state;
CREATE POLICY "Service role can access arena_market_state" ON arena_market_state
  FOR ALL USING (true);

-- Grant permissions to anon and authenticated users (read-only for marketing API)
GRANT SELECT ON arena_agent_sessions TO anon, authenticated;
GRANT SELECT ON arena_trade_history TO anon, authenticated;
GRANT SELECT ON arena_active_positions TO anon, authenticated;
GRANT SELECT ON arena_market_state TO anon, authenticated;
