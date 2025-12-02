-- ============================================================================
-- PHASE 5: MONITORING DASHBOARD QUERIES
--
-- Production monitoring queries for Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/vidziydspeewmcexqicg/sql/new
--
-- Use these queries to monitor system health in production
--
-- Date: December 3, 2025
-- ============================================================================

-- ============================================================================
-- 1. ARENA TRADING METRICS
-- ============================================================================

-- 1a. Real-time trading activity (last 24h)
SELECT 'Arena Trading Activity (24h)' as metric,
       COUNT(*) as total_trades,
       COUNT(DISTINCT user_id) as unique_traders,
       SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as winning_trades,
       SUM(CASE WHEN profit_loss <= 0 THEN 1 ELSE 0 END) as losing_trades,
       ROUND(SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END)::numeric /
             NULLIF(COUNT(*), 0) * 100, 2) as win_rate_percent,
       ROUND(SUM(profit_loss)::numeric, 2) as total_pnl,
       ROUND(AVG(profit_loss)::numeric, 2) as avg_pnl_per_trade
FROM mock_trading_history
WHERE closed_at >= NOW() - INTERVAL '24 hours';

-- 1b. Agent performance leaderboard
SELECT 'Agent Leaderboard' as metric,
       a.display_name as agent_name,
       a.balance,
       a.initial_balance,
       ROUND((a.balance - a.initial_balance)::numeric, 2) as total_pnl,
       ROUND(((a.balance - a.initial_balance) / a.initial_balance * 100)::numeric, 2) as pnl_percent,
       a.total_trades,
       a.winning_trades,
       ROUND(a.winning_trades::numeric / NULLIF(a.total_trades, 0) * 100, 2) as win_rate
FROM mock_trading_accounts a
WHERE a.user_id LIKE 'agent_%'
ORDER BY (a.balance - a.initial_balance) DESC
LIMIT 10;

-- 1c. Open positions summary
SELECT 'Open Positions Summary' as metric,
       symbol,
       COUNT(*) as position_count,
       SUM(CASE WHEN side = 'BUY' THEN 1 ELSE 0 END) as long_positions,
       SUM(CASE WHEN side = 'SELL' THEN 1 ELSE 0 END) as short_positions,
       ROUND(SUM(unrealized_pnl)::numeric, 2) as total_unrealized_pnl,
       ROUND(AVG(unrealized_pnl_percent)::numeric, 2) as avg_pnl_percent
FROM mock_trading_positions
WHERE status = 'OPEN'
GROUP BY symbol
ORDER BY position_count DESC;

-- 1d. Trading volume by hour (last 24h)
SELECT 'Hourly Trading Volume' as metric,
       DATE_TRUNC('hour', closed_at) as hour,
       COUNT(*) as trades,
       ROUND(SUM(ABS(profit_loss))::numeric, 2) as volume
FROM mock_trading_history
WHERE closed_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', closed_at)
ORDER BY hour DESC;

-- ============================================================================
-- 2. ORACLE PREDICTION METRICS
-- ============================================================================

-- 2a. Question resolution status
SELECT 'Oracle Question Status' as metric,
       status,
       COUNT(*) as count,
       ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM qx_questions
GROUP BY status
ORDER BY count DESC;

-- 2b. Prediction activity (last 7 days)
SELECT 'Prediction Activity (7d)' as metric,
       DATE(created_at) as date,
       COUNT(*) as predictions,
       COUNT(DISTINCT user_id) as unique_predictors,
       SUM(CASE WHEN is_early_bird THEN 1 ELSE 0 END) as early_bird_count
FROM qx_predictions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 2c. Top predictors by accuracy
SELECT 'Top Predictors' as metric,
       user_id,
       balance as qx_balance,
       total_predictions,
       correct_predictions,
       ROUND((correct_predictions::numeric / NULLIF(total_predictions, 0) * 100), 2) as accuracy,
       current_streak,
       max_streak
FROM qx_balances
WHERE total_predictions >= 10
ORDER BY balance DESC
LIMIT 10;

-- 2d. Early bird slot availability
SELECT 'Early Bird Availability' as metric,
       q.id as question_id,
       q.question_text,
       q.status,
       COUNT(p.id) as predictions_made,
       100 - COUNT(p.id) as early_bird_slots_remaining,
       MAX(p.early_bird_rank) as highest_rank_assigned
FROM qx_questions q
LEFT JOIN qx_predictions p ON q.id = p.question_id AND p.is_early_bird = true
WHERE q.status IN ('SCHEDULED', 'OPEN')
GROUP BY q.id, q.question_text, q.status
ORDER BY q.opens_at;

-- ============================================================================
-- 3. SYSTEM PERFORMANCE METRICS
-- ============================================================================

