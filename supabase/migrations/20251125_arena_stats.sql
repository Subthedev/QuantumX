-- Arena Agent Stats Table
-- Stores persistent trading metrics for Arena agents

CREATE TABLE IF NOT EXISTS arena_agent_stats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  balance DECIMAL DEFAULT 10000,
  total_pnl DECIMAL DEFAULT 0,
  total_pnl_percent DECIMAL DEFAULT 0,
  win_rate DECIMAL DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  streak_type TEXT,
  last_trade_time BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default agents if they don't exist
INSERT INTO arena_agent_stats (id, name) VALUES
  ('alphax', 'AlphaX'),
  ('betax', 'BetaX'),
  ('gammax', 'GammaX')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE arena_agent_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for arena stats (no auth required for demo)
CREATE POLICY "Allow public read" ON arena_agent_stats FOR SELECT USING (true);
CREATE POLICY "Allow public update" ON arena_agent_stats FOR UPDATE USING (true);
CREATE POLICY "Allow public insert" ON arena_agent_stats FOR INSERT WITH CHECK (true);
