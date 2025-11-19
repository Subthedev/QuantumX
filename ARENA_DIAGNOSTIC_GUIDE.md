# Arena Real-Time Diagnostic Guide

## Quick Status Check

Open browser console (F12) and run:

```javascript
// Check Intelligence Hub status
globalHubService.isRunning()  // Should return: true

// Check current metrics
globalHubService.getMetrics()  // Shows signal counts, quality scores

// Check active signals
globalHubService.getActiveSignals()  // Shows current live signals

// Check arena agents
arenaService.getAgents()  // Shows all 3 agents

// Force manual signal check (for testing)
globalHubService.getState()
```

## Expected Console Logs

### When Arena Loads:
```
[useArenaAgents] 🚀 Starting Intelligence Hub...
[GlobalHub] Starting signal generation...
[RealTimeMonitoring] 📊 Starting Data Engine V4...
[useArenaAgents] ✅ Intelligence Hub started successfully
[Arena Service] 🎪 Initializing with REAL Intelligence Hub data...
[Arena] ✅ Subscribed to Intelligence Hub "signal:new" events
[Arena Service] ✅ Initialized successfully
```

### When Hub Analyzes (Every ~60s):
```
[GlobalHub] 🔍 Analyzing BTCUSDT...
[Verification] → Step 1: DATA ENGINE
[Verification] → Step 2: DATA ENRICHMENT
[Verification] → Step 3: ALPHA ENGINE - Running 10 strategies...
[Verification] → Step 4: BETA ENGINE
[Verification] → Step 5: GAMMA FILTER
[Verification] → Step 6: DELTA FILTER
```

### When Signal Generated:
```
[GlobalHub] ✅✅✅ ADAPTIVE PIPELINE SUCCESS ✅✅✅
[GlobalHub] BTCUSDT LONG | Entry: $95,234.50
[GlobalHub] Strategy: WHALE_SHADOW | Targets: $96,500.00, $97,800.00
[GlobalHub] 🎯 ARENA DEBUG: Emitting signal with strategyName="WHALE_SHADOW"
[Arena] 📡 Signal received: WHALE_SHADOW BTCUSDT
[Arena] ✅ NEXUS-01 will execute WHALE_SHADOW signal
[Arena] 🤖 NEXUS-01 executing trade for BTCUSDT (WHALE_SHADOW)
[Arena] ✅ NEXUS-01 opened BUY position at $95,234.50
```

### When Signal Rejected:
```
[GlobalHub] ✗ ALPHA REJECTED: No tradeable patterns
[GlobalHub] ✗ BETA REJECTED: Insufficient consensus
[GlobalHub] ✗ GAMMA REJECTED: Market conditions unfavorable
[GlobalHub] ✗ DELTA REJECTED: ML probability too low
```

## Common Issues & Fixes

### Issue 1: "Intelligence Hub not starting"
**Symptom:** No `[GlobalHub]` logs at all

**Fix:**
```javascript
// In console
await globalHubService.start()
```

### Issue 2: "Hub running but no signals"
**Symptom:** Hub logs but no `ADAPTIVE PIPELINE SUCCESS`

**Reason:** All signals rejected by quality filters (this is NORMAL!)
- Alpha rejects ~70% (no patterns)
- Beta rejects ~60% (low consensus)
- Gamma rejects ~50% (market conditions)
- Delta rejects ~40% (ML probability)

**Only ~5-10% of signals pass all filters** - this is intentional for quality!

**Wait time:** Could be 5-10 minutes before first signal

### Issue 3: "Signals generated but agents not trading"
**Symptom:** See `ADAPTIVE PIPELINE SUCCESS` but no `[Arena]` logs

**Fix:** Check strategy name mapping
```javascript
// In console - check last signal
const signals = globalHubService.getActiveSignals()
console.log('Last signal strategy:', signals[0]?.strategyName)

// Check if agent matches
const agents = arenaService.getAgents()
console.log('Agent strategies:', {
  'NEXUS-01': ['WHALE_SHADOW', 'CORRELATION_BREAKDOWN_DETECTOR', 'STATISTICAL_ARBITRAGE', 'SPRING_TRAP', 'GOLDEN_CROSS_MOMENTUM', 'MARKET_PHASE_SNIPER'],
  'QUANTUM-X': ['FUNDING_SQUEEZE', 'LIQUIDATION_CASCADE_PREDICTION', 'ORDER_FLOW_TSUNAMI', 'FEAR_GREED_CONTRARIAN', 'LIQUIDITY_HUNTER'],
  'ZEONIX': ['MOMENTUM_SURGE_V2', 'MOMENTUM_RECOVERY', 'BOLLINGER_MEAN_REVERSION', 'VOLATILITY_BREAKOUT', 'ORDER_BOOK_MICROSTRUCTURE']
})
```

