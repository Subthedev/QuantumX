# 🔍 Signal Diagnostic Mode - Find Out Why Signals Are Being Blocked

## What Changed

I've enabled **DIAGNOSTIC MODE** with detailed logging to show you exactly why real signals are being rejected by Delta and Gamma filters.

### Files Modified:
1. [src/services/deltaV2QualityEngine.ts](src/services/deltaV2QualityEngine.ts) - Removed bypass, added detailed logging
2. [src/services/igx/IGXGammaV2.ts](src/services/igx/IGXGammaV2.ts) - Removed bypass, added detailed logging

## Current Filter Thresholds

### Delta V2 Quality Engine:
- **Quality Threshold:** 30 (was 52 in production)
- **ML Threshold:** 30% (was 50% in production)
- **Strategy Win Rate:** 0% (accepts all strategies)

### Gamma V2 Filter:
Accepts signals based on quality tier and confidence:
- **PREMIUM** tier: Always passes (HIGH priority)
- **HIGH** tier + 70%+ confidence: Passes (HIGH priority)
- **HIGH** tier + 60-69% confidence: Passes (MEDIUM priority)
- **MEDIUM** tier + 75%+ confidence: Passes (MEDIUM priority)
- Everything else: REJECTED

## How to Use Diagnostic Mode

### Step 1: Clear Browser Console
Open browser console (F12) and click "Clear console" to start fresh.

### Step 2: Start the Hub
Go to IGX Control Center → Hub tab → Click "Start Hub"

### Step 3: Watch the Console Logs

You'll now see detailed evaluation for EVERY signal:

