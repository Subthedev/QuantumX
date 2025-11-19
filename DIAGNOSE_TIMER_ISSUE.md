# 🔍 Diagnose Timer Not Starting

## Quick Checks (2 minutes)

### Step 1: Open Intelligence Hub
```
http://localhost:8080/intelligence-hub
```

### Step 2: Open Browser Console (F12)

Look for these logs:

**✅ EXPECTED (Timer working):**
```
[SignalDropTimer] 🚀 Starting DATABASE-SYNCED timer for MAX tier
[SignalDropTimer] ✅ Reading from database - NO frontend scheduler!
```

**❌ NOT EXPECTED (If you see this, timer is broken):**
```
Error: Cannot read property 'created_at' of null
TypeError: tier is undefined
Database error: ...
```

---

## Common Issues & Fixes

### Issue 1: Page is completely blank or not loading

**Check:**
1. Open Console (F12) → Check for React errors
2. Network tab → Check if API calls are failing

**Fix:**
```bash
# Rebuild the app
npm run build

# Restart dev server
npm run dev
```

### Issue 2: "Tier is undefined" or "Cannot read property"

**Cause:** User not logged in or subscription not found

**Fix - Check if logged in:**
1. Open Console (F12)
2. Run this:
```javascript
// Check auth status
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Check subscription
const { data: sub } = await supabase
  .from('user_subscriptions')
  .select('*')
  .eq('user_id', user.id)
  .single();
console.log('Subscription:', sub);
```

**Expected:**
```
User: { id: '...', email: 'contactsubhrajeet@gmail.com' }
Subscription: { tier: 'MAX', status: 'active' }
```

**If subscription is null:**
```sql
-- Run this SQL in Supabase
INSERT INTO user_subscriptions (user_id, tier, status)
VALUES ('YOUR_USER_ID', 'MAX', 'active')
ON CONFLICT (user_id) DO UPDATE SET tier = 'MAX', status = 'active';
```

### Issue 3: Timer shows "0:00" or doesn't count

**Cause:** No signals in database yet

**Check:**
```sql
SELECT created_at FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC LIMIT 1;
```

**If no results:** No signals generated yet - Timer will show full interval

**Fix:** Manually trigger edge function:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator
```

### Issue 4: Timer not visible on page

**Check:** Browser zoom level and scroll position

**Try:**
1. Reset zoom: `Cmd+0` (Mac) or `Ctrl+0` (Windows)
2. Scroll down to see if timer is below fold
3. Check if page is responsive (resize window)

---

## Debug Script - Run in Browser Console

Paste this into your browser console (F12) while on Intelligence Hub page:

```javascript
// INTELLIGENCE HUB DIAGNOSTIC SCRIPT
console.log('=== INTELLIGENCE HUB DIAGNOSTIC ===');

// 1. Check if supabase is loaded
if (typeof supabase === 'undefined') {
  console.error('❌ Supabase not loaded!');
} else {
  console.log('✅ Supabase loaded');

  // 2. Check user auth
  supabase.auth.getUser().then(({ data, error }) => {
    if (error) {
      console.error('❌ Auth error:', error);
    } else if (!data.user) {
      console.error('❌ User not logged in!');
    } else {
      console.log('✅ User logged in:', data.user.email);

      // 3. Check subscription
      supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', data.user.id)
        .single()
        .then(({ data: sub, error: subError }) => {
          if (subError) {
            console.error('❌ Subscription error:', subError);
          } else {
            console.log('✅ Subscription:', {
              tier: sub.tier,
              status: sub.status
            });

            // 4. Check last signal
            supabase
              .from('user_signals')
              .select('created_at, symbol')
              .eq('metadata->>generatedBy', 'edge-function')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
              .then(({ data: signal, error: signalError }) => {
                if (signalError) {
                  console.error('❌ Signal query error:', signalError);
                } else if (!signal) {
                  console.log('⚠️  No signals yet - Timer will show full interval');
                } else {
                  console.log('✅ Last signal:', {
                    symbol: signal.symbol,
                    created_at: signal.created_at,
                    minutes_ago: Math.floor((Date.now() - new Date(signal.created_at).getTime()) / 60000)
                  });

                  // 5. Calculate timer
                  const INTERVALS = { FREE: 8*60, PRO: 96, MAX: 48 }; // minutes
                  const interval = INTERVALS[sub.tier];
                  const lastTime = new Date(signal.created_at).getTime();
                  const nextDrop = lastTime + (interval * 60 * 1000);
                  const remaining = Math.max(0, Math.floor((nextDrop - Date.now()) / 1000));

                  console.log('⏱️  Timer calculation:', {
                    interval_minutes: interval,
                    remaining_seconds: remaining,
                    remaining_formatted: `${Math.floor(remaining/60)}:${(remaining%60).toString().padStart(2,'0')}`,
                    next_drop: new Date(nextDrop).toLocaleTimeString()
                  });
                }
              });
          }
        });
    }
  });
}

