# IGX Pipeline Troubleshooting Guide

## Date: January 6, 2025
## Purpose: Debug Pipeline Flow from Beta → Zeta

---

## IMPORTANT: Where to See Pipeline Logs

**⚠️ Pipeline logs appear in the BROWSER CONSOLE, not the terminal!**

### How to Open Browser Console:

1. **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. **Firefox**: Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
3. **Safari**: Press `Cmd+Option+C` (Mac) - Enable "Show Develop menu" in Safari Preferences first

### Navigate to Console Tab:
- Click the "Console" tab at the top of the developer tools
- You should see logs like `[GlobalHub]`, `[IGX Beta V5]`, `[IGX Gamma V2]`, etc.

---

## Pipeline Flow Checkpoints

The complete pipeline has **10 checkpoints**. Check each one in the browser console:

###  Checkpoint 1: Service Started
```
[GlobalHub] 🚀 Starting background service...
[GlobalHub] ✅ Beta V5 and Gamma V2 engines started
[GlobalHub] ✅ Real-time metric updates started (200ms interval)
[GlobalHub] ✅ Signal generation loop started (5s interval)
[GlobalHub] ✅ All systems operational - Hub is LIVE! 🎯
```

**If NOT seeing this:**
- Open Intelligence Hub page in browser
- Check UI component is mounted
- Service should auto-start after 1 second

---

### ✅ Checkpoint 2: Fetching Ticker Data
```
[GlobalHub] ========== Analyzing BTC (1/12) ==========
[Verification] Pipeline checkpoint: START - BTC analysis
[Verification] → Step 1: Fetching REAL ticker from CoinGecko API...
[GlobalHub] ✅ Got real ticker: BTC @ $43250.00 | Vol: 25000000000 (250ms)
```

**If NOT seeing this:**
- Check internet connection
- CoinGecko API might be rate-limited
- Try refreshing page after 1 minute

---

### ✅ Checkpoint 3: Alpha Engine (Pattern Detection)
```
[Verification] → Step 3: ALPHA ENGINE - Running 10 real strategies...
[Verification] ✓ ALPHA ENGINE: Pattern analysis complete
[Verification]   - Strategies Run: 10/10
[Verification]   - Patterns Detected: 5
[Verification]   - Signals Generated: 7
```

**If no signals generated:**
- This is normal - not every coin has tradeable patterns
- Alpha rejects ~70% of coins (quality control)
- Wait for next coin in rotation (5 seconds)

---

### ✅ Checkpoint 4: Beta Engine (ML Consensus)
```
[Verification] → Step 5: BETA ENGINE - ML-weighted consensus from 7 Alpha signals...
[IGX Beta V5] Quality Tier: MEDIUM (Confidence: 68%, Agreement: 72%, Votes: 4)
[Verification] ✓ BETA ENGINE: ML consensus reached
[Verification]   - Consensus Confidence: 68.0%
[Verification]   - Direction: LONG
[Verification]   - Primary Strategy: MOMENTUM_SURGE
```

**If Beta rejects:**
```
[Verification] ✗ BETA REJECTED: Insufficient strategy consensus for BTC
```
- This is normal - Beta requires minimum agreement
- Beta rejects ~50% of Alpha signals (quality control)
- Wait for next signal

---

### ✅ Checkpoint 5: Market Events Emitted
```
[Verification] → Step 6a: Emitting market condition events for Gamma...
[GlobalHub] 📊 Alpha: BULLISH_TREND | Trend: STRONG | Confidence: 75% | Vol: 1.85%
[GlobalHub] 📈 Data: Vol 1.85% | Liq 95 | Quality 95 | Spread 0.100%
[Verification] ✓ Market events emitted: Alpha regime + Data metrics
```

**If NOT seeing this:**
- **CRITICAL BUG** - Events not being emitted
- Check our recent fix was applied
- Beta will emit but Gamma won't receive market data

---

### ✅ Checkpoint 6: Gamma Receives Events
```
[IGX Gamma V2] 📊 Alpha Update: BULLISH_TREND (Confidence: 75%, Trend: STRONG)
[IGX Gamma V2] 📈 Data Engine Update: Volatility 1.85%, Liquidity 95
```

