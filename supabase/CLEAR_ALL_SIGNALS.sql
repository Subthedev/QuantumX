-- ================================================================
-- CLEAR ALL SIGNALS - Reusable Production Script
-- ================================================================
-- Purpose: Remove all signals from user_signals table
-- Use Case: Clean slate for production deployment or testing
-- Reusable: Yes - can be run multiple times safely
-- ================================================================

-- Step 1: Show current signal count BEFORE cleanup
SELECT
  COUNT(*) as total_signals,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT symbol) as unique_symbols,
  MIN(created_at) as oldest_signal,
  MAX(created_at) as newest_signal
FROM user_signals;

-- Step 2: Show breakdown by tier
SELECT
  tier,
  COUNT(*) as signal_count,
  COUNT(DISTINCT user_id) as user_count,
  COUNT(DISTINCT symbol) as symbol_count
FROM user_signals
GROUP BY tier
ORDER BY tier;

-- Step 3: Show breakdown by generation source
SELECT
  COALESCE(metadata->>'generatedBy', 'frontend') as source,
  COUNT(*) as signal_count
FROM user_signals
GROUP BY metadata->>'generatedBy'
ORDER BY signal_count DESC;

-- ================================================================
-- CRITICAL ACTION: DELETE ALL SIGNALS
-- ================================================================
-- Uncomment the line below to execute the deletion
-- DELETE FROM user_signals;

-- ================================================================
-- VERIFICATION: Check that table is empty
-- ================================================================
-- Run this after uncommenting and executing DELETE above
SELECT
  COUNT(*) as remaining_signals,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ CLEANUP SUCCESSFUL - All signals removed'
    ELSE '⚠️  CLEANUP INCOMPLETE - ' || COUNT(*)::text || ' signals remaining'
  END as status
FROM user_signals;

-- ================================================================
-- OPTIONAL: Reset user signal quotas (if table exists)
-- ================================================================
-- This ensures quota counters are reset for fresh signal drops
-- Uncomment if you want to reset quotas as well
-- DELETE FROM user_signal_quotas;

-- ================================================================
-- USAGE INSTRUCTIONS
-- ================================================================
--
-- 1. Run ENTIRE script first to see current state (Steps 1-3)
-- 2. Review the output to understand what will be deleted
-- 3. Uncomment the DELETE FROM user_signals line
-- 4. Run the script again to execute deletion
-- 5. Check the VERIFICATION section to confirm cleanup
--
-- SAFETY NOTES:
-- - This script shows data BEFORE deleting (Steps 1-3)
-- - DELETE line is commented by default (prevents accidents)
-- - VERIFICATION query confirms successful cleanup
-- - Can be run multiple times (DELETE on empty table is safe)
--
-- ================================================================
