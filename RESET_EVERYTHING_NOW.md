# 🔄 RESET EVERYTHING - Fix Quota Metrics Now

## Current Issues
- ❌ Quota shows "129/30" (impossible - can't use more than allocated)
- ❌ Quota shows "-99 of 30 remaining" (negative remaining is invalid)
- ❌ Old signals need to be cleared for fresh start

---

## ✅ One-Click Reset (5 Minutes)

### Step 1: Open Supabase SQL Editor (1 minute)

1. **Go to:** https://supabase.com/dashboard
2. **Navigate to:** Your IgniteX project → SQL Editor
3. **Click:** "New query"

### Step 2: Run the Reset Script (2 minutes)

1. **Open this file:** [`supabase/RESET_SIGNALS_AND_QUOTAS.sql`](supabase/RESET_SIGNALS_AND_QUOTAS.sql)

2. **Copy the ENTIRE contents**

3. **Paste into Supabase SQL Editor**

4. **Click "Run"** - This shows you the current state:
   ```
   BEFORE RESET:
   - total_signals: 150
   - total_quota_used: 129  ⚠️ INVALID (shows 129/30)
   - quota records showing negative values
   ```

5. **Review the output** - Verify these numbers match what you see in the UI

### Step 3: Execute the Deletion (1 minute)

1. **Find these two lines in the script:**
   ```sql
   -- DELETE FROM user_signals;
   -- DELETE FROM user_signal_quotas;
   ```

2. **Remove the `--` to uncomment them:**
   ```sql
   DELETE FROM user_signals;
   DELETE FROM user_signal_quotas;
   ```

3. **Click "Run" again**

4. **Check the "AFTER RESET" section:**
   ```
   AFTER RESET - Signals:
   ✅ All signals cleared successfully

   AFTER RESET - Quotas:
   ✅ All quota records cleared successfully
   ```

### Step 4: Refresh the Intelligence Hub (1 minute)

1. **Hard refresh your browser:**
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + F5`

2. **Open Intelligence Hub:**
   ```
   http://localhost:8080/intelligence-hub
   ```

3. **Check the quota display:**
   - Should show: **"MAX - 0 of 30 signals remaining today"** ✅
   - NOT: "129/30" or "-99 remaining"

---

## 🎯 Expected Results

### Before Reset:
```
Daily Signal Quota
MAX - -99 of 30 signals remaining today  ❌
129/30 signals used  ❌
```

### After Reset:
```
Daily Signal Quota
MAX - 0 of 30 signals remaining today  ✅
0/30 signals used  ✅
```

### After First Signal Drops:
```
Daily Signal Quota
MAX - 1 of 30 signals remaining today  ✅
1/30 signals used  ✅
```

---

## 🧪 Verify Everything Works

### Test 1: Check Database Directly

Run this SQL query to verify reset:

```sql
-- Should return 0 for both
SELECT
  (SELECT COUNT(*) FROM user_signals) as signals_count,
  (SELECT COUNT(*) FROM user_signal_quotas) as quota_count;
```

**Expected:** Both should be `0` ✅

### Test 2: Wait for Next Signal Drop

Your tier determines when the next signal drops:
- **FREE:** 8 hours
- **PRO:** 96 minutes (1h 36m)
- **MAX:** 48 minutes

**Manually trigger edge function** to test immediately:

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
  "signalsGenerated": 1,
  "timestamp": "2025-01-19T..."
}
```

### Test 3: Check Quota Updates

After signal appears, check the quota display:

```sql
SELECT
  user_id,
  date,
  signals_received
FROM user_signal_quotas
WHERE date = CURRENT_DATE;
```

**Expected:** `signals_received = 1` ✅

---

## 🚨 Troubleshooting

### Issue: Still showing "129/30" after reset

**Cause:** Browser cache holding old data

**Fix:**
1. Clear browser cache completely
2. Close ALL tabs
3. Restart browser
4. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)

### Issue: Quota shows "0/0" instead of "0/30"

**Cause:** Tier not detected correctly

**Fix:**
```sql
-- Check your tier
SELECT tier, status FROM user_subscriptions
WHERE user_id = 'YOUR_USER_ID';

-- Should show: tier = 'MAX', status = 'active'
```

If tier is not MAX, update it:
```sql
UPDATE user_subscriptions
SET tier = 'MAX', status = 'active'
WHERE user_id = 'YOUR_USER_ID';
```

### Issue: No signals appearing after reset

**Causes:**
1. Edge function not deployed
2. Cron not running
3. Tier interval not met yet

**Fix:**
```bash
# Check edge function deployment
supabase functions list
# Should show: signal-generator ✅

# Manually trigger to test
curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator

# Check logs
supabase functions logs signal-generator
```

### Issue: Quota increasing by more than 1 per signal

**Cause:** Duplicate MAX tier subscriptions

**Fix:** Run the duplicate checker:
```sql
-- Check for duplicates
SELECT user_id, COUNT(*)
FROM user_subscriptions
WHERE tier = 'MAX' AND status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;
```

If duplicates found, run [`supabase/CHECK_DUPLICATE_USERS.sql`](supabase/CHECK_DUPLICATE_USERS.sql)

---

## 📋 Quick Reference

### Files Created:
- [`supabase/RESET_SIGNALS_AND_QUOTAS.sql`](supabase/RESET_SIGNALS_AND_QUOTAS.sql) - Main reset script
- [`supabase/CLEAR_ALL_SIGNALS.sql`](supabase/CLEAR_ALL_SIGNALS.sql) - Signals only (legacy)
- [`supabase/CHECK_DUPLICATE_USERS.sql`](supabase/CHECK_DUPLICATE_USERS.sql) - Find duplicate subscriptions

### Key Queries:

```sql
-- Check quota status
SELECT * FROM user_signal_quotas WHERE date = CURRENT_DATE;

-- Check recent signals
SELECT symbol, created_at FROM user_signals
ORDER BY created_at DESC LIMIT 10;

-- Check user tier
SELECT tier, status FROM user_subscriptions
WHERE user_id = auth.uid();
```

---

## ✅ Success Checklist

After running the reset:

- [ ] SQL shows "✅ All signals cleared successfully"
- [ ] SQL shows "✅ All quota records cleared successfully"
- [ ] Browser hard refresh performed
- [ ] Intelligence Hub shows "0/30" quota
- [ ] NO negative numbers in quota display
- [ ] NO "129/30" or similar invalid displays
- [ ] Timer countdown shows correct tier interval
- [ ] First signal appears after manual trigger or cron

---

## 🎉 You're Done!

Your signal system is now completely reset with:
- ✅ All old signals cleared
- ✅ All quota metrics reset to 0
- ✅ Clean slate for production signal generation
- ✅ No more negative or invalid quota displays

**Next:** Wait for edge function to generate first signal, or manually trigger it!

---

## 💡 Pro Tips

1. **Run this reset script** whenever you see invalid quota metrics
2. **Always hard refresh** after database changes
3. **Check duplicate users** if quota increases too fast
4. **Manual trigger** edge function to test immediately instead of waiting

---

**Need Help?**
- Check [`CLEANUP_AND_DEPLOY_GUIDE.md`](CLEANUP_AND_DEPLOY_GUIDE.md) for full deployment guide
- Review edge function logs in Supabase Dashboard
- Verify cron job is running (cron-job.org)
