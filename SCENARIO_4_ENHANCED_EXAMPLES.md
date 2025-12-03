# Scenario 4 Enhanced Oracle Challenge - Examples

**Status:** ✅ DEPLOYED AND TESTED
**Date:** January 2, 2025

---

## Enhanced Oracle Data Fields

### Complete API Response for Scenario 4

```json
{
  "oracle": {
    // Basic oracle info
    "currentSlot": 10,
    "totalPredictionsToday": 0,
    "topPredictor": {
      "username": "N/A",
      "accuracy": 0,
      "streak": 0
    },
    "nextQuestionIn": "1h 34m",

    // Price prediction data (Type B)
    "currentPrice": 92100,
    "priceTargetHigh": 93100,
    "priceTargetLow": 91100,
    "priceSidewaysRange": 500,
    "asset": "BTC",

    // Market regime data (Type C)
    "marketRegime": "RANGING",
    "trendStrength": "Weak",
    "volatility": 0.1,

    // Streak & multiplier info
    "maxActiveStreak": 0,
    "activeStreakHolders": 0,
    "currentMultiplier": "1x",

    // Agent adaptation status
    "adaptingAgents": [],

    // Question type recommendation
    "recommendedType": "market_regime"
  }
}
```

---

## Make.com Variable Mapping

When setting up Scenario 4 in Make.com, map these fields from the Supabase HTTP module:

| Prompt Variable | Make.com Path |
|----------------|---------------|
| `{{oracle.currentSlot}}` | `1. HTTP → oracle → currentSlot` |
| `{{oracle.nextQuestionIn}}` | `1. HTTP → oracle → nextQuestionIn` |
| `{{oracle.totalPredictionsToday}}` | `1. HTTP → oracle → totalPredictionsToday` |
| `{{oracle.currentPrice}}` | `1. HTTP → oracle → currentPrice` |
| `{{oracle.priceTargetHigh}}` | `1. HTTP → oracle → priceTargetHigh` |
| `{{oracle.priceTargetLow}}` | `1. HTTP → oracle → priceTargetLow` |
| `{{oracle.priceSidewaysRange}}` | `1. HTTP → oracle → priceSidewaysRange` |
| `{{oracle.asset}}` | `1. HTTP → oracle → asset` |
| `{{oracle.marketRegime}}` | `1. HTTP → oracle → marketRegime` |
| `{{oracle.trendStrength}}` | `1. HTTP → oracle → trendStrength` |
| `{{oracle.volatility}}` | `1. HTTP → oracle → volatility` |
| `{{oracle.maxActiveStreak}}` | `1. HTTP → oracle → maxActiveStreak` |
| `{{oracle.activeStreakHolders}}` | `1. HTTP → oracle → activeStreakHolders` |
| `{{oracle.currentMultiplier}}` | `1. HTTP → oracle → currentMultiplier` |
| `{{oracle.adaptingAgents}}` | `1. HTTP → oracle → adaptingAgents` |
| `{{oracle.recommendedType}}` | `1. HTTP → oracle → recommendedType` |

---

## Example Tweets by Type

### Type A: Agent Performance Challenge
**When:** `recommendedType = "agent_performance"` (volatility 1.0-2.0%)

```
Which QuantumX agent wins today?

⚡ AlphaX (aggressive)
🔷 BetaX (balanced)
🛡️ GammaX (conservative)

Slot 10/12 · Closes in 1h 34m
5-win streak active.

t.me/agentquantumx
```

**Data Used:**
- `currentSlot`: 10
- `nextQuestionIn`: "1h 34m"
- `maxActiveStreak`: 5 (fictional for example)

---

### Type B: Price Prediction Challenge
**When:** `recommendedType = "price_prediction"` (volatility > 2.0%)

```
BTC at $92,100.

In 1h 34m, will it be:
A) Above $93,100
B) Below $91,100
C) Sideways (±$500)

0 predictions today. You could be first.
Lock yours: t.me/agentquantumx
```

**Data Used:**
- `currentPrice`: 92100
- `priceTargetHigh`: 93100
- `priceTargetLow`: 91100
- `priceSidewaysRange`: 500
- `nextQuestionIn`: "1h 34m"
- `totalPredictionsToday`: 0

---

### Type C: Market Regime Challenge
**When:** `recommendedType = "market_regime"` (volatility < 1.0%)

