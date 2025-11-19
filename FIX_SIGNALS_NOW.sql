-- Run this in Supabase SQL Editor to fix all broken signals

-- 1. Update all ACTIVE signals that have already expired to mark them as EXPIRED
UPDATE intelligence_signals
SET
  status = 'EXPIRED',
  completed_at = NOW()
WHERE
  status = 'ACTIVE'
  AND expires_at < NOW();

-- 2. Extend expiry time for any ACTIVE signals that expire too soon (less than 1 hour from now)
-- Give them 4 hours from now
UPDATE intelligence_signals
SET
  expires_at = NOW() + INTERVAL '4 hours'
WHERE
  status = 'ACTIVE'
  AND expires_at < NOW() + INTERVAL '1 hour';

-- 3. Show results
SELECT
  'ACTIVE signals now' as description,
  COUNT(*) as count,
  MIN(expires_at) as earliest_expiry,
  MAX(expires_at) as latest_expiry
FROM intelligence_signals
WHERE status = 'ACTIVE';
