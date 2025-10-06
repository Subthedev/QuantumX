-- Add timeframe and investment_period columns to profit_guard_positions
ALTER TABLE profit_guard_positions 
ADD COLUMN timeframe TEXT NOT NULL DEFAULT 'medium-term',
ADD COLUMN investment_period INTEGER NOT NULL DEFAULT 30,
ADD COLUMN ai_analysis TEXT;

-- Remove ai_enabled column as AI is now the default
ALTER TABLE profit_guard_positions 
DROP COLUMN IF EXISTS ai_enabled;

-- Add check constraint for timeframe
ALTER TABLE profit_guard_positions
ADD CONSTRAINT valid_timeframe CHECK (timeframe IN ('short-term', 'medium-term', 'long-term'));

-- Add comment for clarity
COMMENT ON COLUMN profit_guard_positions.timeframe IS 'Investment timeframe: short-term (days), medium-term (weeks), long-term (months)';
COMMENT ON COLUMN profit_guard_positions.investment_period IS 'Investment period in days';
COMMENT ON COLUMN profit_guard_positions.ai_analysis IS 'Detailed AI analysis of the position and market conditions';