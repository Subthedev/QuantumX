# TIER-BASED SIGNAL TESTING GUIDE

## Overview

This guide helps you verify that the tier-aware signal generation system is working correctly.

## System Architecture

### Flow:
```
Cron (30s) → Edge Function → Check Each Tier → Generate if Ready → Distribute to Tier Users
```

### Tier Intervals:
| Tier | Interval | Signals/24h | Minutes Between |
|------|----------|-------------|-----------------|
| **FREE** | 8 hours | 3 | 480 minutes |
| **PRO** | 96 minutes | 15 | 96 minutes |
| **MAX** | 48 minutes | 30 | 48 minutes |

---

## Pre-Deployment Checklist

Before testing, ensure these are deployed:

### 1. Edge Function (CRITICAL)
```bash
supabase functions deploy signal-generator
```

**Verify deployment:**
```bash
supabase functions list
```

**Look for**: `signal-generator` with recent `UPDATED_AT` timestamp

### 2. Frontend (If timer changes made)
```bash
npm run build
# Then deploy via your platform
```

### 3. Database Schema
Ensure `user_signals` table has `tier` column:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_signals'
  AND column_name = 'tier';
```

Should return: `tier | text` (or similar)

---

## Testing Steps

### Test 1: Verify Edge Function Deployment ✅

**Purpose**: Confirm tier-aware code is live

**Command:**
```bash
supabase functions list
```

**Expected Output:**
```
signal-generator | ACTIVE | 8 (or higher) | 2025-11-18 22:07:39
```

**✅ Pass**: Version ≥8 and recent timestamp
**❌ Fail**: Old version or old timestamp → Redeploy

---

### Test 2: Monitor Real-Time Logs 🔍

**Purpose**: See tier-aware interval checking in action

**Command:**
```bash
# In terminal, keep this running
supabase functions logs signal-generator
```

**Expected Logs (Most Common - No Tiers Ready):**
```
[Signal Generator] 🚀 Starting multi-coin scan
[Signal Generator] Found 5 active users
[Signal Generator] ⏳ FREE: Only 120 minutes passed, need 360 more minutes - Skipping
[Signal Generator] ⏳ PRO: Only 45 minutes passed, need 51 more minutes - Skipping
[Signal Generator] ⏳ MAX: Only 20 minutes passed, need 28 more minutes - Skipping
[Signal Generator] ⏸️  No tiers ready for signals yet
```

**Expected Logs (When MAX Ready):**
```
[Signal Generator] ✅ MAX: 48 minutes passed (>= 48 min required) - Will generate
[Signal Generator] 🎯 Processing tiers: MAX
[Signal Generator] Scanning 50 coins...
[Signal Generator] Found 12 potential signals
[Signal Generator] ✅ Selected: BTCUSDT LONG (3.45% change)
[Signal Generator] 📤 Distributing to 3 MAX users
[Signal Generator] ✅ MAX signal sent to user abc-123
```

**✅ Pass**: Seeing tier-specific logs with interval checks
**❌ Fail**: Not seeing tier mentions → Old edge function deployed

---

### Test 3: Database Signal Inspection 🗄️

**Purpose**: Verify signals are being created with correct tier stamps

**Query:**
```sql
SELECT
  created_at,
  tier,
  symbol,
  signal_type,
  metadata->>'generatedBy' as source,
  metadata->'adaptiveExpiry'->>'expiryHours' as expiry_hours
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Output:**
```
2025-11-18 22:30:00 | MAX  | BTCUSDT | LONG  | edge-function | 18.5
2025-11-18 21:42:00 | MAX  | ETHUSDT | SHORT | edge-function | 12.3
2025-11-18 20:54:00 | MAX  | SOLUSDT | LONG  | edge-function | 21.7
...
```

**✅ Pass**:
- `tier` column populated (FREE/PRO/MAX)
- Signals have ~48 min gaps for MAX tier
- `adaptiveExpiry` present and varies (6-24h)

