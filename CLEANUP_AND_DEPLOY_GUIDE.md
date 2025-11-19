# 🧹 Cleanup & Deploy Guide

## Overview

This guide helps you clean up duplicate signals and users, then deploy the fixed edge function with proper deduplication.

---

## Step 1: Clear All Signals (5 minutes)

### Purpose
Remove all previous signals to start fresh with the new deduplication system.

### Instructions

1. **Go to Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
   ```

2. **Copy the cleanup script:**
   - Open: [`supabase/CLEAR_ALL_SIGNALS.sql`](supabase/CLEAR_ALL_SIGNALS.sql)
   - Copy the ENTIRE contents

3. **Run the diagnostic queries first:**
   - Paste the script into SQL Editor
   - Click **"Run"** to see current signal counts
   - Review the output to understand what will be deleted

4. **Execute the cleanup:**
   - Uncomment this line in the script:
     ```sql
     -- DELETE FROM user_signals;
     ```
     (Remove the `--` to make it active)

   - Run the script again
   - Check the VERIFICATION section confirms: **"✅ CLEANUP SUCCESSFUL"**

### Expected Results

**Before cleanup:**
```
total_signals | unique_users | unique_symbols
-------------|--------------|---------------
50           | 3            | 15
```

**After cleanup:**
```
remaining_signals | status
-----------------|--------------------------------
0                | ✅ CLEANUP SUCCESSFUL - All signals removed
```

---

## Step 2: Check for Duplicate Users (3 minutes)

### Purpose
Identify if the same user has multiple MAX tier subscriptions (causing duplicate signals).

### Instructions

1. **Open Supabase SQL Editor**

2. **Copy the diagnostic script:**
   - Open: [`supabase/CHECK_DUPLICATE_USERS.sql`](supabase/CHECK_DUPLICATE_USERS.sql)
   - Copy and paste into SQL Editor

3. **Run the script:**
   - Click **"Run"** to see if duplicates exist

### Interpreting Results

**✅ No duplicates:**
```
status                                          | total | unique
-----------------------------------------------|-------|-------
✅ NO DUPLICATES - Each user has exactly 1... | 3     | 3
```
→ **Action:** Skip to Step 3

**⚠️ Duplicates found:**
```
user_id              | tier | duplicate_count
---------------------|------|----------------
abc123...           | MAX  | 2
xyz789...           | MAX  | 3
```
→ **Action:** Continue with cleanup below

### Fixing Duplicates

If duplicates are found:

1. **Review the duplicate entries:**
   - Check the `subscription_ids` and `created_dates` columns
   - Confirm which ones should be kept (usually the oldest)

2. **Uncomment the DELETE query:**
   ```sql
   -- DELETE FROM user_subscriptions
   -- WHERE id IN (...
   ```
   (Remove the `--` from all lines)

3. **Run the script again**

4. **Verify:** Check that status now shows "✅ NO DUPLICATES"

---

## Step 3: Deploy Fixed Edge Function

### Automated Deployment (Recommended)

The edge function is currently being deployed automatically via CLI.

**Check deployment status:**
```bash
# In your terminal, wait for this message:
✓ Deployed Function signal-generator on project YOUR_PROJECT_REF
```

If deployment succeeds, skip to **Step 4: Test**.

---

### Manual Deployment (If CLI Fails)

If the CLI deployment hangs or fails:

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions
   ```

2. **Find `signal-generator` function:**
   - Click on the function name

3. **Edit the function:**
   - Click **"Edit"** or the code editor icon
   - Copy ENTIRE contents from:
     [`supabase/functions/signal-generator/index.ts`](supabase/functions/signal-generator/index.ts)
   - Paste into the dashboard editor
   - Click **"Deploy"**

4. **Wait for deployment:**
   - Should see: "✅ Deployed successfully"

---

## Step 4: Test the Fixed System (5 minutes)

### Test 1: Manual Trigger

Trigger the edge function manually to generate a signal:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator
```

**Expected response:**
```json
{
  "success": true,
  "signalsGenerated": 3,
  "timestamp": "2025-01-19T12:30:45.123Z"
}
```

### Test 2: Verify No Duplicates

Run this SQL query:

```sql
SELECT
  symbol,
  signal_type,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(user_id) as users,
  MAX(created_at) as created_at
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
GROUP BY symbol, signal_type
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Each symbol should appear ONCE (distributed to multiple users, but same signal_id)

**✅ Good:**
```
symbol    | signal_type | duplicate_count | users
----------|-------------|-----------------|-------------------------
BTCUSDT   | LONG        | 3              | [user1, user2, user3]
```

**❌ Bad (if you see this, duplicates still exist):**
```
symbol    | signal_type | duplicate_count | users
----------|-------------|-----------------|-------------------------
AXSUSDT   | LONG        | 6              | [user1, user1, user2, user2, ...]
```

### Test 3: Verify Coin Variety

Trigger the edge function 5 times (manually or wait for cron):

```sql
SELECT
  symbol,
  signal_type,
  created_at,
  metadata->>'generatedBy' as source
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** You should see DIFFERENT symbols (not all AXSUSDT):

**✅ Good:**
```
symbol    | signal_type | created_at
----------|-------------|-------------------
BTCUSDT   | LONG        | 2025-01-19 12:00
ETHUSDT   | SHORT       | 2025-01-19 11:12
SOLUSDT   | LONG        | 2025-01-19 10:24
ADAUSDT   | LONG        | 2025-01-19 09:36
```

**❌ Bad:**
```
symbol    | signal_type | created_at
----------|-------------|-------------------
AXSUSDT   | LONG        | 2025-01-19 12:00
AXSUSDT   | LONG        | 2025-01-19 11:12
AXSUSDT   | LONG        | 2025-01-19 10:24
```

---

## Step 5: Verify Frontend Timer (2 minutes)

1. **Open Intelligence Hub:**
   ```
   http://localhost:8080/intelligence-hub
   ```

2. **Check the timer:**
   - Should show countdown matching your tier:
     - **FREE:** Countdown from 8 hours
     - **PRO:** Countdown from 96 minutes
     - **MAX:** Countdown from 48 minutes

3. **Wait for timer to hit 0:**
   - Timer should reset and new signal should appear
   - Check database to confirm new signal was inserted

---

## Troubleshooting

### Issue: Still seeing duplicate signals

**Diagnosis:**
```sql
-- Check if same user_id appears multiple times in subscriptions
SELECT user_id, COUNT(*)
FROM user_subscriptions
WHERE tier = 'MAX' AND status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;
```

**Fix:** Run the duplicate cleanup in Step 2 again

---

### Issue: Same coin repeating (e.g., all AXSUSDT)

**Diagnosis:**
```sql
-- Check recent signals and their outcomes
SELECT
  symbol,
  signal_type,
  metadata->>'mlOutcome' as outcome,
  created_at
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC
LIMIT 20;
```

**Likely causes:**
1. **AXSUSDT has highest price movement** → Working as intended (strongest signal)
2. **Deduplication not working** → Check that signals have `generatedBy: 'edge-function'` in metadata
3. **2-hour window too short** → Signals might be exactly 2 hours apart

**Fix:** Edge function will automatically pick different coins once AXSUSDT has a recent signal

---

### Issue: No signals generating

**Check Edge Function logs:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions/signal-generator/logs
```

**Common causes:**
- No MAX tier users → Check `user_subscriptions` table
- All coins filtered by deduplication → Check recent signals
- Tier intervals not met yet → Check logs for "⏳ Only X minutes passed"

---

## Success Checklist

- [ ] All previous signals cleared (`CLEAR_ALL_SIGNALS.sql` executed)
- [ ] No duplicate MAX tier users (`CHECK_DUPLICATE_USERS.sql` shows ✅)
- [ ] Edge function deployed successfully
- [ ] Manual test returns `"signalsGenerated": 3` (or your user count)
- [ ] Database shows DIFFERENT coins in recent signals
- [ ] Frontend timer shows correct countdown
- [ ] New signals appear when timer hits 0

---

## What's Fixed

### ✅ Direction-Aware Deduplication
- Tracks `symbol + direction` pairs separately
- Allows reversals (LONG → SHORT or vice versa)
- Blocks same direction if previous signal lost/timed out
- Allows same direction if previous signal WON (momentum)

### ✅ 2-Hour Deduplication Window
- Extended from 10 minutes to 2 hours
- Prevents same coin from appearing too frequently
- Smart enough to allow high-conviction repeats

### ✅ Adaptive Expiry
- Calculates 6-24 hour expiry based on:
  - Volatility (price change percentage)
  - Target distance (how far TP is from entry)
  - Confidence level
- Replaces fixed 24-hour expiry

### ✅ Tier-Aware Distribution
- FREE: 8-hour intervals (3 signals/day)
- PRO: 96-minute intervals (15 signals/day)
- MAX: 48-minute intervals (30 signals/day)

### ✅ Smart Fallback Logic
- If all signals filtered: pick highest-confidence signal
- If no quality signals: pick random unused coin
- Prevents "no signals" edge cases

---

## Next Steps (Optional Improvements)

After confirming everything works, consider these enhancements:

1. **Extend outcome monitoring** from 2 minutes to match signal expiry (6-24 hours)
2. **Integrate ML scoring** (Delta V2) for signal quality filtering
3. **Historical win rate filtering** (reject strategies with <45% win rate)
4. **ATR-normalized thresholds** (replace fixed 0.5% price change)
5. **Smart quota management** (rollover unused quota, bonus signals)

See full analysis in `ANALYSIS_IMPROVEMENTS.md` for details.

---

## Quick Reference

```bash
# Check deployment
supabase functions list

# Manual trigger
curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator

# Check logs
supabase functions logs signal-generator
```

**SQL Scripts:**
- [CLEAR_ALL_SIGNALS.sql](supabase/CLEAR_ALL_SIGNALS.sql) - Clear all signals
- [CHECK_DUPLICATE_USERS.sql](supabase/CHECK_DUPLICATE_USERS.sql) - Find duplicate subscriptions

---

**You're ready to deploy! 🚀**
