-- Add zeta_learning_value column
ALTER TABLE rejected_signals 
ADD COLUMN IF NOT EXISTS zeta_learning_value INTEGER DEFAULT 0;

-- Add index
CREATE INDEX IF NOT EXISTS idx_rejected_signals_zeta_value 
ON rejected_signals(zeta_learning_value DESC);

-- Clear old data without Zeta scores
DELETE FROM rejected_signals WHERE zeta_learning_value = 0 OR zeta_learning_value IS NULL;
