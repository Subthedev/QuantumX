# 🔍 SIGNAL FLOW DIAGNOSTIC - RUN THIS NOW

## Step 1: Open Browser Console

Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)

## Step 2: Run Diagnostic Script

Copy and paste the contents of `DIAGNOSTIC_SIGNAL_FLOW.js` into the console and press Enter.

Or directly run this command in console:

```javascript
// Quick diagnostic
console.log('Hub running:', window.globalHubService?.isRunning());
console.log('Active signals:', window.globalHubService?.getActiveSignals().length);
console.log('Quality Gate callback registered:', window.signalQualityGate?.onSignalPublished !== null);
console.log('Database polling active:', window.signalDatabaseService?.pollingInterval !== null);

// Check Quality Gate budget
const budget = window.signalQualityGate?.getBudgetStatus();
console.log('Budget status:', budget);
```

## Step 3: Watch Console for These Messages

While the Hub is running, look for:

### ✅ **GOOD SIGNS (signals flowing):**
```
🎉 [GlobalHub] QUALITY GATE CALLBACK TRIGGERED!
🚨 QUALITY-APPROVED SIGNAL PUBLISHED - #X 🚨
💾 Signal saved to database
[Hub UI] 🔴 LIVE SIGNALS EVENT RECEIVED - X signals
```

### ❌ **BAD SIGNS (signals blocked):**
```
❌ [Quality Gate] REJECTED: <SYMBOL>
   Reason: Quality too low
   
⛔ [Quality Gate] REJECTED <SYMBOL> - Daily budget exhausted

⏰ Timing constraint: <SYMBOL> too soon
```

## Step 4: Check for Specific Errors

### Error 1: No Quality Gate Callback
```
❌ [Quality Gate] CRITICAL ERROR: NO CALLBACK REGISTERED!
```
**FIX:** Restart Hub in Control Center

### Error 2: Budget Exhausted
```
⛔ REJECTED - Daily budget exhausted (100/100)
```
**FIX:** Run in console:
```javascript
window.signalQualityGate?.clearState();
window.location.reload();
```

### Error 3: Timing Constraints
```
⏰ Timing constraint: too soon
```
**FIX:** Already disabled in code, shouldn't happen

## Step 5: Force Clear Everything (Nuclear Option)

If nothing works, run this in console:

```javascript
// 1. Clear all Quality Gate state
window.signalQualityGate?.clearState();

// 2. Clear localStorage
localStorage.clear();

// 3. Hard refresh
window.location.reload();
```

Then restart the Hub.

## Step 6: Monitor Live Signal Generation

Watch console for this exact sequence:

```
1. ✅ [Delta] Passed: <SYMBOL> (score: 53.2)
2. 🎯 [Quality Gate] Evaluating <SYMBOL> | Score: 53.X
3. ✅ [Quality Gate] APPROVED: <SYMBOL> (Score: 53.X/100)
4. 🎉 [GlobalHub] QUALITY GATE CALLBACK TRIGGERED!
5. 💾 Signal saved to database
6. [SignalDB] 🔍 Found X potential new signals from database
7. [Hub UI] 🆕 DATABASE: Received X new signals
```

If ANY step is missing, that's where the break is.

---

## 📊 Expected Behavior

**Normal operation:**
- Delta V2 releases 1-2 signals every 5-10 minutes
- Quality Gate approves ~60-70% of them (score ≥ 50)
- Live Signals tab shows 2-5 active signals at any time
- Signals move to History after expiry (4-12 hours)

**If you see:**
- ✅ Delta passing signals (Score: 50-85) → **System is working**
- ❌ No signals in Live tab → **Quality Gate or UI issue**
- ❌ Signals appear then disappear → **Timeout/expiry issue**

---

## 🔧 Quick Fixes

| Issue | Fix |
|-------|-----|
| Hub not running | Control Center → Stop → Wait 3s → Start |
| No callback | Restart Hub |
| Budget exhausted | `signalQualityGate.clearState()` + reload |
| Old code cached | Hard refresh: Ctrl+Shift+R or Cmd+Shift+R |
| Database not polling | Reload page |

---

## 💡 Debugging Commands

```javascript
// Check signal state
window.debugSignals();

// Get current metrics
window.globalHubService?.getMetrics();

// Get Quality Gate status
window.signalQualityGate?.getBudgetStatus();

// Get active signals
window.globalHubService?.getActiveSignals();

// Check database polling
window.signalDatabaseService?.pollingInterval !== null;
```

---

**After running diagnostic, report back with:**
1. What messages you see in console
2. Any error messages in red
3. Quality Gate budget status
4. Number of active signals in memory vs database
