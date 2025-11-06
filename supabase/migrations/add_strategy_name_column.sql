-- Add strategy_name column to intelligence_signals table
-- This allows tracking which of the 10 strategies generated each signal

ALTER TABLE intelligence_signals
ADD COLUMN IF NOT EXISTS strategy_name VARCHAR(50);

-- Add index for faster queries by strategy
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_strategy
ON intelligence_signals(strategy_name);

-- Add index for strategy performance queries
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_strategy_status
ON intelligence_signals(strategy_name, status);

-- Add reasoning column to store detailed signal reasoning
ALTER TABLE intelligence_signals
ADD COLUMN IF NOT EXISTS reasoning TEXT[];

-- Add indicators column to store technical indicators
ALTER TABLE intelligence_signals
ADD COLUMN IF NOT EXISTS indicators JSONB;

-- Add risk_reward_ratio column
ALTER TABLE intelligence_signals
ADD COLUMN IF NOT EXISTS risk_reward_ratio NUMERIC(10,2);

-- Comment on new columns
COMMENT ON COLUMN intelligence_signals.strategy_name IS 'Name of the strategy that generated this signal (e.g., WHALE_SHADOW, SPRING_TRAP)';
COMMENT ON COLUMN intelligence_signals.reasoning IS 'Array of reasoning strings explaining why signal was generated';
COMMENT ON COLUMN intelligence_signals.indicators IS 'JSON object containing technical indicators used in signal generation';
COMMENT ON COLUMN intelligence_signals.risk_reward_ratio IS 'Risk-to-reward ratio (e.g., 2.0 means 2:1 reward:risk)';
