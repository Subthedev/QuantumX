-- =====================================================
-- Fix user_signals Table Schema
-- =====================================================
-- Adds missing timeframe and status columns that are
-- referenced in various SQL scripts and edge functions
-- =====================================================

-- Add timeframe column (e.g., '15m', '1h', '4h', '1d')
ALTER TABLE user_signals
ADD COLUMN IF NOT EXISTS timeframe TEXT;

-- Add status column (e.g., 'ACTIVE', 'EXPIRED', 'TRIGGERED')
ALTER TABLE user_signals
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- Add check constraint for valid signal status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_signal_status'
  ) THEN
    ALTER TABLE user_signals
    ADD CONSTRAINT check_signal_status
    CHECK (status IN ('ACTIVE', 'EXPIRED', 'TRIGGERED', 'CANCELLED'));
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_signals_status ON user_signals(status);
CREATE INDEX IF NOT EXISTS idx_user_signals_timeframe ON user_signals(timeframe);
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

-- Add helpful comments
COMMENT ON COLUMN user_signals.timeframe IS 'Trading timeframe for the signal (e.g., 15m, 1h, 4h, 1d)';
COMMENT ON COLUMN user_signals.status IS 'Current status of the signal (ACTIVE, EXPIRED, TRIGGERED, CANCELLED)';

-- Verify the changes
SELECT
  'user_signals table schema updated successfully' as message,
  COUNT(*) as total_signals,
  COUNT(CASE WHEN timeframe IS NOT NULL THEN 1 END) as signals_with_timeframe,
  COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as signals_with_status
FROM user_signals;
