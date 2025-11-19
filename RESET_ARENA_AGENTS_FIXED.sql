-- ========================================
-- RESET ARENA AGENTS - Clear Fake Trades (FIXED)
-- ========================================
-- This script clears all fake seed trades from arena agent accounts
-- Run this in Supabase SQL Editor to start fresh with real Intelligence Hub trades only

-- Delete all positions for arena agents
DELETE FROM mock_trading_positions
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix');

-- Delete all trading history for arena agents
DELETE FROM mock_trading_history
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix');

-- Reset arena agent accounts to initial state
UPDATE mock_trading_accounts
SET
  balance = 10000,
  initial_balance = 10000,
  total_trades = 0,
  winning_trades = 0,
  losing_trades = 0,
  total_profit_loss = 0
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix');

-- Insert fresh accounts if they don't exist
INSERT INTO mock_trading_accounts (user_id, balance, initial_balance, total_trades, winning_trades, losing_trades, total_profit_loss)
VALUES
  ('agent-nexus-01', 10000, 10000, 0, 0, 0, 0),
  ('agent-quantum-x', 10000, 10000, 0, 0, 0, 0),
  ('agent-zeonix', 10000, 10000, 0, 0, 0, 0)
ON CONFLICT (user_id) DO NOTHING;

-- Verify reset
SELECT
  user_id,
  balance,
  initial_balance,
  total_trades,
  winning_trades,
  losing_trades,
  total_profit_loss
FROM mock_trading_accounts
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix');