**❌ Fail**:
- `tier` is NULL → Schema missing tier column
- All signals same time → Not respecting intervals
- No `adaptiveExpiry` → Old edge function version

---

### Test 4: Timer UI Verification ⏱️

**Purpose**: Confirm UI timer matches backend intervals

**Steps:**
1. Open Intelligence Hub in browser
2. Check the countdown timer component

**Expected Display:**
| Tier | Timer Shows |
|------|-------------|
| FREE | ~8:00:00 (or counting down from 8 hours) |
| PRO  | ~1:36:00 (or counting down from 96 minutes) |
| MAX  | ~48:00 (or counting down from 48 minutes) |

**How to Test:**
- Watch timer countdown
- When it hits 0:00, new signal should appear within 30 seconds
- Timer resets to full interval

**✅ Pass**: Timer matches tier interval and signals appear on schedule
**❌ Fail**: Timer shows different value → Frontend not deployed

---

### Test 5: Tier Distribution Check 👥

**Purpose**: Verify different tiers get signals at different intervals

**Setup Required:**
```sql
-- Create test users for each tier (if not exists)
INSERT INTO user_subscriptions (user_id, tier, status)
VALUES
  ('test-free-user', 'FREE', 'active'),
  ('test-pro-user', 'PRO', 'active'),
  ('test-max-user', 'MAX', 'active');
```

**Monitor Query (Run every 15 minutes):**
```sql
SELECT
  tier,
  COUNT(*) as signals_generated,
  MAX(created_at) as last_signal_time,
  EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))/60 as minutes_since_last
FROM user_signals
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND metadata->>'generatedBy' = 'edge-function'
GROUP BY tier
ORDER BY tier;
```

**Expected Output (After 24 hours):**
```
FREE | 3  | 2025-11-18 22:00:00 | 30
PRO  | 15 | 2025-11-18 22:24:00 | 6
MAX  | 30 | 2025-11-18 22:30:00 | 0
```

**✅ Pass**:
- FREE ≈ 3 signals/24h (±1)
- PRO ≈ 15 signals/24h (±2)
- MAX ≈ 30 signals/24h (±3)

**❌ Fail**: All tiers have same count → Not tier-aware

---

### Test 6: Interval Accuracy Test ⏲️

**Purpose**: Measure actual time between signals for each tier

**Query:**
```sql
WITH signal_gaps AS (
  SELECT
    tier,
    created_at,
    LAG(created_at) OVER (PARTITION BY tier ORDER BY created_at) as prev_created_at,
    EXTRACT(EPOCH FROM (
      created_at - LAG(created_at) OVER (PARTITION BY tier ORDER BY created_at)
    ))/60 as gap_minutes
  FROM user_signals
  WHERE metadata->>'generatedBy' = 'edge-function'
    AND created_at > NOW() - INTERVAL '12 hours'
)
SELECT
  tier,
  ROUND(AVG(gap_minutes)::numeric, 1) as avg_gap_minutes,
  ROUND(MIN(gap_minutes)::numeric, 1) as min_gap_minutes,
  ROUND(MAX(gap_minutes)::numeric, 1) as max_gap_minutes,
  COUNT(*) as sample_size
FROM signal_gaps
WHERE gap_minutes IS NOT NULL
GROUP BY tier
ORDER BY tier;
```

**Expected Output:**
```
FREE | 480.0 | 478.0 | 482.0 | 2
PRO  | 96.0  | 95.5  | 96.5  | 14
MAX  | 48.0  | 47.8  | 48.2  | 29
```

**✅ Pass**: Average within ±2 minutes of target interval
**❌ Fail**: Wide variance or wrong average → Cron or logic issue

---

## Common Issues & Solutions

### Issue 1: All Tiers Getting Same Interval

**Symptoms:**
- All tiers show same signal count
- No tier-specific logs

**Diagnosis:**
```bash
supabase functions list
```
Check if version is ≥8

**Fix:**
```bash
supabase functions deploy signal-generator
```

---

### Issue 2: No Signals At All

**Symptoms:**
- Zero signals in database
- Logs show errors

