-- ============================================================================
-- PHASE 5: DATA INTEGRITY VERIFICATION QUERIES
--
-- Run these queries in Supabase Dashboard SQL Editor to verify data integrity
-- URL: https://supabase.com/dashboard/project/vidziydspeewmcexqicg/sql/new
--
-- Date: December 3, 2025
-- ============================================================================

-- ============================================================================
-- 1. ARENA TRADING DATA INTEGRITY
-- ============================================================================

-- 1a. Check for P&L discrepancies between positions and history
SELECT 'P&L Discrepancy Check' as test_name,
       COUNT(*) as discrepancies
FROM (
    SELECT h.id, h.profit_loss as history_pnl,
           CASE
               WHEN h.side = 'BUY' THEN (h.exit_price - h.entry_price) * h.quantity
               WHEN h.side = 'SELL' THEN (h.entry_price - h.exit_price) * h.quantity
           END as calculated_pnl
    FROM mock_trading_history h
    WHERE ABS(h.profit_loss -
          CASE
              WHEN h.side = 'BUY' THEN (h.exit_price - h.entry_price) * h.quantity
              WHEN h.side = 'SELL' THEN (h.entry_price - h.exit_price) * h.quantity
          END) > 1.0 -- Allow $1 tolerance for fees
) discrepancies;

-- 1b. Check for orphaned positions (no matching account)
SELECT 'Orphaned Positions Check' as test_name,
       COUNT(*) as orphaned_positions
FROM mock_trading_positions p
LEFT JOIN mock_trading_accounts a ON p.user_id = a.user_id
WHERE a.id IS NULL;

-- 1c. Verify balance accuracy for agent accounts
SELECT 'Balance Accuracy Check' as test_name,
       a.user_id,
       a.display_name,
       a.balance as current_balance,
       a.initial_balance,
       a.total_profit_loss as recorded_pnl,
       COALESCE(SUM(h.profit_loss), 0) as calculated_pnl,
       ABS(a.total_profit_loss - COALESCE(SUM(h.profit_loss), 0)) as discrepancy
FROM mock_trading_accounts a
LEFT JOIN mock_trading_history h ON a.user_id = h.user_id
WHERE a.user_id LIKE 'agent_%'
GROUP BY a.user_id, a.display_name, a.balance, a.initial_balance, a.total_profit_loss
HAVING ABS(a.total_profit_loss - COALESCE(SUM(h.profit_loss), 0)) > 0.01;

-- 1d. Check for duplicate positions (same symbol, same user, both OPEN)
SELECT 'Duplicate Position Check' as test_name,
       user_id, symbol, COUNT(*) as duplicate_count
FROM mock_trading_positions
WHERE status = 'OPEN'
GROUP BY user_id, symbol
HAVING COUNT(*) > 1;

-- ============================================================================
-- 2. ORACLE PREDICTION INTEGRITY
-- ============================================================================

-- 2a. Check for duplicate early bird ranks
SELECT 'Duplicate Early Bird Ranks' as test_name,
       question_id, early_bird_rank, COUNT(*) as duplicates
FROM qx_predictions
WHERE is_early_bird = true AND early_bird_rank IS NOT NULL
GROUP BY question_id, early_bird_rank
HAVING COUNT(*) > 1;

-- 2b. Verify early bird rank sequence (should be 1-100, no gaps)
SELECT 'Early Bird Sequence Gaps' as test_name,
       q.id as question_id,
       MAX(p.early_bird_rank) as max_rank,
       COUNT(p.id) as early_bird_count,
       CASE
           WHEN MAX(p.early_bird_rank) = COUNT(p.id) THEN 'OK'
           ELSE 'GAPS DETECTED'
       END as status
FROM qx_questions q
LEFT JOIN qx_predictions p ON q.id = p.question_id AND p.is_early_bird = true
WHERE q.status = 'RESOLVED'
GROUP BY q.id
HAVING MAX(p.early_bird_rank) != COUNT(p.id);

-- 2c. Check for predictions on non-existent questions
SELECT 'Orphaned Predictions' as test_name,
       COUNT(*) as orphaned_predictions
FROM qx_predictions p
LEFT JOIN qx_questions q ON p.question_id = q.id
WHERE q.id IS NULL;

-- 2d. Verify reward calculations (correct answer = positive reward)
SELECT 'Reward Integrity Check' as test_name,
       COUNT(*) as incorrect_rewards
FROM qx_predictions p
JOIN qx_questions q ON p.question_id = q.id
WHERE q.status = 'RESOLVED'
  AND p.is_correct = true
  AND p.total_reward <= 0;

-- ============================================================================
-- 3. LEADERBOARD INTEGRITY
-- ============================================================================

