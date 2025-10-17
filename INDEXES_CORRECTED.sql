-- ============================================
-- CORRECTED DATABASE INDEXES
-- Fixed: Removed indexes that reference non-existent columns
-- ============================================

-- ============================================
-- Portfolio Holdings Indexes
-- ============================================

-- Index for user-specific portfolio queries (most common)
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_id
ON portfolio_holdings(user_id);

-- Composite index for user + coin lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_coin
ON portfolio_holdings(user_id, coin_id);

-- Index for sorting by purchase date
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_purchase_date
ON portfolio_holdings(purchase_date DESC);

-- ============================================
-- Profit Guard Positions Indexes
-- ============================================

-- Index for user-specific profit guard queries
CREATE INDEX IF NOT EXISTS idx_profit_guard_user_id
ON profit_guard_positions(user_id);

-- Composite index for user + coin lookups
CREATE INDEX IF NOT EXISTS idx_profit_guard_user_coin
ON profit_guard_positions(user_id, coin_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_profit_guard_status
ON profit_guard_positions(user_id, status);

-- Index for creation date sorting
CREATE INDEX IF NOT EXISTS idx_profit_guard_created_at
ON profit_guard_positions(created_at DESC);

-- ============================================
-- Crypto Reports Indexes (OPTIONAL)
-- Only run if crypto_reports table exists
-- ============================================

-- Index for fetching recent reports by coin
CREATE INDEX IF NOT EXISTS idx_crypto_reports_coin_created
ON crypto_reports(coin_id, created_at DESC);

-- Index for user-specific reports
CREATE INDEX IF NOT EXISTS idx_crypto_reports_user_id
ON crypto_reports(user_id);

-- ============================================
-- Feedback Responses Indexes (OPTIONAL)
-- Only run if feedback_responses table exists
-- ============================================

-- Index for user feedback queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id
ON feedback_responses(user_id);

-- Index for timestamp sorting
CREATE INDEX IF NOT EXISTS idx_feedback_created_at
ON feedback_responses(created_at DESC);