**If NOT seeing this:**
- Gamma is not receiving events
- Check Gamma is started: `[IGX Gamma V2] ✅ Started`
- Check browser console for event listener errors

---

### ✅ Checkpoint 7: Gamma Filtering
```
[IGX Gamma V2] 🎯 Matching: BTC LONG (Quality Tier: MEDIUM, Confidence: 68%)
[IGX Gamma V2] ✅ PASSED: MEDIUM priority - MEDIUM quality + Low vol + Strong trend → MEDIUM priority
[IGX Gamma V2] 🚀 Emitting: BTC LONG with MEDIUM priority
```

**If Gamma rejects:**
```
[IGX Gamma V2] ❌ REJECTED: MEDIUM quality: Uncertain regime (50% confidence) requires HIGH quality
```
- Check market conditions emitted (Checkpoint 5)
- If confidence < 60% and quality < HIGH: REJECTED (working as designed)
- Most rejections are in uncertain/volatile markets (adaptive filtering)

---

### ✅ Checkpoint 8: Signal Queue
```
[SignalQueue] 📋 MEDIUM priority enqueued: BTC (Queue: 1)
[SignalQueue] 📋 Dequeued MEDIUM: BTC
[SignalQueue] ⏱️ Wait time: 25ms
```

**If NOT seeing this:**
- Signal Queue not receiving Gamma events
- Check: `[SignalQueue] ✅ Registered automatic processing callback`
- Check SignalQueue singleton instantiation

---

### ✅ Checkpoint 9: Delta V2 (ML Filter)
```
[GlobalHub] 📊 Processing MEDIUM priority signal: BTC LONG
[GlobalHub] Market: BULLISH_TREND (75%)
[GlobalHub] Volatility: 1.85%
[GlobalHub] → Passing to Delta V2 quality filter...
[GlobalHub] Delta V2: PASSED ✅ | Quality: 78.5 | ML: 72.3%
```

**If Delta rejects:**
```
[GlobalHub] Delta V2: REJECTED ❌ | Quality: 45.2 | ML: 38.1%
[GlobalHub] ❌ PIPELINE REJECTED
[GlobalHub] BTC LONG | Low ML probability (< 50%)
```
- Delta rejects ~30% of signals (final quality filter)
- This is the last quality gate before user
- Rejections are working as designed

---

### ✅ Checkpoint 10: UI Events & Zeta
```
[GlobalHub] → Fetching current price for trading levels...
[GlobalHub] Current price: $43250.00

[GlobalHub] 🔔 UI Events Emitted:
[GlobalHub]   - signal:new → New signal to UI
[GlobalHub]   - signal:live → 3 active signals
[GlobalHub]   - state:update → Full state refresh

[GlobalHub] ✅✅✅ ADAPTIVE PIPELINE SUCCESS ✅✅✅
[GlobalHub] BTC LONG | Entry: $43,250.00 | Stop: $42,450.00
[GlobalHub] Grade: B | Priority: MEDIUM | Quality: 78.5
[GlobalHub] Targets: $44,050.00, $44,850.00, $45,650.00
[GlobalHub] DATA → ALPHA → BETA (MEDIUM) → GAMMA (MEDIUM) → QUEUE → DELTA → USER → ZETA
```

**If NOT seeing UI events:**
- Check price fetch succeeded
- Check signal was added to `activeSignals`
- Check UI is listening to events

---

## Common Issues & Solutions

### Issue 1: No Logs in Console
**Symptom**: Browser console is empty

**Solution**:
1. Make sure you opened the Console tab (not Elements/Network)
2. Refresh the page (F5)
3. Navigate to Intelligence Hub page
4. Wait 5-10 seconds for service to start
5. Check console filter is not hiding logs

---

### Issue 2: Service Not Starting
**Symptom**: Don't see "🚀 Starting background service..."

**Solution**:
1. Check for JavaScript errors in console (red text)
2. Clear browser cache: `Ctrl+Shift+Delete` → Clear cache
3. Hard refresh: `Ctrl+F5` (Windows) / `Cmd+Shift+R` (Mac)
4. Check localStorage is enabled
5. Try incognito/private browsing mode

---