-- 3a. Database table sizes
SELECT 'Database Table Sizes' as metric,
       relname as table_name,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size,
       pg_size_pretty(pg_relation_size(relid)) as data_size,
       pg_size_pretty(pg_indexes_size(relid)) as index_size,
       n_live_tup as row_count,
       n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

-- 3b. Index usage statistics
SELECT 'Index Usage' as metric,
       relname as table_name,
       indexrelname as index_name,
       idx_scan as times_used,
       idx_tup_read as rows_read,
       idx_tup_fetch as rows_fetched,
       pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;

-- 3c. Query execution count by table
SELECT 'Table Access Patterns' as metric,
       relname as table_name,
       seq_scan as sequential_scans,
       seq_tup_read as seq_rows_read,
       idx_scan as index_scans,
       idx_tup_fetch as idx_rows_fetched,
       n_tup_ins as inserts,
       n_tup_upd as updates,
       n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY (seq_scan + COALESCE(idx_scan, 0)) DESC;

-- ============================================================================
-- 4. ERROR MONITORING
-- ============================================================================

-- 4a. Stale positions (not updated in 24h)
SELECT 'Stale Positions Alert' as metric,
       id,
       user_id,
       symbol,
       side,
       entry_price,
       current_price,
       unrealized_pnl,
       opened_at,
       updated_at,
       NOW() - updated_at as time_since_update
FROM mock_trading_positions
WHERE status = 'OPEN'
  AND updated_at < NOW() - INTERVAL '24 hours'
ORDER BY updated_at ASC;

-- 4b. Questions stuck in wrong state
SELECT 'Stuck Questions Alert' as metric,
       id,
       status,
       opens_at,
       closes_at,
       resolves_at,
       CASE
           WHEN status = 'SCHEDULED' AND opens_at < NOW() THEN 'Should be OPEN'
           WHEN status = 'OPEN' AND closes_at < NOW() THEN 'Should be CLOSED'
           WHEN status = 'CLOSED' AND resolves_at < NOW() THEN 'Should be RESOLVED'
           ELSE 'OK'
       END as issue
FROM qx_questions
WHERE (status = 'SCHEDULED' AND opens_at < NOW() - INTERVAL '1 hour')
   OR (status = 'OPEN' AND closes_at < NOW() - INTERVAL '1 hour')
   OR (status = 'CLOSED' AND resolves_at < NOW() - INTERVAL '1 hour');

-- 4c. P&L discrepancy detection
SELECT 'P&L Discrepancy Alert' as metric,
       a.user_id,
       a.display_name,
       a.balance,
       a.initial_balance,
       a.total_profit_loss as recorded_pnl,
       COALESCE(SUM(h.profit_loss), 0) as calculated_pnl,
       a.total_profit_loss - COALESCE(SUM(h.profit_loss), 0) as discrepancy
FROM mock_trading_accounts a
LEFT JOIN mock_trading_history h ON a.user_id = h.user_id
WHERE a.user_id LIKE 'agent_%'
GROUP BY a.user_id, a.display_name, a.balance, a.initial_balance, a.total_profit_loss
HAVING ABS(a.total_profit_loss - COALESCE(SUM(h.profit_loss), 0)) > 1.0
ORDER BY ABS(a.total_profit_loss - COALESCE(SUM(h.profit_loss), 0)) DESC;

-- ============================================================================
-- 5. MARKETING API METRICS
-- ============================================================================

-- 5a. Agent trading stats for marketing
SELECT 'Marketing Stats - Agents' as metric,
       a.display_name as agent_name,
       a.balance,
       ROUND((a.balance - a.initial_balance)::numeric, 2) as pnl,
       ROUND(((a.balance - a.initial_balance) / a.initial_balance * 100)::numeric, 2) as pnl_percent,
       a.total_trades,
       ROUND(a.winning_trades::numeric / NULLIF(a.total_trades, 0) * 100, 1) as win_rate
FROM mock_trading_accounts a
WHERE a.user_id LIKE 'agent_%'
  AND a.total_trades > 0
ORDER BY (a.balance - a.initial_balance) DESC;

-- 5b. Oracle prediction stats for marketing
SELECT 'Marketing Stats - Oracle' as metric,
       COUNT(DISTINCT user_id) as total_predictors,
       COUNT(*) as total_predictions,
       SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_predictions,
       ROUND(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::numeric /
             NULLIF(COUNT(*), 0) * 100, 2) as overall_accuracy,
       SUM(COALESCE(total_reward, 0)) as total_qx_distributed
FROM qx_predictions;

