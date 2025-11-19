-- Add display_name column to mock_trading_accounts
-- This allows users to set custom display names for Arena participation
-- NOTE: Run 20251112_fix_mock_trading_user_id_type.sql FIRST

ALTER TABLE mock_trading_accounts
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_mock_trading_accounts_display_name
ON mock_trading_accounts(display_name);

-- Comment for documentation
COMMENT ON COLUMN mock_trading_accounts.display_name IS 'Public display name for Arena leaderboard. Agents have fixed names, users can customize.';
