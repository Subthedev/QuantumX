-- CLEAR ALL STALE ARENA AGENT DATA
-- Run this in Supabase SQL Editor to reset agents to fresh state

-- 1. Delete all positions for the 3 arena agents
DELETE FROM mock_trading_positions
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix');

-- 2. Delete all trading history for the 3 arena agents
DELETE FROM mock_trading_history
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix');

-- 3. Reset account balances to initial $10,000
UPDATE mock_trading_accounts
SET
  balance = 10000,
  initial_balance = 10000,
  total_trades = 0,
  winning_trades = 0,
  losing_trades = 0,
  total_profit_loss = 0,
  updated_at = NOW()
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix');

-- 4. Create accounts if they don't exist
INSERT INTO mock_trading_accounts (user_id, balance, initial_balance, display_name)
VALUES
  ('agent-nexus-01', 10000, 10000, 'NEXUS-01'),
  ('agent-quantum-x', 10000, 10000, 'QUANTUM-X'),
  ('agent-zeonix', 10000, 10000, 'ZEONIX')
ON CONFLICT (user_id) DO NOTHING;

-- 5. Verify reset
SELECT
  user_id,
  display_name,
  balance,
  total_trades,
  total_profit_loss,
  (SELECT COUNT(*) FROM mock_trading_positions WHERE user_id = mta.user_id) as open_positions
FROM mock_trading_accounts mta
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix')
ORDER BY user_id;

-- Expected: All agents should have $10,000 balance, 0 trades, 0 positions
