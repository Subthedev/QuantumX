# Smart Filtering & Professional Marketing Logic

## Why Filtering Matters

**Not every trade deserves a tweet.** Professional crypto accounts only post when they have something worth saying. This builds trust and keeps followers engaged.

### The Problem with Unfiltered Posts:
- ❌ Posting losses damages credibility
- ❌ Posting every small win looks desperate
- ❌ Too many posts = spam = unfollows
- ❌ Low-quality days dilute your brand

### The Solution:
✅ Filter intelligently at the Make.com level
✅ Only post wins that matter
✅ Let silence speak when performance is poor
✅ Build anticipation between posts

---

## SCENARIO 1: Daily Performance - Smart Filters

### When to POST:
```
Filter Conditions (ALL must be true):
✅ daily.shouldPost = true
   OR
✅ daily.isPositiveDay = true
   AND daily.isHighWinRate = true
   AND daily.totalTrades >= 10
```

### When to SKIP:
- Total P&L negative
- Win rate below 50%
- Less than 10 trades (not enough data)
- Biggest win less than 1%

### Make.com Filter Setup:

**Add Filter Module after Supabase:**

```
Condition 1: {{1.data.daily.shouldPost}} = true
   OR
Condition 2:
   {{1.data.daily.isPositiveDay}} = true
   AND {{1.data.daily.winRate}} >= 50
   AND {{1.data.daily.totalTrades}} >= 10
```

**Professional Result:**
- Only posts on genuinely good days
- Builds credibility (always positive when you see them)
- Creates anticipation ("Why didn't QuantumX post today?")

---

## SCENARIO 2: Live Trade Alerts - Win-Only Logic

### ✅ Now Automatically Filtered:

The `lastTrade` field **only returns winning trades** (P&L > 0).

### Additional Make.com Filtering:

**Filter for HIGH-QUALITY wins only:**

```
Condition 1: {{1.data.live.lastTrade}} EXISTS
   AND
Condition 2: {{1.data.live.lastTrade.pnl}} >= 1.5
```

**Why 1.5% minimum?**
- Small wins (0.1-1%) don't create FOMO
- 1.5%+ is impressive enough to post
- Saves your "announcement budget" for wins that matter

### Dynamic Filtering by P&L Size:

Use **Router** for different messaging:

**Route 1:** If P&L >= 3%
- Message: "HUGE WIN" angle
- Post immediately
- Example: "While you were sleeping: AlphaX LONG BTC +3.7%"

**Route 2:** If P&L >= 1.5% and < 3%
- Message: "Solid win" angle
- Post within 30 minutes
- Example: "Another one: BetaX SHORT ETH +2.1%"