-- 5c. Recent winning trades for marketing
SELECT 'Recent Winning Trades' as metric,
       h.symbol,
       h.side,
       h.entry_price,
       h.exit_price,
       h.profit_loss,
       h.profit_loss_percent,
       h.duration_minutes,
       h.strategy,
       h.closed_at
FROM mock_trading_history h
WHERE h.profit_loss > 0
  AND h.user_id LIKE 'agent_%'
ORDER BY h.closed_at DESC
LIMIT 10;

-- ============================================================================
-- 6. REAL-TIME DASHBOARD SUMMARY
-- ============================================================================

SELECT 'REAL-TIME DASHBOARD SUMMARY' as category,
       '' as metric,
       '' as value
UNION ALL SELECT '───────────────────────────', '', ''
UNION ALL SELECT 'ARENA TRADING', '', ''
UNION ALL SELECT '  Total Agent Accounts', '', (SELECT COUNT(*)::text FROM mock_trading_accounts WHERE user_id LIKE 'agent_%')
UNION ALL SELECT '  Open Positions', '', (SELECT COUNT(*)::text FROM mock_trading_positions WHERE status = 'OPEN')
UNION ALL SELECT '  Trades Today', '', (SELECT COUNT(*)::text FROM mock_trading_history WHERE closed_at >= CURRENT_DATE)
UNION ALL SELECT '  Total P&L Today', '', (SELECT COALESCE(ROUND(SUM(profit_loss)::numeric, 2), 0)::text || ' USD' FROM mock_trading_history WHERE closed_at >= CURRENT_DATE)
UNION ALL SELECT '───────────────────────────', '', ''
UNION ALL SELECT 'ORACLE PREDICTIONS', '', ''
UNION ALL SELECT '  Active Questions', '', (SELECT COUNT(*)::text FROM qx_questions WHERE status IN ('SCHEDULED', 'OPEN'))
UNION ALL SELECT '  Total Predictions', '', (SELECT COUNT(*)::text FROM qx_predictions)
UNION ALL SELECT '  Predictors', '', (SELECT COUNT(DISTINCT user_id)::text FROM qx_predictions)
UNION ALL SELECT '  Total QX Distributed', '', (SELECT COALESCE(SUM(balance), 0)::text || ' QX' FROM qx_balances)
UNION ALL SELECT '───────────────────────────', '', ''
UNION ALL SELECT 'SYSTEM HEALTH', '', ''
UNION ALL SELECT '  Stale Positions', '', (SELECT COUNT(*)::text FROM mock_trading_positions WHERE status = 'OPEN' AND updated_at < NOW() - INTERVAL '24 hours')
UNION ALL SELECT '  Stuck Questions', '', (SELECT COUNT(*)::text FROM qx_questions WHERE (status = 'SCHEDULED' AND opens_at < NOW() - INTERVAL '1 hour') OR (status = 'OPEN' AND closes_at < NOW() - INTERVAL '1 hour'))
UNION ALL SELECT '  P&L Discrepancies', '', (
    SELECT COUNT(*)::text FROM (
        SELECT a.user_id
        FROM mock_trading_accounts a
        LEFT JOIN mock_trading_history h ON a.user_id = h.user_id
        WHERE a.user_id LIKE 'agent_%'
        GROUP BY a.user_id, a.total_profit_loss
        HAVING ABS(a.total_profit_loss - COALESCE(SUM(h.profit_loss), 0)) > 1.0
    ) disc
);

-- ============================================================================
-- 7. ALERTING THRESHOLDS (Copy these to monitoring system)
-- ============================================================================

-- Alert definitions for external monitoring
SELECT 'ALERT DEFINITIONS' as category,
       alert_name,
       threshold,
       query_to_check
FROM (VALUES
    ('high_pnl_discrepancy', '> $1', 'SELECT COUNT(*) FROM mock_trading_accounts WHERE ABS(total_profit_loss - calculated_pnl) > 1'),
    ('stale_positions', '> 0', 'SELECT COUNT(*) FROM mock_trading_positions WHERE status = ''OPEN'' AND updated_at < NOW() - INTERVAL ''24h'''),
    ('stuck_questions', '> 0', 'SELECT COUNT(*) FROM qx_questions WHERE status = ''SCHEDULED'' AND opens_at < NOW() - INTERVAL ''1h'''),
    ('duplicate_early_bird', '> 0', 'SELECT COUNT(*) FROM (SELECT question_id, early_bird_rank FROM qx_predictions WHERE is_early_bird GROUP BY question_id, early_bird_rank HAVING COUNT(*) > 1) d'),
    ('api_error_rate', '> 1%', 'Monitor via Edge Function logs'),
    ('db_connection_pool', '> 90%', 'SELECT count(*) FROM pg_stat_activity')
) AS alerts(alert_name, threshold, query_to_check);

