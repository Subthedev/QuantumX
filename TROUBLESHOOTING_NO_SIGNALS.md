# 🔧 Troubleshooting: No Signals Appearing

## Current Symptoms
- ✅ UI shows "Your MAX Tier Signals 0/30"
- ❌ "No signals yet" message
- ❌ "Live Signals 0 signals in play"

This means the tier system is working, but signals are not being generated or distributed.

---

## Step-by-Step Diagnosis

### Step 1: Check Database Setup (CRITICAL)

**Run this in Supabase SQL Editor:**
```sql
-- Check if user has subscription
SELECT
  u.email,
  us.tier,
  us.status,
  us.current_period_end
FROM user_subscriptions us
JOIN auth.users u ON u.id = us.user_id
WHERE u.email = 'contactsubhrajeet@gmail.com';
```

**Expected Output:**
```
email: contactsubhrajeet@gmail.com
tier: MAX
status: active
current_period_end: (1 month from now)
```

**If NO ROWS:** Run the full [CHECK_SYSTEM_STATUS.sql](CHECK_SYSTEM_STATUS.sql) to create subscription.

---

### Step 2: Run Browser Diagnostic

**Open browser console (F12) and paste this:**
```javascript
// Copy entire contents of BROWSER_DIAGNOSTIC.js and paste here
```

Or download [BROWSER_DIAGNOSTIC.js](BROWSER_DIAGNOSTIC.js), copy contents, and paste in console.

**Look for:**
- Smart pool status (should show 0 signals if just started)
- Global hub service running (should be "Yes")
- User authenticated (should show your email)
- User tier (should show "MAX")

---

### Step 3: Wait for Signal Generation (1-3 minutes)

**The hub service needs time to:**
1. Initialize (30 seconds)
2. Fetch market data (1 minute)
3. Run strategies (17 strategies × ~10 seconds each)
4. Filter through Delta V2 + Gamma V2
5. Add to smart pool
6. Distribute to database

**Monitor in console:**
```javascript
// Check pool status every 10 seconds
const monitor = setInterval(() => {
  const stats = window.smartSignalPool?.getPoolStats();
  if (stats && stats.totalSignals > 0) {
    console.log(`✅ Pool has ${stats.totalSignals} signals!`);
    window.printPoolSummary();
    clearInterval(monitor);
  } else {
    console.log(`⏳ Waiting... (${new Date().toLocaleTimeString()})`);
  }
}, 10000);
```

---

### Step 4: Check Console Logs

**Look for these key logs:**

**Signal Generation:**
```
[MultiStrategy] Running all 17 strategies for BTC...
[Delta V2] 📊 EVALUATING: BTC LONG
✅ PASS: ML predicts 55.0% win probability
```

**Smart Pool:**
```
🎯 [Pool] Adding signal to pool...
✅ [Pool] Added BTC LONG | Composite: 75.40 | Rank: 1/5
```

**Distribution:**
```
🎯 [Pool] ===== DISTRIBUTING SIGNALS TO TIERS =====
📦 [Pool] Tier allocations:
  FREE: 2 signals (top 2)
  PRO:  15 signals (top 15)
  MAX:  30 signals (top 30)
✅ [Pool] Distributed 30 signals to 1 MAX users
```

**If you DON'T see these logs:**
- Global hub might not be started
- Refresh the page
- Check for JavaScript errors in console

---

### Step 5: Verify Database Writes

**After seeing distribution logs, check database:**

```sql
-- Check user_signals table
SELECT
  symbol,
  signal_type,
  quality_score,
  full_details,
  created_at
FROM user_signals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** 1-30 signals with `full_details = true`

**If empty:**
- Check console for database errors
- Check RLS policies on user_signals table
- User might not have subscription (go back to Step 1)

---

### Step 6: Force Refresh UI

If database has signals but UI doesn't:

```javascript
// In console
location.reload();
```

Or just refresh the browser (Ctrl+R / Cmd+R)

---

## Common Issues & Fixes

### Issue 1: "No subscription found"

**Fix:**
```sql
INSERT INTO user_subscriptions (user_id, tier, status, current_period_start, current_period_end)
SELECT
  id,
  'MAX'::user_tier,
  'active'::subscription_status,
  NOW(),
  NOW() + INTERVAL '1 month'
