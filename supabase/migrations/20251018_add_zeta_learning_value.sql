-- Add Zeta Learning Value column to rejected_signals
-- This score (0-100) predicts how much each rejection will improve Zeta ML model

ALTER TABLE rejected_signals 
ADD COLUMN IF NOT EXISTS zeta_learning_value INTEGER DEFAULT 0;

-- Add index for sorting by learning value
CREATE INDEX IF NOT EXISTS idx_rejected_signals_zeta_value 
ON rejected_signals(zeta_learning_value DESC);

-- Add comment
COMMENT ON COLUMN rejected_signals.zeta_learning_value IS 
'ML-predicted value (0-100) indicating how much this rejection will improve Zeta learning model. Higher = more valuable for training.';
