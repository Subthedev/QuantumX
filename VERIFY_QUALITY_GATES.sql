-- ============================================
-- VERIFY QUALITY GATES - Production Signal Verification
-- ============================================
--
-- This query verifies that signals in the database have passed
-- all quality gates and are genuine production signals
--
-- Run this in Supabase SQL Editor to verify your system is working
-- ============================================

-- Step 1: Clean test signals (if any remain)
DELETE FROM user_signals WHERE signal_id LIKE 'test_signal_%';

-- Step 2: Comprehensive quality verification
SELECT
  -- Basic Info
  created_at,
  signal_id,
  symbol,
  signal_type,

  -- Quality Metrics (verify these passed thresholds)
  confidence,
  quality_score,

  -- Quality Gates Verification
  CASE
    WHEN confidence >= 50 AND quality_score >= 60 THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as quality_gate_status,

  -- Tier Assignment (verify correct tier)
  tier,
  CASE
    WHEN tier = 'MAX' AND quality_score >= 60 THEN '✅ CORRECT'
    WHEN tier = 'PRO' AND quality_score >= 65 THEN '✅ CORRECT'
    WHEN tier = 'FREE' AND quality_score >= 75 THEN '✅ CORRECT'
    ELSE '⚠️ TIER MISMATCH'
  END as tier_verification,

  -- Signal Validity
  CASE
    WHEN expires_at > NOW() THEN '🟢 ACTIVE'
    WHEN metadata->>'outcome' = 'WIN' THEN '✅ COMPLETED'
    WHEN metadata->>'outcome' = 'LOSS' THEN '❌ STOPPED'
    ELSE '⏱️ TIMEOUT'
  END as current_status,

  -- Metadata Verification
  metadata->>'rank' as rank,
  metadata->>'strategy' as strategy,
  metadata->>'grade' as grade,

  -- Entry/Exit Points (verify realistic values)
  entry_price,
  take_profit,
  stop_loss,

  -- Signal Age
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as age_minutes,
  EXTRACT(EPOCH FROM (expires_at - created_at))/60 as expiry_duration_minutes,

  -- Full Details Access
  full_details,

  -- Real Signal Verification
  CASE
    WHEN signal_id NOT LIKE 'test_%'
      AND confidence >= 50
      AND quality_score >= 60
      AND entry_price IS NOT NULL
    THEN '✅ REAL PRODUCTION SIGNAL'
    ELSE '⚠️ POSSIBLE TEST/INVALID'
  END as signal_authenticity

FROM user_signals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================
-- QUALITY GATE THRESHOLDS REFERENCE
-- ============================================
--
-- Signal Quality Gate:
--   Minimum Quality Score: 50
--   Excellent Threshold: 75
--   Daily Limit: 100 signals
--
-- Tier Quality Thresholds:
--   MAX: 60+ quality (top 30 signals)
--   PRO: 65+ quality (top 15 signals)
--   FREE: 75+ quality (top 2 signals)
--
-- Quality Factors Scored:
--   ✅ Confidence (0-100)
--   ✅ ML Prediction (Zeta)
--   ✅ Volatility Score
--   ✅ Market Regime Score
--   ✅ Risk/Reward Ratio
--   ✅ Strategy Win Rate
--
-- Signal Pipeline:
--   DATA → ALPHA (17 strategies)
--        → BETA V5 (ML consensus)
--        → GAMMA V2 (prioritization)
--        → DELTA V2 (quality filter)
--        → QUALITY GATE (scoring & budget)
--        → SMART POOL (ranking)
--        → DATABASE (tier distribution)
--        → UI (premium cards)
-- ============================================

-- Step 3: Quality Statistics
SELECT
  COUNT(*) as total_signals,
  COUNT(CASE WHEN signal_id NOT LIKE 'test_%' THEN 1 END) as real_signals,
  COUNT(CASE WHEN signal_id LIKE 'test_%' THEN 1 END) as test_signals,
  AVG(quality_score) as avg_quality,
  AVG(confidence) as avg_confidence,
  MIN(quality_score) as min_quality,
  MAX(quality_score) as max_quality,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_count,
  COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_count
FROM user_signals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
  AND created_at >= NOW() - INTERVAL '24 hours';

-- Step 4: Signal Distribution by Quality Tier
SELECT
  tier,
  COUNT(*) as count,
  AVG(quality_score) as avg_quality,
  MIN(quality_score) as min_quality,
  MAX(quality_score) as max_quality,
  AVG(confidence) as avg_confidence
FROM user_signals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND signal_id NOT LIKE 'test_%'
GROUP BY tier
ORDER BY tier DESC;

-- ============================================
-- EXPECTED RESULTS FOR PRODUCTION SIGNALS
-- ============================================
--
-- All signals should show:
--   ✅ quality_gate_status: '✅ PASSED'
--   ✅ tier_verification: '✅ CORRECT'
--   ✅ signal_authenticity: '✅ REAL PRODUCTION SIGNAL'
--   ✅ quality_score >= 60 (for MAX tier)
--   ✅ confidence >= 50
--   ✅ entry_price, take_profit, stop_loss are realistic
--   ✅ strategy name is real (not 'test')
--   ✅ signal_id does NOT start with 'test_'
--
-- If you see '⚠️' warnings, the signal may not have passed
-- all quality gates properly
-- ============================================
