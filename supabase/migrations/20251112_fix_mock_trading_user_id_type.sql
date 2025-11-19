-- Fix mock_trading tables to use TEXT for user_id instead of UUID
-- This allows agent accounts (agent-nexus-01, etc.) to work properly

-- Drop the leaderboard view first (we'll recreate it later)
DROP VIEW IF EXISTS mock_trading_leaderboard;

-- Drop ALL RLS policies on mock_trading tables (they depend on user_id)
-- We'll recreate the necessary ones after changing the column type
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on mock_trading_accounts
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'mock_trading_accounts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON mock_trading_accounts';
    END LOOP;

    -- Drop all policies on mock_trading_positions
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'mock_trading_positions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON mock_trading_positions';
    END LOOP;

    -- Drop all policies on mock_trading_history
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'mock_trading_history') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON mock_trading_history';
    END LOOP;
END $$;

-- Drop existing foreign key constraints if any
ALTER TABLE mock_trading_accounts
DROP CONSTRAINT IF EXISTS mock_trading_accounts_user_id_fkey;

ALTER TABLE mock_trading_positions
DROP CONSTRAINT IF EXISTS mock_trading_positions_user_id_fkey;

ALTER TABLE mock_trading_history
DROP CONSTRAINT IF EXISTS mock_trading_history_user_id_fkey;

-- Change user_id columns from UUID to TEXT
ALTER TABLE mock_trading_accounts
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE mock_trading_positions
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE mock_trading_history
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mock_trading_accounts_user_id
ON mock_trading_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_mock_trading_positions_user_id
ON mock_trading_positions(user_id);

CREATE INDEX IF NOT EXISTS idx_mock_trading_history_user_id
ON mock_trading_history(user_id);

-- Recreate the leaderboard view with TEXT user_id
CREATE OR REPLACE VIEW mock_trading_leaderboard AS
SELECT
  user_id,
  display_name,
  balance,
  initial_balance,
  total_trades,
  winning_trades,
  losing_trades,
  total_profit_loss,
  CASE
    WHEN total_trades > 0 THEN ROUND((winning_trades::DECIMAL / total_trades::DECIMAL) * 100, 2)
    ELSE 0
  END as win_rate_percent,
  CASE
    WHEN initial_balance > 0 THEN ROUND(((balance - initial_balance) / initial_balance) * 100, 2)
    ELSE 0
  END as roi_percent,
  updated_at
FROM mock_trading_accounts
WHERE total_trades > 0
ORDER BY roi_percent DESC, win_rate_percent DESC
LIMIT 100;

-- Add comment
COMMENT ON VIEW mock_trading_leaderboard IS 'Top 100 traders ranked by ROI and win rate for Arena display';

-- Recreate RLS policies (modified for TEXT user_id)
-- These policies allow:
-- 1. Real users (UUID from auth) to access their own data (cast to TEXT)
-- 2. Agent accounts (TEXT like 'agent-nexus-01') are accessible
-- 3. Everyone can view leaderboard data

-- mock_trading_accounts policies
CREATE POLICY "Users can view their own trading account"
ON mock_trading_accounts FOR SELECT
USING (user_id = auth.uid()::TEXT OR user_id LIKE 'agent-%');

CREATE POLICY "Users can update their own trading account"
ON mock_trading_accounts FOR UPDATE
USING (user_id = auth.uid()::TEXT OR user_id LIKE 'agent-%');

CREATE POLICY "Users can insert their own trading account"
ON mock_trading_accounts FOR INSERT
WITH CHECK (user_id = auth.uid()::TEXT OR user_id LIKE 'agent-%');

-- mock_trading_positions policies
CREATE POLICY "Users can view their own positions"
ON mock_trading_positions FOR SELECT
USING (user_id = auth.uid()::TEXT OR user_id LIKE 'agent-%');

CREATE POLICY "Users can update their own positions"
ON mock_trading_positions FOR UPDATE
USING (user_id = auth.uid()::TEXT OR user_id LIKE 'agent-%');

CREATE POLICY "Users can insert their own positions"
ON mock_trading_positions FOR INSERT
WITH CHECK (user_id = auth.uid()::TEXT OR user_id LIKE 'agent-%');

CREATE POLICY "Users can delete their own positions"
ON mock_trading_positions FOR DELETE
USING (user_id = auth.uid()::TEXT OR user_id LIKE 'agent-%');

-- mock_trading_history policies
CREATE POLICY "Users can view their own history"
ON mock_trading_history FOR SELECT
USING (user_id = auth.uid()::TEXT OR user_id LIKE 'agent-%');

CREATE POLICY "Users can insert their own history"
ON mock_trading_history FOR INSERT
WITH CHECK (user_id = auth.uid()::TEXT OR user_id LIKE 'agent-%');

-- Now the agent user IDs will work correctly:
-- 'agent-nexus-01'
-- 'agent-quantum-x'
-- 'agent-zeonix'
