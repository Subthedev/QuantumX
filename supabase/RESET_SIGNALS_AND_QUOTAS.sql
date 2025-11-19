-- ================================================================
-- COMPLETE SIGNAL SYSTEM RESET - Production Ready
-- ================================================================
-- Purpose: Reset ALL signals and quota metrics to start fresh
-- Fixes: "129/30" and "-99 of 30 remaining" quota display issues
-- Reusable: Yes - can be run multiple times safely
-- ================================================================

-- ================================================================
-- STEP 1: SHOW CURRENT STATE (Before Reset)
-- ================================================================

-- Show total signals and quota metrics
SELECT
  'BEFORE RESET' as status,
  (SELECT COUNT(*) FROM user_signals) as total_signals,
  (SELECT COUNT(*) FROM user_signal_quotas) as total_quota_records,
  (SELECT SUM(signals_received) FROM user_signal_quotas) as total_quota_used;

-- Show signal breakdown by tier
SELECT
  'Signals by Tier' as report_type,
  tier,
  COUNT(*) as signal_count,
  COUNT(DISTINCT user_id) as user_count,
  COUNT(DISTINCT symbol) as symbol_count
FROM user_signals
GROUP BY tier
ORDER BY tier;

-- Show quota breakdown by user
SELECT
  'Quota Usage by User' as report_type,
  user_id,
  date,
  signals_received,
  CASE
    WHEN signals_received > 100 THEN '⚠️  INVALID (> 100)'
    WHEN signals_received < 0 THEN '⚠️  INVALID (negative)'
    ELSE '✅ Valid'
  END as status
FROM user_signal_quotas
ORDER BY signals_received DESC;

-- ================================================================
-- STEP 2: BACKUP (Optional - For Production Safety)
-- ================================================================
-- Uncomment these lines if you want to keep a backup before deletion
-- CREATE TABLE IF NOT EXISTS user_signals_backup AS SELECT * FROM user_signals;
-- CREATE TABLE IF NOT EXISTS user_signal_quotas_backup AS SELECT * FROM user_signal_quotas;

-- ================================================================
-- STEP 3: DELETE ALL SIGNALS
-- ================================================================
-- Uncomment the line below to execute signal deletion
-- DELETE FROM user_signals;

-- ================================================================
-- STEP 4: RESET ALL QUOTA METRICS
-- ================================================================
-- This fixes the "129/30" and "-99 remaining" issues
-- Uncomment the line below to execute quota reset
-- DELETE FROM user_signal_quotas;

-- ================================================================
-- STEP 5: VERIFICATION (After Reset)
-- ================================================================

-- Verify signals are cleared
SELECT
  'AFTER RESET - Signals' as status,
  COUNT(*) as remaining_signals,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All signals cleared successfully'
    ELSE '⚠️  ' || COUNT(*)::text || ' signals still remain'
  END as result
FROM user_signals;

-- Verify quotas are cleared
SELECT
  'AFTER RESET - Quotas' as status,
  COUNT(*) as remaining_quota_records,
  COALESCE(SUM(signals_received), 0) as total_quota_used,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All quota records cleared successfully'
    ELSE '⚠️  ' || COUNT(*)::text || ' quota records still remain'
  END as result
FROM user_signal_quotas;

-- ================================================================
-- STEP 6: OPTIONAL - Create fresh quota records for today
-- ================================================================
-- This creates a clean quota record for each active user
-- Uncomment to create fresh records (all starting at 0)
--
-- INSERT INTO user_signal_quotas (user_id, date, signals_received)
-- SELECT
--   user_id,
--   CURRENT_DATE,
--   0 as signals_received
-- FROM user_subscriptions
-- WHERE status = 'active'
-- ON CONFLICT (user_id, date) DO NOTHING;

-- ================================================================
-- USAGE INSTRUCTIONS
-- ================================================================
--
-- 1. RUN ENTIRE SCRIPT FIRST to see current state (Steps 1-5)
--    - This shows you what will be deleted
--    - Check for invalid quota values (129/30, -99, etc.)
--
-- 2. REVIEW the output from Step 1
--    - Verify you want to delete these signals
--    - Note any invalid quota metrics
--
-- 3. UNCOMMENT the DELETE statements in Steps 3 & 4:
--    -- DELETE FROM user_signals;
--    -- DELETE FROM user_signal_quotas;
--    (Remove the "--" at the beginning)
--
-- 4. RUN THE SCRIPT AGAIN to execute deletion
--
-- 5. CHECK Step 5 output for confirmation:
--    ✅ All signals cleared successfully
--    ✅ All quota records cleared successfully
--
-- 6. OPTIONAL: Uncomment Step 6 to create fresh quota records
--
-- ================================================================
-- SAFETY FEATURES
-- ================================================================
--
-- ✅ Shows data BEFORE deletion (can't delete by accident)
-- ✅ DELETE statements are commented by default
-- ✅ Verification queries confirm successful cleanup
-- ✅ Can be run multiple times (safe on empty tables)
-- ✅ Optional backup creation (uncomment if needed)
-- ✅ Optional fresh quota initialization (Step 6)
--
-- ================================================================
-- TROUBLESHOOTING
-- ================================================================
--
-- Issue: Still seeing "129/30" after reset
-- Fix: Clear browser cache and hard refresh (Cmd+Shift+R)
--
-- Issue: Quota shows "-99 remaining"
-- Fix: This script deletes ALL quota records, fixing negative values
--
-- Issue: New signals not appearing after reset
-- Fix: Wait for edge function to run (check tier intervals):
--      - FREE: 8 hours
--      - PRO: 96 minutes
--      - MAX: 48 minutes
--
-- ================================================================
