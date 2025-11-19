# 🔧 Fix Signals Not Showing

## Step 1: Check Database (2 minutes)

### Run the diagnostic SQL

1. **Open Supabase SQL Editor**
2. **Copy and paste:** [`CHECK_SIGNALS_NOW.sql`](CHECK_SIGNALS_NOW.sql)
3. **Click "Run"**

### Read the Results

Look for these key checks:

**✅ If you see:**
```
Total Signals: ✅ Signals exist in database
Edge Function Signals: ✅ Edge function created 1 signal(s)
Your Signals: ✅ You have 1 signal(s)
match_status: ✅ MATCH - Signal should appear
```
→ **Skip to Step 3 (Frontend issue)**

**❌ If you see:**
```
Total Signals: ❌ NO SIGNALS
```
→ **Edge function didn't run - Continue to "Fix A" below**

**❌ If you see:**
```
Your Signals: ❌ NO signals for your user
match_status: ❌ MISMATCH
```
→ **Signals created for wrong user - Continue to "Fix B" below**

---

## Fix A: Edge Function Not Creating Signals

### Check Edge Function Logs

1. **Go to:** https://supabase.com/dashboard → Functions → signal-generator → Logs
2. **Look for recent invocations**

**If you see:**
```
No active users found
```
→ **No subscriptions exist**

**Fix:**
```sql
-- Create subscription for your user
INSERT INTO user_subscriptions (user_id, tier, status)
SELECT id, 'MAX', 'active'
FROM auth.users
WHERE email = 'contactsubhrajeet@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET tier = 'MAX', status = 'active';
```

**If you see:**
```
No tiers ready
Only X minutes passed, need Y more minutes
```
→ **Too soon since last signal**

**Fix:**
```sql
-- Delete last signal to reset timer
DELETE FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
AND created_at = (
  SELECT MAX(created_at) FROM user_signals
  WHERE metadata->>'generatedBy' = 'edge-function'
);

-- Then trigger edge function again
```

**If you see:**
```
Error: ...
```
→ **Edge function has an error - Share the error**

---

## Fix B: Signals Created for Wrong User

This happens when there are multiple users in `user_subscriptions` table.

### Check which users got signals

```sql
SELECT
  us.user_id,
  au.email,
  COUNT(*) as signal_count
FROM user_signals us
LEFT JOIN auth.users au ON au.id = us.user_id
WHERE us.metadata->>'generatedBy' = 'edge-function'
GROUP BY us.user_id, au.email;
```

**If signals went to different user:**

**Option 1: Reassign signals to your user**
```sql
-- Get your user_id
SELECT id, email FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com';
-- Copy the ID

-- Reassign signals
UPDATE user_signals
SET user_id = 'YOUR_USER_ID_FROM_ABOVE'
WHERE metadata->>'generatedBy' = 'edge-function';
```

**Option 2: Delete and regenerate**
```sql
-- Delete wrong signals
DELETE FROM user_signals WHERE metadata->>'generatedBy' = 'edge-function';

-- Trigger edge function again
```

---

## Step 2: Check Frontend (Browser Console)

### Open Intelligence Hub
```
http://localhost:8080/intelligence-hub
```

### Open Console (F12) and run:

```javascript
// Check if user is logged in
const { data: { user } } = await supabase.auth.getUser();
console.log('Logged in user:', user?.email, user?.id);

// Check signals for this user
const { data: signals } = await supabase
  .from('user_signals')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

console.log('Your signals:', signals);

// If signals array is empty but Step 1 showed signals exist
// → user_id MISMATCH (go back to Fix B)
```

**Expected:**
```
Logged in user: contactsubhrajeet@gmail.com, abc123...
Your signals: [{ symbol: 'BTCUSDT', ... }]
```

**If signals array is empty:**
```
Your signals: []
```
→ **User ID mismatch - Run Fix B**

---

## Step 3: Force Frontend Refresh

If signals exist in database and match your user_id, but still not showing:

### Hard Refresh
1. **Clear cache:** Right-click refresh → "Empty Cache and Hard Reload"
2. **Or:** `Cmd+Shift+R` (Mac) / `Ctrl+Shift+F5` (Windows)

### Rebuild App
```bash
npm run build
npm run dev
```

### Check Console Logs
Open Console (F12) and look for:

**❌ Errors:**
```
Error fetching user signals: ...
TypeError: Cannot read property...
```
→ **Share the error message**

**✅ Success:**
```
[Hub] Fetched 1 user signals
```

---

## Step 4: Manual Signal Creation (Test)

If edge function keeps failing, create a test signal manually:

```sql
-- Get your user_id
SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com';
-- Copy the ID

-- Create test signal
INSERT INTO user_signals (
  user_id,
  signal_id,
  tier,
  symbol,
  signal_type,
  confidence,
  quality_score,
  entry_price,
  take_profit,
  stop_loss,
  expires_at,
  metadata,
  full_details,
  viewed,
  clicked
) VALUES (
  'YOUR_USER_ID_FROM_ABOVE',
  'TEST-' || NOW()::text,
  'MAX',
  'BTCUSDT',
  'LONG',
  85,
  90,
  95000,
  ARRAY[96900, 99000],
  93100,
  NOW() + INTERVAL '24 hours',
  jsonb_build_object(
    'strategy', 'Test Signal',
    'timeframe', '15m',
    'generatedBy', 'manual-test',
    'timestamp', NOW()::text,
    'image', 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'
  ),
  true,
  false,
  false
);

-- Check if it appears
SELECT * FROM user_signals WHERE signal_id LIKE 'TEST-%';
```

**If test signal appears in frontend:**
→ **Edge function is the problem**

**If test signal does NOT appear:**
→ **Frontend query is the problem**

---

## Quick Debug Checklist

Run this in browser console:

```javascript
// COMPLETE DIAGNOSTIC
console.log('=== SIGNAL DEBUG ===');

// 1. Auth check
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  console.error('❌ NOT LOGGED IN');
} else {
  console.log('✅ User:', user.email, user.id);

  // 2. Subscription check
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();
  console.log('✅ Subscription:', sub?.tier, sub?.status);

  // 3. Signal count check
  const { data: signals, error } = await supabase
    .from('user_signals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Query error:', error);
  } else {
    console.log('📊 Your signals count:', signals?.length || 0);
    if (signals && signals.length > 0) {
      console.log('📋 Recent signals:', signals.slice(0, 3));
    }
  }

  // 4. Check ALL signals (not just yours)
  const { data: allSignals } = await supabase
    .from('user_signals')
    .select('user_id, symbol, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('📊 All recent signals (any user):', allSignals);
}

console.log('=== END DEBUG ===');
```

---

## Most Common Issues & Fixes

### 1. **No signals in database at all**
**Cause:** Edge function not triggered or failed
**Fix:** Check edge function logs, verify subscriptions exist

### 2. **Signals exist but for different user_id**
**Cause:** Multiple users in subscriptions table
**Fix:** Reassign signals to correct user (Fix B)

### 3. **Signals exist for correct user but not showing**
**Cause:** Frontend cache or query issue
**Fix:** Hard refresh, rebuild app

### 4. **User not logged in**
**Cause:** Session expired
**Fix:** Login again at `/auth`

### 5. **Subscription not found**
**Cause:** No record in user_subscriptions
**Fix:** Create subscription (Fix A)

---

## Next Steps

1. **Run [`CHECK_SIGNALS_NOW.sql`](CHECK_SIGNALS_NOW.sql)** in Supabase
2. **Identify which case** you're in (A or B or neither)
3. **Apply the fix** for your case
4. **Run the browser console diagnostic**
5. **Share the results** if still not working

---

**The issue is likely:** Signals created for wrong user_id because multiple users exist in `user_subscriptions` table.

Let me know what the diagnostic SQL shows!
