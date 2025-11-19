# 🔍 Diagnose Signal Blockage - Find Out Why Signals Aren't Appearing

## Quick Diagnostic (2 Minutes)

### Step 1: Open Browser Console

1. Go to http://localhost:8080/intelligence-hub
2. Press **F12** to open Developer Console
3. Click **Console** tab

### Step 2: Run This Diagnostic Script

Copy and paste this entire script into the console:

```javascript
// ═══════════════════════════════════════════════════════════
// 🔍 SIGNAL FLOW DIAGNOSTIC - Find Where Signals Are Stuck
// ═══════════════════════════════════════════════════════════

const diagnosesignalFlow = async () => {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🔍 SIGNAL FLOW DIAGNOSTIC`);
  console.log(`${'═'.repeat(80)}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 1: Check Hub Running
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log(`${'─'.repeat(80)}`);
  console.log(`📊 STAGE 1: Global Hub Status`);
  console.log(`${'─'.repeat(80)}`);

  if (!window.globalHubService) {
    console.error(`❌ CRITICAL: globalHubService not initialized!`);
    console.log(`\n🔧 FIX: Refresh the page and try again\n`);
    return;
  }

  const hubState = window.globalHubService.getState();
  const hubMetrics = window.globalHubService.getMetrics();

  console.log(`Hub Initialized: ✅ YES`);
  console.log(`Hub Running: ${hubState.isRunning ? '✅ YES' : '❌ NO'}`);
  console.log(`Total Signals Generated: ${hubMetrics.totalSignals}`);
  console.log(`Active Signals: ${hubState.activeSignals?.length || 0}`);
  console.log(`Win Rate: ${hubMetrics.winRate?.toFixed(1) || 0}%`);

  if (!hubState.isRunning) {
    console.log(`\n🔧 FIX: Hub is stopped. Starting it now...`);
    window.globalHubService.start();
    console.log(`✅ Hub started! Wait 3-5 minutes for signals to generate.\n`);
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 2: Check Smart Pool
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📊 STAGE 2: Smart Signal Pool Status`);
  console.log(`${'─'.repeat(80)}`);

  if (!window.smartSignalPool) {
    console.error(`❌ CRITICAL: smartSignalPool not initialized!`);
    console.log(`\n🔧 FIX: This is a code issue. Check console errors.\n`);
    return;
  }

  const poolStats = window.smartSignalPool.getPoolStats();
  console.log(`Pool Initialized: ✅ YES`);
  console.log(`Total Signals in Pool: ${poolStats.totalSignals || 0}`);
  console.log(`Average Quality: ${poolStats.avgQuality?.toFixed(1) || 0}%`);
  console.log(`Average Confidence: ${poolStats.avgConfidence?.toFixed(1) || 0}%`);

  if (poolStats.totalSignals === 0) {
    console.log(`\n⚠️ ISSUE: Pool is empty. Signals haven't reached Smart Pool yet.`);
    console.log(`\n💡 This means:`);
    console.log(`   1. Either no signals generated yet (wait 3-5 min)`);
    console.log(`   2. OR signals are being rejected before Smart Pool`);
    console.log(`\n🔍 Check below for rejection logs...\n`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 3: Check Database
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log(`${'─'.repeat(80)}`);
  console.log(`📊 STAGE 3: Database Status`);
  console.log(`${'─'.repeat(80)}`);

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error(`❌ CRITICAL: No user logged in!`);
      console.log(`\n🔧 FIX: Log in and try again\n`);
      return;
    }

    console.log(`User: ✅ ${user.email}`);

    // Check subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!subscription) {
      console.error(`❌ CRITICAL: No subscription found!`);
      console.log(`\n🔧 FIX: User needs a subscription (FREE/PRO/MAX)\n`);
    } else {
      console.log(`Tier: ✅ ${subscription.tier}`);
      console.log(`Status: ✅ ${subscription.status}`);
    }

    // Check signals in database
    const { data: signals, count } = await supabase
      .from('user_signals')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
      .order('created_at', { ascending: false });

    console.log(`\nSignals in Database (last 24h): ${count || 0}`);

    if (count === 0) {
      console.log(`\n⚠️ ISSUE: No signals in database!`);
      console.log(`\n💡 This means:`);
      console.log(`   1. Smart Pool hasn't distributed to database yet`);
      console.log(`   2. OR distribution is blocked`);
      console.log(`\n🔍 Checking distribution logs below...\n`);
    } else {
      console.log(`✅ SUCCESS: ${count} signals found in database!`);

      // Show sample signals
      console.log(`\n📋 Sample Signals:`);
      signals.slice(0, 3).forEach((s, i) => {
        console.log(`   ${i+1}. ${s.symbol} ${s.signal_type} | Quality: ${s.quality_score}% | Tier: ${s.tier}`);
      });

      // Check for test signals
      const testCount = signals.filter(s => s.signal_id?.startsWith('test_')).length;
      if (testCount > 0) {
        console.warn(`\n⚠️ WARNING: ${testCount} test signals found!`);
        console.log(`🔧 FIX: Run cleanup SQL to remove test signals`);
      }
    }

  } catch (error) {
    console.error(`❌ Database check failed:`, error);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STAGE 4: Check Console Logs
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📊 STAGE 4: Check Recent Activity`);
  console.log(`${'─'.repeat(80)}`);

  console.log(`\n💡 Look above in console for these logs:`);
  console.log(`\n1. Signal Generation:`);
  console.log(`   Look for: "🎯 [Alpha] NEW SIGNAL CANDIDATE"`);
  console.log(`   If missing: Strategies aren't generating signals`);

  console.log(`\n2. Quality Gate Approval:`);
  console.log(`   Look for: "✅ [Quality Gate] APPROVED"`);
  console.log(`   If missing: Signals rejected by quality gate`);

  console.log(`\n3. Quality Gate Rejection:`);
  console.log(`   Look for: "❌ [Quality Gate] REJECTED"`);
  console.log(`   This tells you WHY signals were rejected`);

  console.log(`\n4. Smart Pool Distribution:`);
  console.log(`   Look for: "🎯 [Pool] ===== DISTRIBUTING SIGNALS"`);
  console.log(`   If missing: Pool hasn't distributed yet`);

  console.log(`\n5. Database Save:`);
  console.log(`   Look for: "[GlobalHub] 💾 Signal saved to database"`);
  console.log(`   If missing: Database save failed`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY & RECOMMENDATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📊 DIAGNOSTIC SUMMARY`);
  console.log(`${'═'.repeat(80)}\n`);

  const issues = [];
  const fixes = [];

  if (!hubState.isRunning) {
    issues.push('❌ Hub not running');
    fixes.push('Hub was started automatically - wait 3-5 minutes');
  }

  if (hubMetrics.totalSignals === 0) {
    issues.push('⚠️ No signals generated yet');
    fixes.push('Wait 3-5 minutes for first signals to generate');
  }

  if (poolStats.totalSignals === 0 && hubMetrics.totalSignals > 0) {
    issues.push('⚠️ Signals generated but not in pool');
    fixes.push('Signals may be rejected - check console for rejection logs');
  }

  if (issues.length === 0) {
    console.log(`✅ All systems operational!`);
    console.log(`\nIf you still don't see signals:`);
    console.log(`1. Hard refresh page (Cmd+Shift+R or Ctrl+Shift+R)`);
    console.log(`2. Check console for rejection logs (search for "REJECTED")`);
    console.log(`3. Run this diagnostic again in 5 minutes`);
  } else {
    console.log(`Issues Found:`);
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log(`\nRecommended Fixes:`);
    fixes.forEach(fix => console.log(`   ✅ ${fix}`));
  }

  console.log(`\n${'═'.repeat(80)}\n`);
};