```
Will the next 4 hours be TRENDING or RANGING?

Current: RANGING (Weak)
Volatility: 0.1%

Slot 10/12
Streak holders: 1x multiplier.

Predict: t.me/agentquantumx
```

**Data Used:**
- `marketRegime`: "RANGING"
- `trendStrength`: "Weak"
- `volatility`: 0.1
- `currentSlot`: 10
- `currentMultiplier`: "1x"

---

## Dynamic Content Based on Market Conditions

### High Volatility Scenario (volatility > 2.0%)
**Recommended Type:** `price_prediction`

```
BTC swinging hard: $95,240

In 2h, where will it land?
A) Above $96,240 (bullish continuation)
B) Below $94,240 (reversal)
C) Chop zone (±$500)

47 predictions. Volatile markets = big multipliers.
t.me/agentquantumx
```

**Why This Works:**
- High volatility = price predictions are more exciting
- Larger price swings = bigger stakes
- "Swinging hard" language matches market conditions

---

### Moderate Volatility (1.0-2.0%)
**Recommended Type:** `agent_performance`

```
AlphaX vs BetaX vs GammaX.

Which agent dominates this 2-hour session?

Moderate volatility (1.4%)
All strategies active.

Slot 7/12 · 87 predictions today
Make yours: t.me/agentquantumx
```

**Why This Works:**
- Moderate volatility = agent strategies matter more
- Competition angle = engagement
- Shows active participation (87 predictions)

---

### Low Volatility (< 1.0%)
**Recommended Type:** `market_regime`

```
Markets sideways. But will they stay that way?

Predict the next 4 hours:
TRENDING or RANGING?

Current: RANGING (Weak, 0.3% vol)

5-streak holders get 2x multipliers.
t.me/agentquantumx
```

**Why This Works:**
- Low volatility = regime predictions more relevant
- "Sideways" feels relatable during low-vol
- Multiplier incentive = urgency

---

## Active Streak Scenarios

### High Streak Activity (maxActiveStreak > 5)

```
Someone's on a 7-win streak in the Oracle.

Can you beat them?

BTC at $94,820.
In 1h 30m: Above $95,820 or Below $93,820?

23 predictions today.
t.me/agentquantumx
```

**Data Used:**
- `maxActiveStreak`: 7
- Social proof + competition trigger
- FOMO from existing streak

---

### Multiple Streak Holders (activeStreakHolders > 10)

```
14 traders with active win streaks.

Join the Oracle leaderboard:

Which agent wins the next session?
⚡ AlphaX / 🔷 BetaX / 🛡️ GammaX

Slot 9/12 · Closes 2h
t.me/agentquantumx
```

**Data Used:**
- `activeStreakHolders`: 14
- Herd mentality trigger
- Status/leaderboard appeal

---

## Agent Adaptation Scenarios

### Agents Adapting Strategies

```
AlphaX just switched to aggressive mode.

That usually means volatility incoming.

Predict: Will BTC swing >$1000 in 2 hours?

Current: $92,100 (RANGING)
t.me/agentquantumx
```

**Data Used:**
- `adaptingAgents`: ["AlphaX"]
- Creates narrative around agent behavior
- Insider knowledge feeling

---

## Time-Sensitive Variations

### Urgent (nextQuestionIn < 30 minutes)

```
FINAL CALL

BTC at $93,240.
Closes in 18 minutes.

Above $94,240 or Below $92,240?

Last chance for Slot 11/12.
t.me/agentquantumx
```

**Urgency Triggers:**
- "FINAL CALL" in caps
- Exact minutes (18m)
- "Last chance"

---

### Long Window (nextQuestionIn > 2 hours)

```
Plenty of time to analyze this one.

BTC currently: $91,820 (RANGING)

Will the next 4 hours be:
- TRENDING (breakout expected)
- RANGING (chop continues)

Closes in 3h 45m
Early bird bonus: +50% multiplier
t.me/agentquantumx
```

**No-Urgency Approach:**
- "Plenty of time" = relaxed tone
- Early bird bonus = incentive for quick action
- Analytical angle

---

## Make.com Router Logic

Add a **Router** module after the HTTP call to dynamically select tweet type:

### Route 1: High Volatility Price Prediction
```
Condition: {{oracle.recommendedType}} = "price_prediction"
   OR {{oracle.volatility}} > 2.0
```
→ Use Type B prompt variation

