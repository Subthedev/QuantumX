-- Add missing columns to user_signals table
-- These columns are referenced in various SQL scripts but were missing from the schema

-- Add timeframe column (e.g., '15m', '1h', '4h', '1d')
ALTER TABLE user_signals
ADD COLUMN IF NOT EXISTS timeframe TEXT;

-- Add status column (e.g., 'ACTIVE', 'EXPIRED', 'TRIGGERED')
ALTER TABLE user_signals
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- Add check constraint for valid signal status values
ALTER TABLE user_signals
ADD CONSTRAINT IF NOT EXISTS check_signal_status
CHECK (status IN ('ACTIVE', 'EXPIRED', 'TRIGGERED', 'CANCELLED'));

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_user_signals_status ON user_signals(status);

-- Create composite index for common queries (user_id + status + expires_at)
CREATE INDEX IF NOT EXISTS idx_user_signals_user_status_expires
ON user_signals(user_id, status, expires_at);

-- Update existing rows to have default values
UPDATE user_signals
SET
  timeframe = COALESCE(metadata->>'timeframe', '15m'),
  status = CASE
    WHEN expires_at < NOW() THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END
WHERE timeframe IS NULL OR status IS NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN user_signals.timeframe IS 'Trading timeframe for the signal (e.g., 15m, 1h, 4h, 1d)';
COMMENT ON COLUMN user_signals.status IS 'Current status of the signal (ACTIVE, EXPIRED, TRIGGERED, CANCELLED)';
