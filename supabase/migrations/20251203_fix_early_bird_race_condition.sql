-- ============================================================================
-- Migration: Fix Early Bird Race Condition
-- Purpose: Prevent duplicate early bird ranks caused by concurrent inserts
-- Date: December 3, 2025
-- Part of: Phase 2 - Critical Bug Fixes
-- ============================================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_early_bird ON qx_predictions;

-- Drop existing function
DROP FUNCTION IF EXISTS assign_early_bird();

-- ============================================================================
-- FUNCTION: assign_early_bird (FIXED)
--
-- Problem: Original function had a race condition where concurrent inserts
--          could result in duplicate early_bird_rank values.
--
-- Fix: Use SELECT FOR UPDATE on the question row to serialize access
--      This ensures only one insert can count predictions at a time
--
-- Changes:
--   1. Lock question row with FOR UPDATE (serializes concurrent access)
--   2. Use current_count + 1 for rank (1-indexed, not 0-indexed)
--   3. Set is_early_bird = FALSE explicitly when limit exceeded
--   4. Handle NULL early_bird_rank properly
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_early_bird()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Lock the question row to prevent race conditions
  -- This ensures concurrent inserts are serialized
  PERFORM 1 FROM qx_questions
  WHERE id = NEW.question_id
  FOR UPDATE;

  -- Count existing predictions for this question
  -- The lock above ensures this count is accurate
  SELECT COUNT(*) INTO current_count
  FROM qx_predictions
  WHERE question_id = NEW.question_id;

  -- Check if within early bird limit (first 100 predictions)
  IF current_count < 100 THEN
    -- This prediction is an early bird
    NEW.is_early_bird := TRUE;
    -- Rank is 1-indexed (first prediction = rank 1)
    NEW.early_bird_rank := current_count + 1;
  ELSE
    -- Not an early bird - explicitly set fields
    NEW.is_early_bird := FALSE;
    NEW.early_bird_rank := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_early_bird
  BEFORE INSERT ON qx_predictions
  FOR EACH ROW
  EXECUTE FUNCTION assign_early_bird();

-- ============================================================================
-- Additional: Add index for faster early bird queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_qx_predictions_early_bird
  ON qx_predictions (question_id, early_bird_rank)
  WHERE is_early_bird = TRUE;

-- ============================================================================
-- FUNCTION: update_phase_multiplier_snapshot
-- Purpose: Capture phase multiplier at question creation time (fairness fix)
-- ============================================================================

-- First, add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qx_questions' AND column_name = 'phase_multiplier_snapshot'
  ) THEN
    ALTER TABLE qx_questions ADD COLUMN phase_multiplier_snapshot DECIMAL(3,2) DEFAULT 1.0;
  END IF;
END $$;

-- Function to capture phase multiplier at question creation
CREATE OR REPLACE FUNCTION capture_phase_multiplier()
RETURNS TRIGGER AS $$
BEGIN
  -- Get current phase multiplier, default to 1.0 if not found
  SELECT COALESCE(current_multiplier, 1.0) INTO NEW.phase_multiplier_snapshot
  FROM qx_phase_config
  WHERE is_active = true
  LIMIT 1;

  -- If no active phase, default to 1.0
  IF NEW.phase_multiplier_snapshot IS NULL THEN
    NEW.phase_multiplier_snapshot := 1.0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for phase multiplier capture
DROP TRIGGER IF EXISTS trigger_capture_phase_multiplier ON qx_questions;
CREATE TRIGGER trigger_capture_phase_multiplier
  BEFORE INSERT ON qx_questions
  FOR EACH ROW
  EXECUTE FUNCTION capture_phase_multiplier();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION assign_early_bird() IS 'Assigns early bird status and rank with race condition prevention using row-level locking';
COMMENT ON FUNCTION capture_phase_multiplier() IS 'Captures phase multiplier at question creation time for fairness';