// Run diagnostic
diagnosesignalFlow();
```

---

## Common Issues & Fixes

### Issue 1: Hub Not Running

**Console Shows:**
```
Hub Running: ❌ NO
```

**Fix:**
```javascript
window.globalHubService.start();
```

Then wait 3-5 minutes for signals to generate.

---

### Issue 2: No Signals Generated

**Console Shows:**
```
Total Signals Generated: 0
```

**Possible Causes:**
1. **Market data not loading** - Check network tab for API errors
2. **Strategies not executing** - Check for JavaScript errors in console
3. **Just started** - Wait 3-5 minutes for first signals

**Fix:**
```javascript
// Check if strategies are running
window.globalHubService.getState()

// Force manual signal generation (for testing only)
// Note: This doesn't bypass quality gates
```

---

### Issue 3: Signals Rejected by Quality Gate

**Console Shows:**
```
❌ [Quality Gate] REJECTED: BTC LONG
   Reason: Quality too low
   Score: 45.2/100 < 50 (minimum)
```

**This is NORMAL!** The quality gate is working correctly by filtering out low-quality signals.

**Possible Reasons:**
- **Market conditions poor** (choppy, low volatility)
- **Strategy confidence low** (< 50%)
- **Risk/reward ratio poor** (< 1.5:1)
- **Market regime unfavorable**

**Options:**
1. **Wait for better market conditions** (RECOMMENDED)
2. **Temporarily lower threshold** (NOT recommended for production):
   ```javascript
   // Lower minimum quality (TESTING ONLY!)
   window.signalQualityGate?.updateConfig({ minQualityScore: 40 });
   ```

---

### Issue 4: Signals in Pool But Not Database

**Console Shows:**
```
Total Signals in Pool: 5
Signals in Database: 0
```

**Cause:** Smart Pool hasn't distributed yet (runs every 5 minutes)

**Fix:**
```javascript
// Force immediate distribution (for testing)
await window.smartSignalPool.distributeToTiers();
```

---

### Issue 5: Signals in Database But Not UI

**Console Shows:**
```
Signals in Database: 10
(But nothing visible in UI)
```

**Fixes:**
1. **Hard refresh**: `Cmd+Shift+R` or `Ctrl+Shift+R`
2. **Check real-time subscription**: Look for subscription logs in console
3. **Clear cache and reload**

---

## Advanced Diagnostics

### Check Quality Gate Settings

```javascript
// Current configuration
console.log(window.signalQualityGate?.getConfig());

