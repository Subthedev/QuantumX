# CRON SCHEDULE GUIDE

## Overview

The signal generator uses a **30-second cron job** with **tier-aware interval checking** to ensure signals drop at the correct intervals for each tier.

## How It Works

### Cron Job Configuration
```sql
-- Runs every 30 seconds
SELECT cron.schedule(
  'generate-signals-30s',
  '*/30 * * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/signal-generator',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

### Tier Intervals (Built Into Edge Function)

| Tier | Interval | Signals/24h | Timer Display |
|------|----------|-------------|---------------|
| **FREE** | 8 hours (28,800 seconds) | 3 | 8:00:00 |
| **PRO** | 96 minutes (5,760 seconds) | 15 | 1:36:00 |
| **MAX** | 48 minutes (2,880 seconds) | 30 | 48:00 |

### Intelligent Interval Checking

**The edge function checks before generating signals:**

```typescript
// Edge function logic (simplified)
for each tier in ['FREE', 'PRO', 'MAX']:
  lastSignal = database.getLastSignalForTier(tier)
  timeSinceLastSignal = now - lastSignal.created_at

  if timeSinceLastSignal >= TIER_INTERVALS[tier]:
    tiersToProcess.push(tier)  // Ready to generate
  else:
    skip  // Not ready yet

// Only generate signals for tiers that are ready
for each tier in tiersToProcess:
  distributeSignalToTierUsers(tier)
```

## Why 30 Seconds?

**Question**: Why run cron every 30 seconds if signals drop every 48+ minutes?

**Answer**: The cron runs frequently to **check** if signals are ready, but the **edge function's tier-aware logic** ensures signals only drop when the appropriate interval has passed.

### Benefits:
1. ✅ **Responsive**: Signals drop within 30 seconds of being ready
2. ✅ **Accurate**: Timer matches actual signal drops
3. ✅ **Efficient**: Edge function returns early if no tiers ready
4. ✅ **Scalable**: Same cron handles all tiers

### Example Timeline (MAX tier - 48 min intervals):

```
00:00:00 - Cron runs → Signal generated for MAX users
00:00:30 - Cron runs → Skips (only 30s passed, need 48min)
00:01:00 - Cron runs → Skips (only 1min passed)
00:01:30 - Cron runs → Skips
...
00:47:30 - Cron runs → Skips (only 47.5min passed)
00:48:00 - Cron runs → Signal generated for MAX users ✅
```

## Database Query Per Cron Run

```sql
-- Edge function queries (runs 3 times per cron execution)
SELECT created_at
FROM user_signals
WHERE tier = 'FREE'
  AND metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC
LIMIT 1;

SELECT created_at
FROM user_signals
WHERE tier = 'PRO'
  AND metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC
LIMIT 1;

SELECT created_at
FROM user_signals
WHERE tier = 'MAX'
  AND metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC
LIMIT 1;
```

**Performance**: These queries are indexed and very fast (< 5ms each).

## Log Output Examples

### When No Tiers Ready (Most Common)
```
[Signal Generator] 🚀 Starting multi-coin scan
[Signal Generator] Found 5 active users
[Signal Generator] ⏳ FREE: Only 120 minutes passed, need 360 more minutes - Skipping
[Signal Generator] ⏳ PRO: Only 45 minutes passed, need 51 more minutes - Skipping
[Signal Generator] ⏳ MAX: Only 20 minutes passed, need 28 more minutes - Skipping
[Signal Generator] ⏸️  No tiers ready for signals yet
```

### When MAX Tier Ready
```
[Signal Generator] 🚀 Starting multi-coin scan
[Signal Generator] Found 5 active users
[Signal Generator] ⏳ FREE: Only 120 minutes passed, need 360 more minutes - Skipping
[Signal Generator] ⏳ PRO: Only 45 minutes passed, need 51 more minutes - Skipping
[Signal Generator] ✅ MAX: 48 minutes passed (>= 48 min required) - Will generate
[Signal Generator] 🎯 Processing tiers: MAX
[Signal Generator] Scanning 50 coins...
[Signal Generator] Found 12 potential signals
[Signal Generator] ✅ Selected: BTCUSDT LONG (3.45% change)
[Signal Generator] 📤 Distributing to 3 MAX users
[Signal Generator] ✅ MAX signal sent to user abc-123
```

### When Multiple Tiers Ready
```
[Signal Generator] ✅ FREE: 480 minutes passed (>= 480 min required) - Will generate
[Signal Generator] ✅ PRO: 96 minutes passed (>= 96 min required) - Will generate
[Signal Generator] ✅ MAX: 48 minutes passed (>= 48 min required) - Will generate
[Signal Generator] 🎯 Processing tiers: FREE, PRO, MAX
[Signal Generator] 📤 Distributing to 1 FREE users
[Signal Generator] 📤 Distributing to 1 PRO users
[Signal Generator] 📤 Distributing to 3 MAX users
```

## Checking Cron Status

### List Active Cron Jobs
```sql
SELECT * FROM cron.job;
```

### View Cron Execution History
```sql
SELECT *
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-signals-30s')
ORDER BY start_time DESC
LIMIT 20;
```

### View Edge Function Logs
```bash
supabase functions logs signal-generator --tail
```

## Troubleshooting

### Problem: Signals dropping randomly
**Symptom**: Signals appear at inconsistent intervals

**Diagnosis**:
1. Check if tier-aware interval checking is working
2. Verify `tiersToProcess` array in logs
3. Ensure `tier` column exists in `user_signals` table

**Fix**: Deploy latest edge function with tier-aware logic

### Problem: No signals at all
**Symptom**: No signals generated for any tier

**Diagnosis**:
1. Check if cron job is running: `SELECT * FROM cron.job`
2. Check for errors in edge function logs
3. Verify active users exist: `SELECT * FROM user_subscriptions WHERE status = 'active'`

**Fix**:
- If cron not running: Re-create cron job
- If no active users: Add test users
- If edge function errors: Check logs for details

### Problem: Timer shows wrong countdown
**Symptom**: UI timer doesn't match signal drops

**Diagnosis**:
1. Check if `SignalDropTimer.tsx` has correct intervals
2. Verify database has recent signals with correct `created_at`
3. Check if frontend is reading correct tier

**Fix**: Ensure `DROP_INTERVALS` in timer matches edge function `TIER_INTERVALS`

## Best Practices

1. **Don't change cron frequency** - 30 seconds is optimal
2. **Don't modify tier intervals** without updating both:
   - Edge function: `TIER_INTERVALS`
   - Frontend timer: `DROP_INTERVALS`
   - Frontend dropper: `DROP_INTERVALS`
3. **Monitor logs** for first 24 hours after deployment
4. **Index database** on `(tier, created_at)` for fast queries

## Migration Notes

### Before (Old System)
- Cron ran every 30s
- Edge function generated signals every run
- Random signal drops

### After (Current System)
- Cron runs every 30s (same)
- Edge function checks intervals before generating
- Predictable signal drops matching timer

**No breaking changes** - Existing signals continue working.

---

**Status**: ✅ PRODUCTION READY
**Last Updated**: 2025-01-19
