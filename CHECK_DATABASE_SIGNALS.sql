-- Run this in Supabase SQL Editor to see what's wrong with your signals

-- 1. Check ACTIVE signals and their expiry times
SELECT
  symbol,
  signal_type,
  confidence,
  created_at,
  expires_at,
  status,
  -- Calculate how long until expiry (negative = already expired)
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 60 as minutes_until_expiry,
  -- Calculate age in minutes
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as age_minutes
FROM intelligence_signals
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check if there are ANY active signals at all
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM intelligence_signals
GROUP BY status
ORDER BY status;

-- 3. Check recent signals (last 2 hours) regardless of status
SELECT
  symbol,
  signal_type,
  confidence,
  status,
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - created_at)) / 3600 as expiry_hours
FROM intelligence_signals
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
