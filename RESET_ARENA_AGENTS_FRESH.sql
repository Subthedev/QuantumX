-- RESET ALL ARENA AGENTS - FRESH START
-- Run this in Supabase SQL Editor to clear all agent trading history

-- 1. Delete all mock trading positions for the 3 arena agents
DELETE FROM mock_trading_positions
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix');

-- 2. Delete all mock trading stats for the 3 arena agents
DELETE FROM mock_trading_stats
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix');

-- 3. Verify deletion
SELECT
  'Positions remaining' as check_type,
  COUNT(*) as count
FROM mock_trading_positions
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix')

UNION ALL

SELECT
  'Stats remaining' as check_type,
  COUNT(*) as count
FROM mock_trading_stats
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix');

-- Expected result: Both counts should be 0

-- ✅ All agents now start fresh with no trading history!
