-- Arena Marketing Data Pipeline
-- Creates tables to track Arena agent trades, positions, and sessions
-- Required for real-time marketing stats API

-- Drop existing tables if they exist (safe for new tables)
DROP TABLE IF EXISTS arena_trade_history CASCADE;
DROP TABLE IF EXISTS arena_active_positions CASCADE;
DROP TABLE IF EXISTS arena_agent_sessions CASCADE;

-- 1. Arena Trade History (completed trades)
CREATE TABLE arena_trade_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL, -- 'alphax', 'betax', 'gammax'
  symbol TEXT NOT NULL, -- 'BTCUSDT', 'ETHUSDT', etc
  direction TEXT NOT NULL, -- 'LONG' or 'SHORT'
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  entry_time BIGINT NOT NULL, -- Unix timestamp in ms
  exit_time BIGINT, -- Unix timestamp in ms
  pnl_percent NUMERIC, -- P&L as percentage
  pnl_usd NUMERIC, -- P&L in dollars
  is_win BOOLEAN,
  strategy TEXT, -- Strategy name used
  confidence NUMERIC,
  timestamp BIGINT NOT NULL, -- For ordering
  session_id UUID, -- Link to session
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_arena_trades_timestamp ON arena_trade_history(timestamp DESC);
CREATE INDEX idx_arena_trades_agent ON arena_trade_history(agent_id);
CREATE INDEX idx_arena_trades_symbol ON arena_trade_history(symbol);

-- 2. Arena Active Positions (currently open trades)
CREATE TABLE arena_active_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC,
  entry_time BIGINT NOT NULL,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  strategy TEXT,
  confidence NUMERIC,
  unrealized_pnl_percent NUMERIC,
  unrealized_pnl_usd NUMERIC,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_arena_positions_agent ON arena_active_positions(agent_id);
CREATE UNIQUE INDEX idx_arena_positions_agent_symbol ON arena_active_positions(agent_id, symbol);

-- 3. Arena Agent Sessions (performance tracking)
CREATE TABLE arena_agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  session_start BIGINT NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  total_pnl_percent NUMERIC DEFAULT 0,
  total_pnl_usd NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  consecutive_wins INTEGER DEFAULT 0,
  consecutive_losses INTEGER DEFAULT 0,
  best_trade_pnl NUMERIC DEFAULT 0,
  worst_trade_pnl NUMERIC DEFAULT 0,
  avg_trade_duration_minutes INTEGER DEFAULT 0,
  strategies_used TEXT[], -- Array of strategy names
  last_updated BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_arena_sessions_agent ON arena_agent_sessions(agent_id);
CREATE INDEX idx_arena_sessions_start ON arena_agent_sessions(session_start DESC);

-- 4. Enable Row Level Security (but allow service role to access)
ALTER TABLE arena_trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_active_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_agent_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write (for edge functions)
-- Drop policies if they exist, then create them
DROP POLICY IF EXISTS "Service role can access arena_trade_history" ON arena_trade_history;
CREATE POLICY "Service role can access arena_trade_history" ON arena_trade_history
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role can access arena_active_positions" ON arena_active_positions;
CREATE POLICY "Service role can access arena_active_positions" ON arena_active_positions
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role can access arena_agent_sessions" ON arena_agent_sessions;
CREATE POLICY "Service role can access arena_agent_sessions" ON arena_agent_sessions
  FOR ALL USING (true);