**Diagnosis:**
```sql
-- Check active users
SELECT tier, COUNT(*)
FROM user_subscriptions
WHERE status = 'active'
GROUP BY tier;
```

**Fix:**
If no users:
```sql
INSERT INTO user_subscriptions (user_id, tier, status)
VALUES ('test-user-' || gen_random_uuid(), 'MAX', 'active');
```

---

### Issue 3: Random Signal Drops

**Symptoms:**
- Signals appear at random times
- Not matching tier intervals

**Diagnosis:**
Check logs for tier-aware messages. If missing:
```bash
# Verify file content
cat supabase/functions/signal-generator/index.ts | grep "TIER_INTERVALS"
```

**Fix:**
1. Verify local file has tier-aware code (lines 157-242)
2. Redeploy: `supabase functions deploy signal-generator`
3. Clear any cached edge function versions

---

### Issue 4: Timer Doesn't Match Signal Drops

**Symptoms:**
- Timer shows 48 minutes but signals every 30 seconds
- Or timer shows different value

**Diagnosis:**
Check frontend `DROP_INTERVALS`:
```bash
cat src/components/SignalDropTimer.tsx | grep "DROP_INTERVALS"
```

**Fix:**
Ensure intervals match:
```typescript
// SignalDropTimer.tsx
const DROP_INTERVALS = {
  FREE: 8 * 60 * 60,   // 8 hours
  PRO: 96 * 60,        // 96 minutes
  MAX: 48 * 60         // 48 minutes
};
```

Rebuild and redeploy frontend.

---

## Success Criteria

Your system is working correctly if:

- ✅ Edge function version ≥8 deployed
- ✅ Logs show tier-specific interval checking
- ✅ Database signals have `tier` column populated
- ✅ FREE users get ~3 signals/24h
- ✅ PRO users get ~15 signals/24h
- ✅ MAX users get ~30 signals/24h
- ✅ Timer countdown matches actual signal drops
- ✅ No "random" signal drops between intervals

---

## Monitoring Dashboard (SQL Query)

**Run this every hour to track system health:**

```sql
WITH hourly_stats AS (
  SELECT
    tier,
    COUNT(*) as signals_this_hour,
    COUNT(*) FILTER (WHERE metadata->>'mlOutcome' LIKE 'TIMEOUT%') as timeouts
  FROM user_signals
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND metadata->>'generatedBy' = 'edge-function'
  GROUP BY tier
),
daily_stats AS (
  SELECT
    tier,
    COUNT(*) as signals_last_24h,
    ROUND(AVG(EXTRACT(EPOCH FROM (
      created_at - LAG(created_at) OVER (PARTITION BY tier ORDER BY created_at)
    ))/60)::numeric, 1) as avg_interval_minutes
  FROM user_signals
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND metadata->>'generatedBy' = 'edge-function'
  GROUP BY tier
)
SELECT
  h.tier,
  h.signals_this_hour,
  h.timeouts,
  d.signals_last_24h,
  d.avg_interval_minutes,
  CASE
    WHEN h.tier = 'FREE' THEN 3
    WHEN h.tier = 'PRO' THEN 15
    WHEN h.tier = 'MAX' THEN 30
  END as expected_24h,
  CASE
    WHEN h.tier = 'FREE' THEN 480
    WHEN h.tier = 'PRO' THEN 96
    WHEN h.tier = 'MAX' THEN 48
  END as expected_interval
FROM hourly_stats h
LEFT JOIN daily_stats d ON h.tier = d.tier
ORDER BY h.tier;
```

**Healthy Output:**
```
FREE | 0 | 0 | 3  | 480.0 | 3  | 480
PRO  | 1 | 0 | 15 | 96.0  | 15 | 96
MAX  | 1 | 0 | 30 | 48.0  | 30 | 48
```

---

**Status**: ✅ TESTING READY
**Last Updated**: 2025-11-18
**Edge Function Version**: 8+
**Required Components**: Edge function, Frontend timer, Database schema