#### Example: Delta V2 Evaluation
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Delta V2] 📊 EVALUATING: BTCUSDT LONG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Quality Score: 45.3 (threshold: 30)
🤖 ML Probability: 55.2% (threshold: 30.0%)
🎯 Strategy Win Rate: 0.0% (threshold: 0%)
🌍 Market Regime: SIDEWAYS
✅ PASS: All filters passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Example: Delta V2 Rejection
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Delta V2] 📊 EVALUATING: ETHUSDT SHORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Quality Score: 22.1 (threshold: 30)
🤖 ML Probability: 48.7% (threshold: 30.0%)
🎯 Strategy Win Rate: 0.0% (threshold: 0%)
🌍 Market Regime: HIGH_VOLATILITY
❌ REJECT: Quality score too low: 22.1 < 30 (HIGH_VOLATILITY market)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Example: Gamma V2 Evaluation
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[IGX Gamma V2] 📊 EVALUATING: SOLUSDT LONG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Quality Tier: HIGH
📈 Confidence: 72%
🌍 Market Regime: SIDEWAYS
📊 Volatility: 3.24%
💧 Liquidity: 85%
✅ PASS: High quality signal with strong confidence (72%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Example: Gamma V2 Rejection
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[IGX Gamma V2] 📊 EVALUATING: ADAUSDT SHORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Quality Tier: MEDIUM
📈 Confidence: 58%
🌍 Market Regime: BULLISH_TREND
📊 Volatility: 2.15%
💧 Liquidity: 72%
❌ REJECT: Quality too low: MEDIUM tier with 58% confidence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Analyze the Patterns

Look through the console logs and find patterns:

**Common Rejection Reasons:**

1. **Low Quality Score**
   - Signal: `Quality score too low: 22.1 < 30`
   - Solution: Lower QUALITY_THRESHOLD to 20-25

2. **Low ML Probability**
   - Signal: `ML probability too low: 28.5% < 30.0%`
   - Solution: Lower ML_THRESHOLD to 0.20 (20%)

3. **Low Confidence in Gamma**
   - Signal: `Quality too low: MEDIUM tier with 58% confidence`
   - Solution: Accept MEDIUM tier with lower confidence (50%+)

4. **Strategy Underperforming**
   - Signal: `Strategy underperforming in SIDEWAYS: 12.5% win rate`
   - Solution: Keep STRATEGY_WINRATE_THRESHOLD at 0 (disabled)

## Adjusting Thresholds

### Option 1: Use Control Center UI
1. Go to IGX Control Center → Pipeline tab
2. Find "Delta V2 Quality Thresholds" section
3. Use sliders to adjust:
   - Quality Threshold (0-100)
   - ML Threshold (0-100%)
4. Click preset buttons:
   - **Strict:** Quality 60, ML 60%
   - **Balanced:** Quality 45, ML 45%
   - **Aggressive:** Quality 25, ML 25%

### Option 2: Modify Code Directly

Edit [src/services/deltaV2QualityEngine.ts](src/services/deltaV2QualityEngine.ts:474-476):

```typescript
private QUALITY_THRESHOLD = 25; // Lower from 30 to accept more signals
private ML_THRESHOLD = 0.20;    // Lower from 0.30 to accept more signals
private STRATEGY_WINRATE_THRESHOLD = 0; // Keep at 0
```

Edit [src/services/igx/IGXGammaV2.ts](src/services/igx/IGXGammaV2.ts:319-323):

```typescript
// Lower the confidence requirement for MEDIUM tier
} else if (consensus.qualityTier === 'MEDIUM' && consensus.confidence >= 50) {
  passed = true;
  priority = 'MEDIUM';
  reason = `Medium quality signal with acceptable confidence (${consensus.confidence}%)`;
```

## Finding the Right Balance

### Goal: Pass Good Signals, Reject Bad Signals

**Too Strict (Current Settings Might Be):**
- Very few signals pass
- High quality but low quantity
- Arena agents rarely trade

**Too Loose:**
- Too many low-quality signals pass
- High quantity but poor performance
- Arena agents trade frequently but lose money

**Balanced (Recommended Starting Point):**
- **Delta Quality:** 20-25 (lower if signals have good strategies)
- **Delta ML:** 20-25% (ML model is still learning)
- **Gamma:** Accept MEDIUM tier with 50%+ confidence

## Recommended Approach

### Phase 1: Find What's Being Generated (Current)
1. Run Hub for 5-10 minutes
2. Check console logs for all evaluations
3. Note the quality scores and ML probabilities of signals
4. Identify the average ranges

### Phase 2: Adjust to Reality
If you see signals with:
- Quality scores averaging 20-40
- ML probabilities averaging 30-50%
- Confidence scores averaging 50-70%

Then adjust thresholds to:
- Quality: 18-20 (slightly below average to accept decent signals)
- ML: 25% (slightly below average)
- Gamma: Accept MEDIUM tier with 50%+ confidence

### Phase 3: Monitor Performance
1. Let agents trade for an hour
2. Check win rate in Arena
3. If win rate > 50%: Keep current thresholds or make slightly stricter
4. If win rate < 40%: Make thresholds more strict
5. If win rate 40-50%: Perfect balance!

## Understanding the Metrics

### Quality Score (Delta V2)
- **0-25:** Very low quality, likely to fail
- **25-40:** Low quality, uncertain outcome
- **40-60:** Medium quality, decent chance
- **60-80:** High quality, good chance
- **80-100:** Excellent quality, very likely to succeed

### ML Probability (Delta V2)
- **0-30%:** Model thinks signal will likely fail
- **30-50%:** Model is uncertain
- **50-70%:** Model thinks signal will likely succeed
- **70-100%:** Model is very confident in success

### Quality Tier (Gamma V2)
- **PREMIUM:** Best of the best (rare)
- **HIGH:** Very good signal
- **MEDIUM:** Acceptable signal
- **LOW:** Poor signal (usually rejected)

### Confidence (Gamma V2)
- **0-50%:** Low confidence
- **50-70%:** Medium confidence
- **70-85%:** High confidence
- **85-100%:** Very high confidence

## Quick Fixes for Common Issues

### Issue: No signals passing
**Symptoms:** Console shows all rejections
**Fix:** Lower thresholds significantly (Quality: 15, ML: 15%)

### Issue: Low quality signals passing
**Symptoms:** Agents losing money consistently
**Fix:** Raise thresholds (Quality: 35-40, ML: 35-40%)

### Issue: Only test signals trading
**Symptoms:** Diagnostic shows no real signals being evaluated
**Fix:** Check if Hub is generating signals at all - may be a data issue

## Next Steps

1. **Run diagnostic mode for 5-10 minutes**
2. **Copy console logs showing rejections**
3. **Analyze the quality scores and why signals are rejected**
4. **Adjust thresholds based on what you see**
5. **Test with new thresholds**
6. **Monitor agent performance**

---

**Status:** 🔍 DIAGNOSTIC MODE ACTIVE

You should now be able to see exactly why each signal is passing or being rejected in the console logs!