FROM auth.users
WHERE email = 'contactsubhrajeet@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET tier = 'MAX', status = 'active';
```

### Issue 2: "Pool has signals but database is empty"

**Possible causes:**
- Database permissions (RLS)
- Quota exceeded
- User ID mismatch

**Fix:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_signals';

-- Reset quota
DELETE FROM user_signal_quotas
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com');
```

### Issue 3: "Global hub not running"

**Fix:**
- Refresh page
- Check console for errors
- Hub auto-starts on page load

### Issue 4: "Signals expired"

**Check:**
```sql
SELECT COUNT(*) as expired_signals
FROM user_signals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
AND expires_at < NOW();
```

**Fix:** Wait for new signals (old ones auto-expire)

---

## Manual Test (Force Signal Creation)

If you want to test without waiting, run this in **browser console**:

```javascript
// Add a test signal to the pool
const testSignal = {
  id: `test_${Date.now()}`,
  symbol: 'BTC',
  signal_type: 'LONG',
  confidence: 90,
  quality_score: 85,
  entry_price: 45000,
  take_profit: [46000, 47000],
  stop_loss: 44000,
  timestamp: new Date().toISOString(),
  expires_at: new Date(Date.now() + 4*60*60*1000).toISOString(),
  strategy: 'test_strategy',
  metadata: { test: true }
};

await window.smartSignalPool.addSignal(testSignal);
console.log('✅ Test signal added! Check pool summary:');
window.printPoolSummary();

// Wait 5 seconds then check database
setTimeout(async () => {
  const { data } = await supabase
    .from('user_signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('Latest signal in database:', data);
}, 5000);
```

---

## Expected Timeline

| Time | What Should Happen |
|------|-------------------|
| 0:00 | Page loads, hub starts initializing |
| 0:30 | Hub fully initialized |
| 1:00 | First market data fetched |
| 1:30 | First strategies start analyzing |
| 2:00 | First signals generated |
| 2:30 | Signals added to pool |
| 3:00 | Signals distributed to database |
| 3:00 | **Signals appear in UI!** ✅ |

---

## Debug Checklist

- [ ] User has subscription in database (tier: MAX, status: active)
- [ ] Browser console shows no JavaScript errors
- [ ] Global hub service is running
- [ ] Smart pool exists in window object
- [ ] Waited at least 3 minutes after page load
- [ ] Console shows signal generation logs
- [ ] Console shows pool distribution logs
- [ ] Database has records in user_signals table
- [ ] Tried refreshing the page

---

## Still Not Working?

**Run this complete diagnostic:**

1. **In Supabase SQL Editor:** Run [CHECK_SYSTEM_STATUS.sql](CHECK_SYSTEM_STATUS.sql)
2. **In Browser Console:** Paste [BROWSER_DIAGNOSTIC.js](BROWSER_DIAGNOSTIC.js)
3. **Wait 3 minutes**
4. **Run again:** Both scripts
5. **Share output** if still no signals

---

## Quick Fix Commands

```javascript
// Check everything
window.printPoolSummary();
window.debugSignals();

// Check database directly
supabase.from('user_signals').select('count').then(d => console.log('Total signals:', d));

// Force pool refresh
window.smartSignalPool.refreshPool();

// Check user tier
supabase.from('user_subscriptions').select('tier').then(d => console.log('My tier:', d));
```

---

## Contact Points

If nothing works after:
- ✅ Running all SQL scripts
- ✅ Waiting 5+ minutes
- ✅ Running diagnostics
- ✅ Refreshing page

Then there might be a deeper issue. Check:
1. Supabase project is active
2. RLS policies are correct
3. No network errors in console
4. User is actually logged in
