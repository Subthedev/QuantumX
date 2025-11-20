-- Run this in Supabase SQL Editor to diagnose user_signals issues
-- Replace 'YOUR_USER_ID' with the actual user ID from auth.users

-- 1. Check if user_signals table exists and has any records
SELECT COUNT(*) as total_signals
FROM user_signals;

-- 2. Check signals for a specific user (REPLACE WITH YOUR USER ID)
-- Get your user ID first by running: SELECT id, email FROM auth.users;
SELECT
  id,
  user_id,
  symbol,
  signal_type,
  confidence,
  tier,
  created_at,
  expires_at,
  status,
  -- Calculate how long until expiry (negative = already expired)
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 60 as minutes_until_expiry,
  -- Calculate age in hours
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as age_hours
FROM user_signals
-- WHERE user_id = 'YOUR_USER_ID'  -- UNCOMMENT and replace with your user ID
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check signals by tier distribution
SELECT
  tier,
  COUNT(*) as count,
  MIN(created_at) as oldest_signal,
  MAX(created_at) as newest_signal
FROM user_signals
GROUP BY tier
ORDER BY tier;

-- 4. Check recent signals (last 24 hours)
SELECT
  user_id,
  symbol,
  signal_type,
  tier,
  confidence,
  created_at,
  expires_at,
  status
FROM user_signals
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 5. Check if there are expired signals that should be cleaned up
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_count
FROM user_signals
GROUP BY status;

-- 6. Get all users who have signals
SELECT
  u.id as user_id,
  u.email,
  COUNT(us.id) as signal_count,
  MAX(us.created_at) as last_signal_time
FROM auth.users u
LEFT JOIN user_signals us ON us.user_id = u.id
GROUP BY u.id, u.email
ORDER BY signal_count DESC;