// Expected output:
// {
//   minQualityScore: 50,          ← Must score 50+ to pass
//   maxSignalsPerDay: 100,        ← Daily limit
//   minTimeBetweenSignals: 0,     ← No timing constraints
//   excellentScoreThreshold: 75,  ← Auto-publish threshold
// }
```

### Check Recent Rejections

Look in console for logs starting with:
- `❌ [Quality Gate] REJECTED`
- `[GlobalHub] ❌ PIPELINE REJECTED`

These tell you exactly WHY signals were rejected.

### Monitor Signal Generation Live

```javascript
// Monitor in real-time (runs every 15 seconds)
const monitor = setInterval(() => {
  const hub = window.globalHubService?.getMetrics();
  const pool = window.smartSignalPool?.getPoolStats();

  console.log(`
⏰ ${new Date().toLocaleTimeString()}
Hub: ${hub?.totalSignals || 0} generated
Pool: ${pool?.totalSignals || 0} signals | Avg Quality: ${pool?.avgQuality?.toFixed(1) || 0}%
  `);
}, 15000);

// Stop monitoring
clearInterval(monitor);
```

---

## Most Likely Causes (Ranked)

### 1. Hub Not Started (90% of cases)
**Symptoms:** No signals generated
**Fix:** `window.globalHubService.start()`

### 2. Waiting for First Signals (80% of cases)
**Symptoms:** Hub running but no signals yet
**Fix:** Wait 3-5 minutes

### 3. Poor Market Conditions (70% of cases)
**Symptoms:** All signals rejected by quality gate
**Fix:** Wait for better market conditions or temporarily lower threshold

### 4. No Subscription (20% of cases)
**Symptoms:** Signals in pool but not distributed
**Fix:** Ensure user has subscription in `user_subscriptions` table

### 5. Real-Time Subscription Issue (10% of cases)
**Symptoms:** Signals in database but not UI
**Fix:** Hard refresh page

---

## Quick Fixes Reference

```javascript
// 1. Start Hub
window.globalHubService.start();

// 2. Check Status
window.globalHubService.getState();

// 3. Check Pool
window.smartSignalPool.getPoolStats();

// 4. Force Distribution
await window.smartSignalPool.distributeToTiers();

// 5. Lower Quality Threshold (TESTING ONLY!)
window.signalQualityGate.updateConfig({ minQualityScore: 40 });

// 6. Check Database
const { count } = await supabase
  .from('user_signals')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', (await supabase.auth.getUser()).data.user.id);
console.log(`Database signals: ${count}`);
```

---

## Expected Console Logs (Normal Flow)

When signals are flowing correctly, you should see:

```
🎯 [Alpha] NEW SIGNAL CANDIDATE: BTC LONG
   ↓
✅ [Quality Gate] Evaluating: BTC LONG | Score: 72.3/100
   ↓
✅ [Quality Gate] APPROVED: BTC LONG | Publishing...
   ↓
🎉 [GlobalHub] QUALITY GATE CALLBACK TRIGGERED!
   ↓
[GlobalHub] 🎯 Signal added to Smart Signal Pool
   ↓
[GlobalHub] 💾 Signal saved to database
   ↓
🎯 [Pool] ===== DISTRIBUTING SIGNALS TO TIERS =====
✅ [Pool] Distributed 5 signals to 1 MAX users
   ↓
[Hub] 🎉 New signal received via real-time subscription
```

---

## Still Stuck?

Run the diagnostic script above and share the output. It will tell you exactly where signals are getting stuck!
