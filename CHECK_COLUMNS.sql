-- ============================================
-- DIAGNOSTIC: Check Table Columns
-- Run this FIRST to see which columns exist
-- ============================================

-- Check portfolio_holdings columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'portfolio_holdings'
ORDER BY ordinal_position;

-- Check profit_guard_positions columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profit_guard_positions'
ORDER BY ordinal_position;

-- Check crypto_reports columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'crypto_reports'
ORDER BY ordinal_position;

-- Check feedback_responses columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'feedback_responses'
ORDER BY ordinal_position;