console.log('=== END DIAGNOSTIC ===');
```

**Expected output:**
```
=== INTELLIGENCE HUB DIAGNOSTIC ===
✅ Supabase loaded
✅ User logged in: contactsubhrajeet@gmail.com
✅ Subscription: { tier: 'MAX', status: 'active' }
⚠️  No signals yet - Timer will show full interval
=== END DIAGNOSTIC ===
```

---

## Most Likely Causes

### 1. **No signals generated yet** (Most common)
- Timer needs at least one signal to calculate countdown
- Shows full interval (48 min for MAX) until first signal
- **Fix:** Manually trigger edge function

### 2. **User not logged in**
- Timer component requires authenticated user
- **Fix:** Login at `/auth`

### 3. **Subscription not found**
- Database missing subscription record
- **Fix:** Create subscription in `user_subscriptions` table

### 4. **Database query failing**
- Network error or permissions issue
- **Fix:** Check Console for errors, verify Supabase connection

---

## Quick Fix - Reset Everything

If nothing else works:

```bash
# 1. Clear browser data
# Chrome: Settings → Privacy → Clear browsing data → All time

# 2. Rebuild app
npm run build

# 3. Restart dev server
npm run dev

# 4. Hard refresh browser
# Mac: Cmd+Shift+R
# Windows: Ctrl+Shift+F5

# 5. Login again
# Go to: http://localhost:8080/auth
```

---

## What Should You See?

### Intelligence Hub Page (Working correctly):

```
┌─────────────────────────────────────────┐
│ Intelligence Hub                         │
├─────────────────────────────────────────┤
│ Daily Signal Quota          [MAX]        │
│ 0 of 30 signals remaining today          │
│ [Progress bar: 0%]                       │
├─────────────────────────────────────────┤
│ [Clock Icon] Next Signal In              │
│        48:00                             │
│ [████████░░░░░░░░░░░░] 0%              │
├─────────────────────────────────────────┤
│ No signals yet...                        │
│ Waiting for first signal                 │
└─────────────────────────────────────────┘
```

### Console Logs (Working correctly):

```
[SignalDropTimer] 🚀 Starting DATABASE-SYNCED timer for MAX tier
[SignalDropTimer] ✅ Reading from database - NO frontend scheduler!
[Hub UI] 🚀 SERVER-SIDE MODE: Frontend will NOT generate signals
[Hub UI] 📡 Listening for signals via Supabase Real-time...
```

---

## Next Steps

1. **Run the diagnostic script** in browser console
2. **Check the expected output** matches what you see
3. **If timer still not showing:**
   - Share Console output (F12 → Console tab)
   - Share any error messages
   - Check Network tab for failed requests

4. **If timer shows but is stuck at 0:00:**
   - Manually trigger edge function
   - Check edge function logs in Supabase Dashboard

---

Let me know what you see in the console and I can help debug further!
