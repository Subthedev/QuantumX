-- Test script to check Arena database state
SELECT 'Agent Accounts:' as section;
SELECT user_id, display_name, balance, initial_balance, total_trades, winning_trades, losing_trades
FROM mock_trading_accounts
WHERE user_id LIKE 'agent-%'
ORDER BY user_id;

SELECT '' as separator;
SELECT 'Open Positions:' as section;
SELECT user_id, symbol, side, entry_price, quantity, status, opened_at
FROM mock_trading_positions
WHERE user_id LIKE 'agent-%'
  AND status = 'OPEN'
ORDER BY opened_at DESC
LIMIT 10;

SELECT '' as separator;
SELECT 'Recent Closed Trades:' as section;
SELECT user_id, symbol, side, entry_price, exit_price, profit_loss, profit_loss_percent, closed_at
FROM mock_trading_history
WHERE user_id LIKE 'agent-%'
ORDER BY closed_at DESC
LIMIT 10;