### Route 2: Moderate Volatility Agent Challenge
```
Condition: {{oracle.recommendedType}} = "agent_performance"
   OR ({{oracle.volatility}} >= 1.0 AND {{oracle.volatility}} <= 2.0)
```
→ Use Type A prompt variation

### Route 3: Low Volatility Market Regime
```
Condition: {{oracle.recommendedType}} = "market_regime"
   OR {{oracle.volatility}} < 1.0
```
→ Use Type C prompt variation

---

## Advanced: Conditional Elements in Claude Prompt

You can add conditional logic instructions to Claude:

```
📝 CONDITIONAL ELEMENTS (Claude will decide):

IF volatility > 2.0:
  - Lead with "High volatility" or "BTC swinging"
  - Use price prediction format
  - Emphasize larger moves

IF maxActiveStreak > 5:
  - Mention "{{maxActiveStreak}}-win streak active"
  - Add competitive angle: "Can you beat them?"

IF activeStreakHolders > 10:
  - Lead with social proof: "{{activeStreakHolders}} traders on streaks"

IF adaptingAgents.length > 0:
  - Mention "{{adaptingAgents[0]}} adapting strategies"
  - Create anticipation: "Something's brewing"

IF nextQuestionIn contains "m" and < 30:
  - Use urgency language: "FINAL CALL", "Last chance"
  - ALL CAPS for time: "CLOSES IN {{nextQuestionIn}}"

IF totalPredictionsToday = 0:
  - "You could be first" angle
  - "No predictions yet" curiosity
```

---

## Testing Scenarios

### Test 1: Price Prediction (High Vol)
**Endpoint:** `?type=oracle`

**Expected Fields:**
- ✅ currentPrice: 92100
- ✅ priceTargetHigh: 93100
- ✅ priceTargetLow: 91100
- ✅ volatility: Should be > 2.0 for this type

### Test 2: Market Regime (Low Vol)
**Endpoint:** `?type=oracle`

**Expected Fields:**
- ✅ marketRegime: "RANGING" or "TRENDING"
- ✅ trendStrength: "Weak"/"Moderate"/"Strong"
- ✅ volatility: Should be < 1.0 for this type
- ✅ recommendedType: "market_regime"

### Test 3: Agent Performance (Moderate Vol)
**Endpoint:** `?type=oracle`

**Expected Fields:**
- ✅ currentSlot: 1-12
- ✅ adaptingAgents: Array (may be empty)
- ✅ volatility: Should be 1.0-2.0 for this type

---

## Success Metrics for Scenario 4

### Engagement Benchmarks
- **Good:** 2-3% engagement rate
- **Great:** 4-5% engagement rate
- **Excellent:** 6%+ engagement rate

### Click-Through Rates
- **Target:** 3-4% CTR on t.me links
- **High volatility posts:** Usually 5-6% CTR
- **Low volatility posts:** Usually 2-3% CTR

### Best Performing Types
Based on similar crypto prediction accounts:
1. **Price Predictions (Type B):** Highest engagement during high volatility
2. **Agent Challenges (Type A):** Most consistent engagement
3. **Market Regime (Type C):** Best during sideways markets

---

## Troubleshooting

### Issue: recommendedType always showing "market_regime"
**Cause:** Low volatility in recent trades
**Fix:** Normal behavior - system is working correctly

### Issue: adaptingAgents always empty
**Cause:** No agents have 3+ consecutive wins/losses
**Fix:** This is dynamic data - will populate when agents hit streaks

### Issue: currentPrice seems outdated
**Cause:** Using latest BTC trade from database
**Solution:** Falls back to $97,420 if no recent BTC trades

---

## Production Ready Checklist

- ✅ All 16 oracle fields implemented
- ✅ Dynamic type recommendation (price/agent/regime)
- ✅ Volatility calculation from real trades
- ✅ Price targets automatically calculated
- ✅ Market regime detection (TRENDING/RANGING)
- ✅ Streak multiplier logic
- ✅ Agent adaptation tracking
- ✅ Prompt updated with all new fields
- ✅ Example tweets created for all types
- ✅ Make.com variable mapping documented
- ✅ Router logic defined
- ✅ API tested and returning complete data

---

**Next Step:** Create Scenario 4 in Make.com with the enhanced prompt and test with all 3 challenge types.

---

**Last Updated:** January 2, 2025, 1:25 PM EST
