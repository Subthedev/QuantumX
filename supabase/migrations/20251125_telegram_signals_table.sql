-- TELEGRAM SIGNALS TABLE
-- Tracks all signals published to the QuantumX Telegram channel

CREATE TABLE IF NOT EXISTS telegram_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  entry_price NUMERIC NOT NULL,
  take_profit NUMERIC[] NOT NULL,
  stop_loss NUMERIC NOT NULL,
  strategy TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('ENTRY', 'EXIT')),
  pnl_percent NUMERIC,
  market_state TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by agent
CREATE INDEX IF NOT EXISTS idx_telegram_signals_agent_id ON telegram_signals(agent_id);

-- Index for querying by time
CREATE INDEX IF NOT EXISTS idx_telegram_signals_sent_at ON telegram_signals(sent_at DESC);

-- Index for querying by signal type
CREATE INDEX IF NOT EXISTS idx_telegram_signals_type ON telegram_signals(signal_type);

-- Add RLS (Row Level Security) - allow public read for now
ALTER TABLE telegram_signals ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read signals (they're public)
CREATE POLICY "Allow public read" ON telegram_signals
  FOR SELECT USING (true);

-- Only service role can insert signals (from Edge Function)
CREATE POLICY "Allow service role insert" ON telegram_signals
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE telegram_signals IS 'Tracks all trading signals published to QuantumX Telegram channel';
COMMENT ON COLUMN telegram_signals.agent_id IS 'ID of the trading agent (alphax, betax, gammax)';
COMMENT ON COLUMN telegram_signals.direction IS 'Trade direction: LONG or SHORT';
COMMENT ON COLUMN telegram_signals.take_profit IS 'Array of take profit levels';
COMMENT ON COLUMN telegram_signals.signal_type IS 'ENTRY for new positions, EXIT for closed positions';
COMMENT ON COLUMN telegram_signals.pnl_percent IS 'Profit/loss percentage (for EXIT signals)';