### Issue 3: Beta Keeps Rejecting
**Symptom**: Always see "✗ BETA REJECTED: Insufficient strategy consensus"

**Solution**:
- **This is normal!** Beta rejects ~50% of signals
- Alpha generates 0-10 signals per coin
- Beta needs minimum agreement (3+ strategies agreeing)
- Wait for more coins to cycle through (12 coins every 60 seconds)

**Expected Behavior**:
- Out of 12 coins scanned:
  - ~3-4 coins: Alpha detects patterns
  - ~2 coins: Beta reaches consensus
  - ~1-2 coins: Gamma passes
  - ~1 coin: Delta approves → USER SEES SIGNAL

---

### Issue 4: Gamma Keeps Rejecting
**Symptom**: Always see "❌ REJECTED: Uncertain regime requires HIGH quality"

**Solution**:
1. Check Checkpoint 5: Are market events being emitted?
2. If NOT seeing market events: **Apply our fix from COMPLETE_PIPELINE_FIX.md**
3. If seeing market events but still rejecting:
   - Check market conditions: `Alpha Update: SIDEWAYS (Confidence: 50%)`
   - If confidence < 60% and quality < HIGH: REJECTED (by design)
   - **This is adaptive filtering working correctly!**

**When Gamma Passes Signals**:
- High volatility (>5%): Only HIGH quality passes
- Low volatility (<2%) + Strong trend: HIGH & MEDIUM pass
- Uncertain regime (<60% conf): Only HIGH quality passes
- Clear conditions: HIGH & MEDIUM & sometimes LOW pass

---

### Issue 5: No Signals Reaching UI
**Symptom**: Pipeline completes but UI shows no signals

**Solution**:
1. Check Checkpoint 10: Are UI events being emitted?
2. Check UI component is listening:
   ```javascript
   // In browser console
   window.globalHubService.getActiveSignals()
   window.globalHubService.getSignalHistory()
   ```
3. Check UI event listeners are registered:
   - Look for: `[Hub UI] Connected to global service`
4. Check state is updating:
   ```javascript
   // In browser console
   JSON.parse(localStorage.getItem('hub-signals'))
   ```

---

### Issue 6: Pipeline Seems Stuck
**Symptom**: Logs stop at a certain checkpoint

**Check by Checkpoint**:

**Stuck at Checkpoint 2** (Fetching ticker):
- CoinGecko API rate limit (wait 1 minute)
- Internet connection issue
- Symbol not found (normal for some symbols)

**Stuck at Checkpoint 3** (Alpha):
- No patterns detected (normal ~70% of time)
- Alpha strategies timing out (check errors in console)

**Stuck at Checkpoint 4** (Beta):
- No consensus reached (normal ~50% of time)
- Not enough strategy agreement

**Stuck at Checkpoint 7** (Gamma):
- **Missing market events** (apply COMPLETE_PIPELINE_FIX.md)
- Market conditions don't match quality tier (adaptive filtering working)

**Stuck at Checkpoint 9** (Delta):
- Low ML probability (< 50%)
- Poor risk-reward ratio
- Delta rejecting (final quality gate)

---

## Performance Expectations

### Expected Throughput:
- **12 coins scanned** every 60 seconds (5s per coin)
- **~30-40% of coins**: Alpha detects patterns
- **~50% of patterns**: Beta reaches consensus
- **~60-70% of consensus**: Gamma passes (adaptive to market)
- **~70% of Gamma**: Delta approves
- **Result**: ~1-3 signals every 5-10 minutes

### If seeing more/less signals:
**Too few signals (<1 per 10 min)**:
- Check Gamma is not stuck on default values
- Check market events being emitted
- Check logs for rejections at each stage

**Too many signals (>5 per minute)**:
- Check quality tiers: Should see mix of HIGH/MEDIUM/LOW
- Check Delta is filtering (should reject ~30%)
- Check logs show proper quality gates

---

## Debug Commands (Browser Console)