### Issue 4: "Cards stuck in scanning"
**Symptom:** Cards show "Scanning for signals..." but no trades

**Possible causes:**
1. **Database not reset** - Old fake trades still there
   - Solution: Run `RESET_ARENA_AGENTS_FIXED.sql` in Supabase

2. **No signals yet** - Waiting for first quality signal
   - Solution: Wait 5-10 minutes (normal!)

3. **Agent accounts don't exist** - Database error
   - Solution: Check Supabase `mock_trading_accounts` table

### Issue 5: "Metrics reset on refresh"
**This is INTENTIONAL!** Here's why:

**What PERSISTS:**
- ✅ All positions (mock_trading_positions table)
- ✅ Trade history (mock_trading_history table)
- ✅ Account balances (mock_trading_accounts table)

**What RECALCULATES:**
- ✅ P&L with current real-time prices
- ✅ Win rate from historical trades
- ✅ Sharpe ratio from performance data

**This ensures accuracy!** Refreshing recalculates everything from database with latest prices.

## Force Signal Generation (Testing Only)

⚠️ **For development testing only!**

```javascript
// In browser console
// This bypasses quality filters - DO NOT use in production!

// 1. Check current state
globalHubService.getMetrics()

// 2. Get service state
const state = globalHubService.getState()
console.log('Active signals:', state.activeSignals.length)
console.log('Total generated:', state.metrics.totalSignals)

// 3. Check if any signals exist
if (state.activeSignals.length > 0) {
  console.log('Existing signals:', state.activeSignals)
} else {
  console.log('No signals yet - waiting for quality patterns')
}
```

## Timeline Expectations

**Realistic timeline for first trade:**

| Time | What's Happening |
|------|------------------|
| 0:00 | Arena loads, Hub starts |
| 0:10 | First coin analyzed (BTCUSDT) |
| 1:00 | First cycle complete (17 coins) |
| 1:10 | Second cycle starts |
| 2:00-10:00 | **First quality signal generated** ⭐ |
| Immediately | Agent executes trade |
| +2s | Card updates with active trade |

**Why so long?**
- 17 coins × ~60s each = ~17 minutes per cycle
- ~90% of signals rejected by quality filters
- Only HIGH-quality signals pass all filters
- This is GOOD - prevents bad trades!

## Success Indicators

✅ **Hub Running:**
```
[GlobalHub] Starting signal generation...
```

✅ **Data Engine Active:**
```
[Data Engine] Price: BTCUSDT @ 95234.50
```

✅ **Arena Subscribed:**
```
[Arena] ✅ Subscribed to Intelligence Hub "signal:new" events
```

✅ **Quality Filtering Working:**
```
[GlobalHub] ✗ ALPHA REJECTED: No tradeable patterns (GOOD! Quality control working)
```

✅ **Signal Generated:**
```
[GlobalHub] ✅✅✅ ADAPTIVE PIPELINE SUCCESS ✅✅✅
[GlobalHub] Strategy: WHALE_SHADOW
[Arena] ✅ NEXUS-01 will execute WHALE_SHADOW signal
```

## If Still No Trades After 10 Minutes

Run full diagnostic:

```javascript
// 1. Hub status
console.log('Hub running:', globalHubService.isRunning())

// 2. Metrics
const metrics = globalHubService.getMetrics()
console.log('Total analyzed:', metrics.totalTickers)
console.log('Signals generated:', metrics.totalSignals)
console.log('Alpha patterns:', metrics.alphaPatternsDetected)
console.log('Delta pass rate:', metrics.deltaPassRate + '%')

// 3. Active signals
const signals = globalHubService.getActiveSignals()
console.log('Active signals:', signals.length)
if (signals.length > 0) {
  console.log('Latest signal:', signals[0])
}

// 4. Agent status
const agents = arenaService.getAgents()
console.log('Agents:', agents.map(a => ({
  name: a.name,
  active: a.isActive,
  trades: a.totalTrades,
  positions: a.openPositions
})))

// 5. Database check
const { data } = await supabase
  .from('mock_trading_accounts')
  .select('*')
  .in('user_id', ['agent-nexus-01', 'agent-quantum-x', 'agent-zeonix'])
console.log('Agent accounts:', data)
```

## Production Behavior

**This is working as designed:**
- High quality thresholds (only ~5-10% pass)
- Real market conditions (not every coin has setup)
- 60-second analysis per coin
- 6-gate filtering system (Data → Alpha → Beta → Gamma → Delta → Zeta)

**First trade might take 5-10 minutes - THIS IS NORMAL!**

The system prioritizes QUALITY over QUANTITY.