-- 3a. Verify QX balance calculations
SELECT 'QX Balance Accuracy' as test_name,
       b.user_id,
       b.balance as recorded_balance,
       COALESCE(SUM(p.total_reward), 0) as calculated_balance,
       ABS(b.balance - COALESCE(SUM(p.total_reward), 0)) as discrepancy
FROM qx_balances b
LEFT JOIN qx_predictions p ON b.user_id = p.user_id AND p.is_correct = true
GROUP BY b.user_id, b.balance
HAVING ABS(b.balance - COALESCE(SUM(p.total_reward), 0)) > 1;

-- 3b. Verify accuracy percentage calculations
SELECT 'Accuracy Calculation Check' as test_name,
       b.user_id,
       b.total_predictions,
       b.correct_predictions,
       b.accuracy_percent as recorded_accuracy,
       CASE
           WHEN b.total_predictions > 0
           THEN ROUND((b.correct_predictions::numeric / b.total_predictions) * 100, 2)
           ELSE 0
       END as calculated_accuracy,
       ABS(b.accuracy_percent -
           CASE
               WHEN b.total_predictions > 0
               THEN ROUND((b.correct_predictions::numeric / b.total_predictions) * 100, 2)
               ELSE 0
           END) as discrepancy
FROM qx_balances b
WHERE ABS(b.accuracy_percent -
      CASE
          WHEN b.total_predictions > 0
          THEN ROUND((b.correct_predictions::numeric / b.total_predictions) * 100, 2)
          ELSE 0
      END) > 0.1;

-- ============================================================================
-- 4. SYSTEM HEALTH CHECKS
-- ============================================================================

-- 4a. Check for stale data (positions not updated in 24h)
SELECT 'Stale Positions Check' as test_name,
       COUNT(*) as stale_positions
FROM mock_trading_positions
WHERE status = 'OPEN'
  AND updated_at < NOW() - INTERVAL '24 hours';

-- 4b. Check for questions stuck in wrong status
SELECT 'Stuck Questions Check' as test_name,
       status, COUNT(*) as count
FROM qx_questions
WHERE (status = 'SCHEDULED' AND opens_at < NOW() - INTERVAL '1 hour')
   OR (status = 'OPEN' AND closes_at < NOW() - INTERVAL '1 hour')
   OR (status = 'CLOSED' AND resolves_at < NOW() - INTERVAL '1 hour')
GROUP BY status;

-- 4c. Database size and row counts
SELECT 'Table Statistics' as test_name,
       table_name,
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size,
       (SELECT COUNT(*) FROM information_schema.columns c
        WHERE c.table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('mock_trading_accounts', 'mock_trading_positions',
                     'mock_trading_history', 'qx_predictions',
                     'qx_questions', 'qx_balances', 'arena_trade_history')
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;

-- ============================================================================
-- 5. ATOMIC OPERATION VERIFICATION
-- ============================================================================

-- 5a. Verify atomic functions exist
SELECT 'Atomic Functions Check' as test_name,
       routine_name,
       'EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('open_position_atomic', 'close_position_atomic',
                       'create_account_with_lock', 'assign_early_bird',
                       'capture_phase_multiplier');

-- 5b. Verify triggers exist
SELECT 'Triggers Check' as test_name,
       trigger_name,
       event_object_table,
       event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('trigger_early_bird', 'trigger_capture_phase_multiplier');

-- ============================================================================
-- SUMMARY QUERY - Run this for a quick health check
-- ============================================================================
SELECT 'SYSTEM HEALTH SUMMARY' as category, '' as metric, '' as value
UNION ALL
SELECT '---', '---', '---'
UNION ALL
SELECT 'Arena Trading', 'Total Accounts', COUNT(*)::text FROM mock_trading_accounts
UNION ALL
SELECT 'Arena Trading', 'Open Positions', COUNT(*)::text FROM mock_trading_positions WHERE status = 'OPEN'
UNION ALL
SELECT 'Arena Trading', 'Total Trades', COUNT(*)::text FROM mock_trading_history
UNION ALL
SELECT 'Oracle', 'Total Questions', COUNT(*)::text FROM qx_questions
UNION ALL
SELECT 'Oracle', 'Total Predictions', COUNT(*)::text FROM qx_predictions
UNION ALL
SELECT 'Oracle', 'Active Predictors', COUNT(DISTINCT user_id)::text FROM qx_predictions
UNION ALL
SELECT 'Leaderboard', 'Registered Users', COUNT(*)::text FROM qx_balances
UNION ALL
SELECT 'Leaderboard', 'Total QX Distributed', COALESCE(SUM(balance), 0)::text FROM qx_balances;
