# 🔍 Signal Flow Debugging - URGENT

## Step 1: Open Browser Console

1. Open Intelligence Hub page
2. Press F12 (or Cmd+Option+I on Mac)
3. Go to Console tab
4. Clear console (trash icon)
5. Wait 30 seconds

## Step 2: Search for These Patterns

Copy each search term below and paste into console search box:

### Search 1: "Quality Gate Received"
**Expected:** `[TRACKING] Quality Gate Received: X total`
**What it means:** Signals entering the quality gate

### Search 2: "PUBLISHING SIGNAL TO UI"
**Expected:** `🚀🚀🚀 PUBLISHING SIGNAL TO UI 🚀🚀🚀`
**What it means:** About to call publishApprovedSignal()

### Search 3: "ENTERED publishApprovedSignal"
**Expected:** `🎯 ENTERED publishApprovedSignal() - SIGNAL WILL BE PUBLISHED NOW`
**What it means:** Actually inside the publish function

### Search 4: "Signal added to activeSignals"
**Expected:** `✅ Signal added to activeSignals array`
**What it means:** Signal added to memory

### Search 5: "Events emitted"
**Expected:** `📡 Events emitted to UI`
**What it means:** UI should update

### Search 6: Any ERROR messages
**Expected:** None
**What it means:** Something crashed

## Step 3: Report Back

**Tell me EXACTLY what you see for each search:**
- Search 1 result:
- Search 2 result:
- Search 3 result:
- Search 4 result:
- Search 5 result:
- Search 6 result (errors):

## Step 4: Also Check

### Hub Running?
Look for: `[GlobalHub] ✅ All systems operational - Hub is LIVE!`
- [ ] YES, I see this
- [ ] NO, I don't see this

### Delta Passing Signals?
Look for: `✅ Delta Decision: PASSED`
- [ ] YES, I see this
- [ ] NO, I don't see this

### Control Hub Metrics
1. Open IGX Control Center
2. Scroll to "Quality Gate & Regime Matching"
3. Tell me the numbers you see:
   - Signals Received: ___
   - Approved: ___
   - Pass Rate: ___%

## Common Issues & Quick Fixes

### Issue 1: Hub Not Running
**Symptom:** No logs at all
**Fix:** Refresh page, hub should auto-start

### Issue 2: Delta Rejecting All Signals
**Symptom:** See "Delta Decision: REJECTED"
**Fix:** Delta thresholds too high

### Issue 3: publishApprovedSignal() Not Called
**Symptom:** See "PUBLISHING SIGNAL TO UI" but no "ENTERED publishApprovedSignal"
**Fix:** Code path blocked before function call

### Issue 4: Events Not Emitting
**Symptom:** See "ENTERED publishApprovedSignal" but no "Events emitted"
**Fix:** Error inside publishApprovedSignal()

---

**PASTE YOUR CONSOLE LOGS BELOW:**
```
[Paste full console output here - last 50 lines]
```