**Route 3:** If P&L < 1.5%
- **SKIP** (don't post)
- Wait for bigger wins

---

## SCENARIO 3: Social Proof - Momentum-Only

### When to POST:

```
Post if member growth is significant:
✅ community.telegramMembers > 2500
   AND (member growth > 50/day OR total signals > 10000)
```

### When to SKIP:
- Low member count (looks unimpressive)
- No recent growth (stale data)
- During market crashes (bad timing)

### Make.com Filter:

```
Condition: {{1.data.community.telegramMembers}} >= 2500
```

**Optional: Track Growth Rate**

Add Data Store to track yesterday's member count:

```
1. Get yesterday's count from Data Store
2. Calculate growth: {{today}} - {{yesterday}}
3. Only post if growth > 50 members
```

---

## SCENARIO 4: Oracle Challenge - Engagement Filter

### When to POST:

```
Post during active periods:
✅ oracle.currentSlot between 6-10 (peak hours)
   OR oracle.totalPredictionsToday > 20
```

### When to SKIP:
- Very early morning (low engagement)
- Zero predictions today (no proof of activity)

### Make.com Filter:

```
Condition 1: {{1.data.oracle.currentSlot}} >= 6
   AND {{1.data.oracle.currentSlot}} <= 10
```

**Result:** Only posts when users are actually active and engaged with predictions.

---

## SCENARIO 5: Alpha Leak - Strategic Timing

### When to POST:

```
Post when there's actual suspense:
✅ activePositions.length >= 2
   AND at least one position with high conviction
```

### When to SKIP:
- No open positions (nothing to tease)
- Only 1 position (not interesting enough)
- Market closed/low volatility

### Make.com Filter:

```
Condition: {{length(1.data.live.activePositions)}} >= 2
```

**Advanced: Add Volatility Check**

If you have market data, only post alpha leaks when:
```
Volatility > 20% (exciting market conditions)
```

---

## Master Filtering Strategy

### The 4-Tier Quality System:

#### 🏆 Tier 1: MUST POST (Priority: Immediate)
- Daily P&L > 3%
- Win rate > 65%
- Individual trade > 5%
- **Post immediately, all platforms**

#### ⭐ Tier 2: SHOULD POST (Priority: Within 2 hours)
- Daily P&L 1-3%
- Win rate 50-65%
- Individual trade 1.5-5%
- **Post to Twitter, schedule strategically**

#### 📊 Tier 3: CAN POST (Priority: Low/Optional)
- Daily P&L 0-1%
- Win rate 45-50%
- Individual trade 0.5-1.5%
- **Consider skipping or bundling with other news**

#### ❌ Tier 4: DON'T POST (Priority: Never)
- Daily P&L negative
- Win rate < 45%
- Individual trade < 0.5%
- **Silence is better than posting weakness**

---

## Advanced: Time-Based Filtering

### Best Posting Times (UTC):

| Time | Post Type | Why |
|------|-----------|-----|
| 07:00-09:00 | Daily Recap | European morning, high engagement |
| 13:00-15:00 | Social Proof | Lunch break, browsing Twitter |
| 19:00-21:00 | Oracle Challenge | Evening engagement, US active |
| 23:00-01:00 | Alpha Leak | Night owls, mysterious vibe |
| 03:00-05:00 | Live Alerts (big wins only) | Catch Asian/early European |

### Make.com Filter by Time:

Add **Tools → Get Current Date** module:

```
Hour = {{2.hour}}

Filter:
- If Hour between 7-9 → Allow Daily Performance
- If Hour between 13-15 → Allow Social Proof
- If Hour between 19-21 → Allow Oracle
- etc.
```

---

## Content Quality Checklist

Before any post goes live, it should pass:

### ✅ The "Would I Share This?" Test
- If you saw this tweet, would you share it?
- Does it provide value or just noise?
- Is it impressive or just "okay"?

### ✅ The "Does This Build Trust?" Test
- Does this show competence?
- Is it transparent and honest?
- Would skeptics be convinced?

### ✅ The "Is This Timely?" Test
- Is this news still relevant?
- Are market conditions right?
- Is the audience awake and engaged?

---

## Filter Configuration Templates

### Template 1: Conservative (High Quality Only)

**Daily Performance:**
```
shouldPost = true AND totalPnL >= 2% AND winRate >= 60%
```

**Live Alerts:**
```
lastTrade.pnl >= 2.5%
```

**Result:** Only 4-6 posts per day, all high quality

---

### Template 2: Balanced (Recommended)

**Daily Performance:**
```
shouldPost = true OR (isPositiveDay = true AND winRate >= 50%)
```

**Live Alerts:**
```
lastTrade.pnl >= 1.5%
```

**Result:** 8-10 posts per day, good quality

---

### Template 3: Aggressive (Maximum Reach)

**Daily Performance:**
```
totalPnL >= 0 AND totalTrades >= 5
```

**Live Alerts:**
```
lastTrade.pnl >= 0.8%
```

**Result:** 12-15 posts per day, some lower quality

---

## Monitoring & Adjustment

### Week 1: Use Conservative Template
- Establish credibility
- Build trust with followers
- Only post obvious wins

### Week 2-3: Move to Balanced
- Increase frequency slightly
- Test different thresholds
- Monitor engagement rates

### Week 4+: Optimize Based on Data
- Track which posts get best engagement
- A/B test filter thresholds
- Adjust based on follower growth

---

## Red Flags: When to Stop All Posts

### 🚨 Emergency Stop Conditions:

1. **Market Crash:** BTC drops > 10% in 24h
   - Pause all posting for 24-48h
   - Resume with cautious messaging

2. **Losing Streak:** 3+ consecutive losing days
   - Post only social proof/oracle content
   - Skip performance updates until recovery

3. **Technical Issues:** Arena downtime
   - Pause all automated posts
   - Manual posts only to explain situation

4. **Negative PR:** Controversy or criticism
   - Review all messaging
   - Adjust tone to address concerns

---

## Success Metrics

### Track These in Make.com (via Data Store):

1. **Posts per Day** (target: 8-12)
2. **Average P&L per Post** (target: > 2%)
3. **Win Rate of Posted Trades** (target: > 60%)
4. **Engagement Rate** (track via Buffer analytics)
5. **Telegram Joins from Twitter** (track via UTM params)

### Monthly Review Checklist:

- [ ] Are we posting too much? (causing unfollows)
- [ ] Are we posting too little? (low visibility)
- [ ] Is post quality declining? (lower engagement)
- [ ] Are filters too strict? (missing good opportunities)
- [ ] Are filters too loose? (posting mediocre content)

---

## Example Filter Logic in Make.com

### Complete Scenario 2 (Live Alerts) with Smart Filtering:

```
Module 1: Schedule (every 2 hours)
   ↓
Module 2: Supabase (get live stats)
   ↓
Module 3: Filter
   Condition 1: {{2.data.live.lastTrade}} IS NOT EMPTY
   AND
   Condition 2: {{2.data.live.lastTrade.pnl}} >= 1.5
   ↓
Module 4: Router
   Route 1: If pnl >= 3 → "Huge Win" prompt
   Route 2: If pnl >= 1.5 AND < 3 → "Solid Win" prompt
   ↓
Module 5: Claude (generate tweet)
   ↓
Module 6: Buffer (post)
```

**Result:** Only posts wins >= 1.5%, with messaging adapted to win size.

---

**Remember:** Professional marketing is about **selective disclosure**. Not every piece of data deserves a tweet. Filter aggressively, post strategically, and let your wins speak for themselves.

---

**Last Updated:** January 2, 2025
