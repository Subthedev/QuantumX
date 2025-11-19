-- ================================================================
-- CHECK FOR DUPLICATE MAX TIER USERS
-- ================================================================
-- Purpose: Identify duplicate user subscriptions that cause
--          the same signal to be inserted multiple times
-- ================================================================

-- Step 1: Check for duplicate user_id entries in user_subscriptions
SELECT
  user_id,
  tier,
  status,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id) as subscription_ids,
  ARRAY_AGG(created_at) as created_dates
FROM user_subscriptions
WHERE tier = 'MAX' AND status = 'active'
GROUP BY user_id, tier, status
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Show all MAX tier users (including duplicates)
SELECT
  user_id,
  tier,
  status,
  id as subscription_id,
  created_at,
  updated_at
FROM user_subscriptions
WHERE tier = 'MAX' AND status = 'active'
ORDER BY user_id, created_at;

-- Step 3: Count total MAX tier subscriptions
SELECT
  COUNT(*) as total_max_subscriptions,
  COUNT(DISTINCT user_id) as unique_max_users,
  COUNT(*) - COUNT(DISTINCT user_id) as duplicate_entries
FROM user_subscriptions
WHERE tier = 'MAX' AND status = 'active';

-- ================================================================
-- FIX: Remove duplicate subscriptions (keep oldest)
-- ================================================================
-- This query will DELETE duplicate entries, keeping only the oldest
-- subscription for each user_id
--
-- Uncomment to execute:
-- DELETE FROM user_subscriptions
-- WHERE id IN (
--   SELECT id
--   FROM (
--     SELECT
--       id,
--       ROW_NUMBER() OVER (PARTITION BY user_id, tier ORDER BY created_at ASC) as row_num
--     FROM user_subscriptions
--     WHERE tier = 'MAX' AND status = 'active'
--   ) ranked
--   WHERE row_num > 1
-- );

-- ================================================================
-- VERIFICATION: Confirm no duplicates remain
-- ================================================================
-- Run this after executing the DELETE above
SELECT
  CASE
    WHEN COUNT(*) = COUNT(DISTINCT user_id) THEN '✅ NO DUPLICATES - Each user has exactly 1 MAX subscription'
    ELSE '⚠️  DUPLICATES FOUND - ' || (COUNT(*) - COUNT(DISTINCT user_id))::text || ' duplicate entries'
  END as status,
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT user_id) as unique_users
FROM user_subscriptions
WHERE tier = 'MAX' AND status = 'active';
