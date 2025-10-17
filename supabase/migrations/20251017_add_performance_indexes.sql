-- Performance Optimization Indexes
-- Added: 2025-10-17
-- Purpose: Speed up common queries for portfolio and profit guard features

-- ============================================
-- Portfolio Holdings Indexes
-- ============================================

-- Index for user-specific portfolio queries (most common)
-- Speeds up: SELECT * FROM portfolio_holdings WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_id
ON portfolio_holdings(user_id);

-- Composite index for user + coin lookups (used in edit/delete operations)
-- Speeds up: SELECT * FROM portfolio_holdings WHERE user_id = ? AND coin_id = ?
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_coin
ON portfolio_holdings(user_id, coin_id);

-- Index for sorting by purchase date
-- Speeds up: ORDER BY purchase_date DESC
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_purchase_date
ON portfolio_holdings(purchase_date DESC);

-- ============================================
-- Profit Guard Positions Indexes
-- ============================================

-- Index for user-specific profit guard queries (most common)
-- Speeds up: SELECT * FROM profit_guard_positions WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_profit_guard_user_id
ON profit_guard_positions(user_id);

-- Composite index for user + coin lookups
-- Speeds up: SELECT * FROM profit_guard_positions WHERE user_id = ? AND coin_id = ?
CREATE INDEX IF NOT EXISTS idx_profit_guard_user_coin
ON profit_guard_positions(user_id, coin_id);

-- Index for filtering by status (active, completed, cancelled, etc.)
-- Speeds up: WHERE user_id = ? AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_profit_guard_status
ON profit_guard_positions(user_id, status);

-- Index for creation date sorting
-- Speeds up: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_profit_guard_created_at
ON profit_guard_positions(created_at DESC);

-- ============================================
-- Crypto Reports Indexes
-- ============================================

-- Index for user-specific reports
-- Speeds up: SELECT * FROM crypto_reports WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_crypto_reports_user_id
ON crypto_reports(user_id);

-- Index for fetching recent reports by coin (uses coin_symbol, not coin_id)
-- Speeds up: SELECT * FROM crypto_reports WHERE coin_symbol = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_crypto_reports_coin_symbol
ON crypto_reports(coin_symbol, created_at DESC);

-- Index for sorting by creation date
-- Speeds up: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_crypto_reports_created_at
ON crypto_reports(created_at DESC);

-- ============================================
-- Feedback Responses Indexes
-- ============================================

-- Index for user feedback queries
-- Speeds up: SELECT * FROM feedback_responses WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_feedback_user_id
ON feedback_responses(user_id);

-- Index for timestamp sorting
-- Speeds up: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_feedback_created_at
ON feedback_responses(created_at DESC);

-- ============================================
-- Comments
-- ============================================

/*
 * Expected Performance Improvements:
 *
 * 1. Portfolio Holdings:
 *    - User portfolio load: 2-5x faster
 *    - Add/Edit holding: 3-10x faster
 *    - Sorting by date: 2-3x faster
 *
 * 2. Profit Guard:
 *    - Load active guards: 3-5x faster
 *    - Check coin-specific guard: 5-10x faster
 *    - Filter by status: 2-4x faster
 *
 * 3. Overall:
 *    - Reduces table scans from O(n) to O(log n)
 *    - Critical for users with many holdings (>50 items)
 *    - Minimal storage overhead (~5-10% increase)
 *
 * Query Optimization Guidelines:
 * - Always filter by user_id first (leverages RLS + index)
 * - Use prepared statements to reuse query plans
 * - Avoid SELECT * when possible (reduces I/O)
 */