```javascript
// Check service status
globalHubService.isRunning()  // Should return true

// Get current metrics
globalHubService.getMetrics()

// Get active signals
globalHubService.getActiveSignals()

// Get signal history
globalHubService.getSignalHistory()

// Get Gamma stats
window.igxGammaV2.getStats()

// Get Beta stats
window.igxBetaV5.getStats()

// Check localStorage
JSON.parse(localStorage.getItem('hub-metrics'))
JSON.parse(localStorage.getItem('hub-signals'))

// Force start service
globalHubService.start()

// Check Gamma market conditions
// (Look for most recent Alpha Update and Data Engine Update in console)
```

---

## Still Stuck? Step-by-Step Debug

### Step 1: Verify Service Running
1. Open browser console (F12)
2. Navigate to Intelligence Hub page
3. Look for: `[GlobalHub] 🚀 Starting background service...`
4. If not seen: Refresh page (F5)

### Step 2: Wait for First Coin Analysis
1. Wait 5 seconds
2. Look for: `[GlobalHub] ========== Analyzing BTC ==========`
3. If not seen: Check Step 1

### Step 3: Check Alpha Signals
1. Look for: `[Verification] → Step 3: ALPHA ENGINE`
2. Check: `Signals Generated: X`
3. If 0 signals: **Normal**, wait for next coin

### Step 4: Check Beta Consensus
1. Look for: `[Verification] → Step 5: BETA ENGINE`
2. Check for either:
   - `✓ BETA ENGINE: ML consensus reached` ✅
   - `✗ BETA REJECTED` (normal)
3. If always rejected: **Normal**, wait for better signals

### Step 5: Check Market Events
1. Look for: `[Verification] → Step 6a: Emitting market condition events`
2. Should see:
   - `[GlobalHub] 📊 Alpha: ...`
   - `[GlobalHub] 📈 Data: ...`
3. If NOT seen: **BUG - Apply COMPLETE_PIPELINE_FIX.md**

### Step 6: Check Gamma Receives Events
1. Look for: `[IGX Gamma V2] 📊 Alpha Update:`
2. Look for: `[IGX Gamma V2] 📈 Data Engine Update:`
3. If NOT seen: Gamma not receiving events (check Gamma started)

### Step 7: Check Gamma Decision
1. Look for: `[IGX Gamma V2] 🎯 Matching: BTC LONG`
2. Check for either:
   - `✅ PASSED` (signal continues)
   - `❌ REJECTED` (adaptive filtering, normal in some conditions)

### Step 8: Check Signal Queue
1. Look for: `[SignalQueue] 📋 MEDIUM priority enqueued:`
2. Look for: `[SignalQueue] 📋 Dequeued MEDIUM:`
3. If NOT seen: Queue not receiving Gamma events

### Step 9: Check Delta Filter
1. Look for: `[GlobalHub] → Passing to Delta V2`
2. Check for: `[GlobalHub] Delta V2: PASSED ✅` or `REJECTED ❌`

### Step 10: Check UI Events
1. Look for: `[GlobalHub] 🔔 UI Events Emitted:`
2. Should see 3 events: signal:new, signal:live, state:update
3. If NOT seen: Check price fetch succeeded

---

## Success Indicators

You know the pipeline is working when you see:

✅ Service starts automatically
✅ Coins analyzed every 5 seconds
✅ Some coins generate Alpha signals (~30%)
✅ Some Alpha signals reach Beta consensus (~50%)
✅ Market events emitted for every Beta consensus
✅ Gamma receives events and makes decisions
✅ Some signals pass Gamma (varies by market conditions)
✅ Delta filters remaining signals (~70% pass)
✅ UI events emitted for approved signals
✅ Signals appear in Intelligence Hub UI
✅ ~1-3 signals every 5-10 minutes

---

## Contact & Support

If still experiencing issues after following this guide:

1. **Export console logs**:
   - Right-click in console → "Save as..."
   - Save to file

2. **Check recent fixes applied**:
   - COMPLETE_PIPELINE_FIX.md (event emissions)
   - UI_UPDATE_FIX_COMPLETE.md (UI updates)
   - PIPELINE_BUGS_FIXED.md (LOW quality + timeouts)

3. **Provide details**:
   - Which checkpoint is failing?
   - Console error messages (red text)
   - Browser type and version
   - Any recent code changes

---

*Generated: January 6, 2025*
*Author: Claude (Anthropic)*
*System: IGX Intelligence Hub - Troubleshooting Guide*
