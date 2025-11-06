-- Fix DECIMAL columns to use NUMERIC type for better compatibility
-- This migration updates all price-related columns

ALTER TABLE intelligence_signals
  ALTER COLUMN entry_min TYPE NUMERIC USING entry_min::NUMERIC,
  ALTER COLUMN entry_max TYPE NUMERIC USING entry_max::NUMERIC,
  ALTER COLUMN current_price TYPE NUMERIC USING current_price::NUMERIC,
  ALTER COLUMN stop_loss TYPE NUMERIC USING stop_loss::NUMERIC,
  ALTER COLUMN target_1 TYPE NUMERIC USING target_1::NUMERIC,
  ALTER COLUMN target_2 TYPE NUMERIC USING target_2::NUMERIC,
  ALTER COLUMN target_3 TYPE NUMERIC USING target_3::NUMERIC,
  ALTER COLUMN entry_price TYPE NUMERIC USING entry_price::NUMERIC,
  ALTER COLUMN exit_price TYPE NUMERIC USING exit_price::NUMERIC,
  ALTER COLUMN profit_loss_percent TYPE NUMERIC USING profit_loss_percent::NUMERIC;
