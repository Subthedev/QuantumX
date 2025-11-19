# 🚀 Quick Start Testing Guide

## Complete End-to-End Test (5 minutes)

### Step 1: Upgrade User to MAX Tier (30 seconds)

**In Supabase SQL Editor:**
```sql
UPDATE user_subscriptions
SET
  tier = 'MAX',
  status = 'active',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 month'
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'contactsubhrajeet@gmail.com'
);

-- Verify upgrade
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
current_period_end: 2025-02-17 (1 month from now)
```

---

### Step 2: Open Intelligence Hub (10 seconds)

1. Navigate to `https://ignitex.live/intelligence-hub`
2. Log in with `contactsubhrajeet@gmail.com`
3. Look for the new **"Your MAX Tier Signals"** section (purple header with crown 👑)

**You should see:**
```
👑 Your MAX Tier Signals [0/30]
Top 30 best signals • Early access • Full details unlocked

[Loading spinner or empty state message]
"Signals will appear here with 10min early access..."
```

---

### Step 3: Check Signal Generation (1-2 minutes)

**Open Browser Console (F12) and run:**
```javascript
// Monitor pool status every 10 seconds
const monitorPool = setInterval(() => {
  const stats = window.smartSignalPool?.getPoolStats();
  if (stats) {
    console.log(`📊 Pool: ${stats.totalSignals} signals | Avg Quality: ${stats.avgQuality.toFixed(1)}%`);
  }
}, 10000);

// Print detailed summary
setTimeout(() => {
  window.printPoolSummary();
}, 60000); // After 1 minute
```

**Expected Console Output:**
```
🎯 [Pool] Adding signal to pool...
✅ [Pool] Added BTC LONG | Composite: 75.40 | Rank: 1/5

🎯 [Pool] ===== DISTRIBUTING SIGNALS TO TIERS =====
📦 [Pool] Tier allocations:
  FREE: 2 signals (top 2)
  PRO:  15 signals (top 15)
  MAX:  30 signals (top 30)
✅ [Pool] Distributed 30 signals to 1 MAX users
```

---

### Step 4: Verify Signals in Database (30 seconds)

**In Supabase SQL Editor:**
```sql
-- Check user_signals table
SELECT
  tier,
  symbol,
  signal_type,
  quality_score,
  confidence,
  full_details,
  entry_price,
  created_at
FROM user_signals
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'contactsubhrajeet@gmail.com'
)
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Output:**
```
tier: MAX | symbol: BTC | signal_type: LONG | quality_score: 85 | full_details: true | entry_price: 45000
tier: MAX | symbol: ETH | signal_type: SHORT | quality_score: 82 | full_details: true | entry_price: 2500
... (up to 30 signals)
```

---

### Step 5: See Signals in UI (30 seconds)

**Refresh the Intelligence Hub page**

**You should now see:**
```
┌─────────────────────────────────────────────────┐
│ 👑 Your MAX Tier Signals              [8/30]   │
│ Top 30 best signals • Early access             │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ [LONG] BTC              Quality: 85%        │ │
│ │ Rank #1 • MAX Tier                          │ │
│ │ Entry: $45,000 | SL: $44,000 | TP: $46,500 │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ [SHORT] ETH             Quality: 82%        │ │
│ │ Rank #2 • MAX Tier                          │ │
│ │ Entry: $2,500 | SL: $2,550 | TP: $2,400    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ... (more signals)                              │
└─────────────────────────────────────────────────┘
```

---

### Step 6: Test Real-Time Updates (1 minute)

**Keep the page open and watch for new signals**

**In console, you should see:**
```
[Hub] 🎉 New signal received via real-time subscription: {symbol: "SOL", signal_type: "LONG", ...}
[Hub] 🎯 Fetched 9 tier-based signals for MAX user
```

**The signal should appear in the UI automatically without refresh!**

---

## Visual Confirmation Checklist

### ✅ Tier Badge
- [ ] Purple gradient badge with crown icon
- [ ] Shows "MAX TIER"
- [ ] Counter shows current/total (e.g., "8/30")

### ✅ Signal Cards
- [ ] Shows symbol (BTC, ETH, etc.)
- [ ] Shows direction badge (LONG in green, SHORT in red)
- [ ] Shows quality percentage
- [ ] Shows confidence percentage
- [ ] Shows rank number (e.g., "Rank #1")

### ✅ Unlocked Details (MAX/PRO only)
- [ ] Entry price visible
- [ ] Stop loss visible
- [ ] Take profit visible
- [ ] No lock icon

### ✅ Real-Time Updates
- [ ] New signals appear automatically
- [ ] No page refresh needed
- [ ] Counter updates (e.g., 8/30 → 9/30)

---

## Quick Diagnostic Commands

### Check Everything is Working:
```javascript
// 1. Check pool health
window.printPoolSummary();

// 2. Check if signals are in database
supabase
  .from('user_signals')
  .select('count')
  .then(d => console.log('Total user signals:', d));

// 3. Check user tier
supabase
  .from('user_subscriptions')
  .select('tier, status')
  .then(d => console.log('User tier:', d));

// 4. Check quota
supabase
  .from('user_signal_quotas')
  .select('*')
  .eq('date', new Date().toISOString().split('T')[0])
  .then(d => console.log('Today quota:', d));
```

---

## Common Issues & Quick Fixes

### Issue: No signals appearing after 3 minutes
**Quick Fix:**
```javascript
// Check if pool is receiving signals
window.smartSignalPool.getPoolStats();

// If pool is empty, wait another 2 minutes
// Signal generation takes 1-3 minutes
```

### Issue: Signals in database but not in UI
**Quick Fix:**
```javascript
// Force refresh in console
location.reload();

// Or check if signals are expired
supabase
  .from('user_signals')
  .select('expires_at')
  .then(d => console.log('Expiry times:', d));
```

### Issue: Shows "Loading..." forever
**Quick Fix:**
1. Check browser console for errors
2. Verify user is logged in
3. Check Supabase connection

---

## Success Metrics

### ✅ Everything is working if:
1. User upgraded to MAX tier (check SQL)
2. Signals appear in database within 2 minutes
3. UI shows "Your MAX Tier Signals" section
4. Signals display with full details unlocked
5. Quality and confidence scores visible
6. Real-time updates working (new signals appear automatically)
7. Quota counter accurate

---

## Next Steps After Testing

### For Other Users (PRO/FREE):

**Create PRO User:**
```sql
UPDATE user_subscriptions
SET tier = 'PRO', status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'pro-user@example.com');
```

**Test FREE User:**
- Just create a new account
- Will default to FREE tier
- Should see 2 signals with locked details
- Should see upgrade CTA

---

## 🎯 5-Minute Test Complete!

If you can see signals in the UI with all the features working, you're ready to launch! 🚀

**The tier-based monetization system is LIVE!** 💰
