# Make.com Setup with Native Supabase Module

## Using Supabase Edge Functions via Make.com Supabase Module

When using Make.com's native Supabase integration, you'll call the edge functions through the Supabase module instead of HTTP.

---

## Prerequisites

1. **Supabase Connection in Make.com:**
   - Go to Make.com → Connections
   - Add "Supabase" connection
   - You'll need:
     - **Project URL:** `https://vidziydspeewmcexqicg.supabase.co`
     - **API Key (anon):** `[Get from Supabase Dashboard → Settings → API]`

   **⚠️ SECURITY:** Never commit API keys to documentation. Store in Make.com environment variables.

---

## SCENARIO 1: Daily Performance

### Step-by-Step Setup

#### 1. Schedule Module
- **Module:** Schedule → Every Day
- **Time:** 07:00 and 17:00 UTC

#### 2. Supabase Module (Call Edge Function)

**Module:** Supabase → Make an API Call

**Configuration:**
```
URL: /functions/v1/marketing-stats
Method: GET
Query String:
  - Name: type
  - Value: daily
Headers:
  - Name: x-api-key
  - Value: [YOUR_MARKETING_API_KEY]
```

**Output Structure You'll Get:**
```json
{
  "data": {
    "daily": {
      "totalTrades": 21,
      "winRate": 52.4,
      "totalPnL": 6.14,
      "bestAgent": {
        "name": "AlphaX",
        "pnl": 3.77,
        "trades": 10
      },
      "worstAgent": {
        "name": "BetaX",
        "pnl": 2.36,
        "trades": 11
      },
      "topTrades": [
        {
          "agent": "BetaX",
          "symbol": "ETH/USD",
          "direction": "LONG",
          "pnl": 1.33,
          "strategy": "Bollinger Mean Reversion"
        }
      ]
    }
  }
}
```

#### 3. Claude Module

**Module:** Anthropic Claude → Create a Message

**Configuration:**
- **Model:** claude-sonnet-4-20250514
- **Max Tokens:** 300
- **Temperature:** 0.8

**Prompt (with Make.com variable mapping):**

```
You are a world-class crypto marketing copywriter for QuantumX. You write like the best crypto Twitter accounts: data-driven, confident, zero fluff.

Write a tweet showcasing QuantumX Arena's daily performance:

📊 PERFORMANCE DATA:
- Total Trades: {{1.data.daily.totalTrades}}
- Win Rate: {{1.data.daily.winRate}}%
- Total P&L: {{1.data.daily.totalPnL}}%
- Best Agent: {{1.data.daily.bestAgent.name}} (+{{1.data.daily.bestAgent.pnl}}%)
- Top Trade: {{1.data.daily.topTrades[1].agent}} {{1.data.daily.topTrades[1].direction}} {{1.data.daily.topTrades[1].symbol}} +{{1.data.daily.topTrades[1].pnl}}%

🎯 WRITING RULES:
1. Lead with the most impressive stat (hook in 3 words)
2. Use "QuantumX Arena" in first line
3. Include 3-4 key metrics
4. Show top trade with specific numbers
5. Professional tone - data speaks
6. NO hype words ("amazing", "incredible")
7. Max 260 characters
8. End with: "t.me/agentquantumx"

📝 FORMAT:
Line 1: Hook + headline stat
Line 2-4: Key metrics
Line 5: Proof (top trade)
Line 6: CTA

Output ONLY the tweet text.
```

**Variable Mapping in Make.com:**
When you click into the prompt field, you'll see dropdowns. Map like this:

| In Prompt | Make.com Mapping |
|-----------|------------------|
| `{{1.data.daily.totalTrades}}` | Module 1 (Supabase) → data → daily → totalTrades |
| `{{1.data.daily.winRate}}` | Module 1 → data → daily → winRate |
| `{{1.data.daily.totalPnL}}` | Module 1 → data → daily → totalPnL |
| `{{1.data.daily.bestAgent.name}}` | Module 1 → data → daily → bestAgent → name |
| `{{1.data.daily.bestAgent.pnl}}` | Module 1 → data → daily → bestAgent → pnl |
| `{{1.data.daily.topTrades[1].agent}}` | Module 1 → data → daily → topTrades → 1: agent |
| `{{1.data.daily.topTrades[1].symbol}}` | Module 1 → data → daily → topTrades → 1: symbol |
| `{{1.data.daily.topTrades[1].direction}}` | Module 1 → data → daily → topTrades → 1: direction |
| `{{1.data.daily.topTrades[1].pnl}}` | Module 1 → data → daily → topTrades → 1: pnl |

#### 4. Buffer Module

**Module:** Buffer → Create a Post

**Configuration:**
- **Profile:** @QuantumXCoin
- **Text:** {{2.content[1].text}}
- **Now:** OFF (uses Buffer's queue)

---

## SCENARIO 2: Live Trade Alerts

### Supabase Module
```
URL: /functions/v1/marketing-stats
Method: GET
Query String:
  - Name: type
  - Value: live
Headers:
  - Name: x-api-key
  - Value: [YOUR_MARKETING_API_KEY]
```

### Filter (Optional - Only Post if Trade Exists)
Add **Filter** module between Supabase and Claude:
- **Condition:** `{{1.data.live.lastTrade}}` EXISTS
- This prevents posting when there are no recent trades

### Claude Prompt Variables
```
- Agent: {{1.data.live.lastTrade.agent}}
- Symbol: {{1.data.live.lastTrade.symbol}}
- Direction: {{1.data.live.lastTrade.direction}}
- P&L: {{1.data.live.lastTrade.pnl}}%
- Timestamp: {{1.data.live.lastTrade.timestamp}}
```

---

## SCENARIO 3: Social Proof

### Supabase Module
```
URL: /functions/v1/marketing-stats
Method: GET
Query String:
  - Name: type
  - Value: community
Headers:
  - Name: x-api-key
  - Value: [YOUR_MARKETING_API_KEY]
```

### Claude Prompt Variables
```
- Telegram Members: {{1.data.community.telegramMembers}}
- Signals Delivered: {{1.data.community.totalSignalsDelivered}}
- Countries: {{1.data.community.countriesRepresented}}
```

---

## SCENARIO 4: Oracle Challenge

### Supabase Module
```
URL: /functions/v1/marketing-stats
Method: GET
Query String:
  - Name: type
  - Value: oracle
Headers:
  - Name: x-api-key
  - Value: [YOUR_MARKETING_API_KEY]
```

### Claude Prompt Variables
```
- Current Slot: {{1.data.oracle.currentSlot}}
- Total Predictions Today: {{1.data.oracle.totalPredictionsToday}}
- Next Question In: {{1.data.oracle.nextQuestionIn}}
- Top Predictor: {{1.data.oracle.topPredictor.username}} ({{1.data.oracle.topPredictor.accuracy}}% accuracy)
```

---

## SCENARIO 5: Alpha Leak

### Supabase Module
```
URL: /functions/v1/marketing-stats
Method: GET
Query String:
  - Name: type
  - Value: live
Headers:
  - Name: x-api-key
  - Value: [YOUR_MARKETING_API_KEY]
```

### Claude Prompt Variables
```
- Active Positions Count: {{length(1.data.live.activePositions)}}
- First Agent: {{1.data.live.activePositions[1].agent}}
- First Strategy: {{1.data.live.activePositions[1].strategy}}
- Agent Streaks: {{1.data.live.agentStreaks[1].agent}} - {{1.data.live.agentStreaks[1].streak}} {{1.data.live.agentStreaks[1].type}}
```

**Note:** For getting array length in Make.com, you may need to add a **Set Variable** module:
```
Variable Name: positionCount
Variable Value: {{length(1.data.live.activePositions)}}
```

---

## SCENARIO 6: Oracle Leaderboard Rankings (NEW)

### Supabase Module
```
URL: /functions/v1/marketing-stats
Method: GET
Query String:
  - Name: type
  - Value: leaderboard
Headers:
  - Name: x-api-key
  - Value: [YOUR_MARKETING_API_KEY]
```

### Output Structure
```json
{
  "data": {
    "leaderboard": {
      "topPredictors": [
        {
          "username": "CryptoKing",
          "accuracy": 78,
          "totalPredictions": 45,
          "points": 890,
          "rank": 1
        }
      ],
      "totalActivePredictors": 87,
      "averageAccuracy": 58,
      "firstPlace": {
        "username": "CryptoKing",
        "accuracy": 78,
        "points": 890
      },
      "secondPlace": {
        "username": "AlphaHunt",
        "accuracy": 72,
        "points": 730
      },
      "thirdPlace": {
        "username": "QuantMast",
        "accuracy": 69,
        "points": 680
      },
      "competitionLevel": "High",
      "pointsToTopTen": 450,
      "currentSlot": 10,
      "nextResetIn": "7 days",
      "rewardTier": "Platinum"
    }
  }
}
```

### Claude Prompt Variables
```
- First Place: {{1.data.leaderboard.firstPlace.username}} - {{1.data.leaderboard.firstPlace.accuracy}}% accuracy
- First Place Points: {{1.data.leaderboard.firstPlace.points}}
- Second Place: {{1.data.leaderboard.secondPlace.username}} - {{1.data.leaderboard.secondPlace.accuracy}}%
- Third Place: {{1.data.leaderboard.thirdPlace.username}} - {{1.data.leaderboard.thirdPlace.accuracy}}%
- Total Active Predictors: {{1.data.leaderboard.totalActivePredictors}}
- Average Accuracy: {{1.data.leaderboard.averageAccuracy}}%
- Competition Level: {{1.data.leaderboard.competitionLevel}}
- Reward Tier: {{1.data.leaderboard.rewardTier}}
- Points to Top 10: {{1.data.leaderboard.pointsToTopTen}}
- Current Slot: {{1.data.leaderboard.currentSlot}}/12
- Next Reset: {{1.data.leaderboard.nextResetIn}}
```

### Variable Mapping Table

| In Prompt | Make.com Mapping |
|-----------|------------------|
| `{{1.data.leaderboard.firstPlace.username}}` | Module 1 → data → leaderboard → firstPlace → username |
| `{{1.data.leaderboard.firstPlace.accuracy}}` | Module 1 → data → leaderboard → firstPlace → accuracy |
| `{{1.data.leaderboard.firstPlace.points}}` | Module 1 → data → leaderboard → firstPlace → points |
| `{{1.data.leaderboard.competitionLevel}}` | Module 1 → data → leaderboard → competitionLevel |
| `{{1.data.leaderboard.rewardTier}}` | Module 1 → data → leaderboard → rewardTier |
| `{{1.data.leaderboard.totalActivePredictors}}` | Module 1 → data → leaderboard → totalActivePredictors |

### Smart Filter (Recommended)
Add **Filter** module after Supabase:
- **Condition 1:** `{{1.data.leaderboard.competitionLevel}}` = "High"
- **OR Condition 2:** `{{1.data.leaderboard.rewardTier}}` = "Platinum"
- **OR Condition 3:** `{{1.data.leaderboard.totalActivePredictors}}` > 50

**Skip posting when:**
- `{{1.data.leaderboard.totalActivePredictors}}` = 0

---

## SCENARIO 7: Strategy Performance Reveals (NEW)

### Supabase Module
```
URL: /functions/v1/marketing-stats
Method: GET
Query String:
  - Name: type
  - Value: strategy
Headers:
  - Name: x-api-key
  - Value: [YOUR_MARKETING_API_KEY]
```

### Output Structure
```json
{
  "data": {
    "strategy": {
      "topStrategy": {
        "name": "Market Phase Sniper",
        "winRate": 58,
        "totalTrades": 12,
        "totalPnL": 9.72,
        "avgPnL": 0.81
      },
      "secondBestStrategy": {
        "name": "Bollinger Mean Reversion",
        "winRate": 33,
        "totalTrades": 9,
        "totalPnL": 0.58
      },
      "allStrategies": [
        {
          "name": "Market Phase Sniper",
          "winRate": 58,
          "totalTrades": 12,
          "totalPnL": 9.72,
          "avgPnL": 0.81
        }
      ],
      "totalStrategiesActive": 4,
      "isDominantStrategy": false,
      "isBalancedPerformance": false,
      "dominanceLevel": "Competitive",
      "marketSuitability": "Mixed conditions",
      "strategyRecommendation": "Multiple strategies viable",
      "performanceGap": 9.14
    }
  }
}
```

### Claude Prompt Variables
```
- Top Strategy Name: {{1.data.strategy.topStrategy.name}}
- Top Strategy Win Rate: {{1.data.strategy.topStrategy.winRate}}%
- Top Strategy Total P&L: {{1.data.strategy.topStrategy.totalPnL}}%
- Top Strategy Trades: {{1.data.strategy.topStrategy.totalTrades}}
- Top Strategy Avg P&L: {{1.data.strategy.topStrategy.avgPnL}}%
- Second Best Strategy: {{1.data.strategy.secondBestStrategy.name}} ({{1.data.strategy.secondBestStrategy.winRate}}%)
- Total Strategies Active: {{1.data.strategy.totalStrategiesActive}}
- Is Dominant Strategy: {{1.data.strategy.isDominantStrategy}}
- Dominance Level: {{1.data.strategy.dominanceLevel}}
- Market Suitability: {{1.data.strategy.marketSuitability}}
- Performance Gap: {{1.data.strategy.performanceGap}}%
```

### Variable Mapping Table

| In Prompt | Make.com Mapping |
|-----------|------------------|
| `{{1.data.strategy.topStrategy.name}}` | Module 1 → data → strategy → topStrategy → name |
| `{{1.data.strategy.topStrategy.winRate}}` | Module 1 → data → strategy → topStrategy → winRate |
| `{{1.data.strategy.topStrategy.totalPnL}}` | Module 1 → data → strategy → topStrategy → totalPnL |
| `{{1.data.strategy.topStrategy.totalTrades}}` | Module 1 → data → strategy → topStrategy → totalTrades |
| `{{1.data.strategy.dominanceLevel}}` | Module 1 → data → strategy → dominanceLevel |
| `{{1.data.strategy.marketSuitability}}` | Module 1 → data → strategy → marketSuitability |

### Smart Filter (Recommended)
Add **Filter** module after Supabase:
- **Condition 1:** `{{1.data.strategy.topStrategy.totalPnL}}` > 2.0
- **OR Condition 2:** `{{1.data.strategy.performanceGap}}` > 5.0
- **OR Condition 3:** `{{1.data.strategy.isDominantStrategy}}` = true AND `{{1.data.strategy.topStrategy.winRate}}` > 60

**Skip posting when:**
- `{{1.data.strategy.topStrategy.totalPnL}}` < 0
- OR `{{1.data.strategy.topStrategy.totalTrades}}` < 10

---

## Complete Scenario Template

### Module Flow

```
1. Schedule (Daily at 7 AM UTC)
   ↓
2. Supabase: Make an API Call
   URL: /functions/v1/marketing-stats?type=daily
   Headers: x-api-key
   ↓
3. (Optional) Filter
   Condition: data.daily.totalTrades > 0
   ↓
4. Claude: Create a Message
   Prompt: [Full prompt with {{1.data.daily.xxx}} mappings]
   ↓
5. Buffer: Create a Post
   Text: {{4.content[1].text}}
```

---

## Testing Each Scenario

### Test Supabase Module Alone

1. Click **Run once** on just the Supabase module
2. You should see output like:
   ```json
   {
     "data": {
       "daily": {
         "totalTrades": 21,
         ...
       }
     }
   }
   ```
3. If you see this, the module is working!

### Test Full Scenario

1. Click **Run once** on entire scenario
2. Check each module's output
3. Verify Buffer receives the tweet
4. Check Buffer queue for the post

---

## Troubleshooting

### Issue: "Module failed with 401 error"

**Fix:**
- Check Supabase connection is active
- Verify `x-api-key` header is present
- Test URL in browser: `https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=daily&apikey=YOUR_ANON_KEY`

### Issue: "No data returned" or "data is null"

**Cause:** Edge function returned error or empty data

**Debug:**
1. Check Arena is running and trades are being logged
2. Run this in terminal:
   ```bash
   # Set your API keys first
   export SUPABASE_ANON_KEY="your-supabase-anon-key"
   export MARKETING_API_KEY="your-marketing-api-key"

   curl "https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=daily" \
     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     -H "x-api-key: $MARKETING_API_KEY"
   ```
3. If this returns data, the issue is in Make.com mapping

### Issue: "Variables not showing in dropdown"

**Fix:**
1. Run Supabase module **once**
2. Wait for it to complete
3. Refresh Make.com page
4. Variables should now appear in Claude module dropdowns

### Issue: "Array index out of bounds" or "topTrades[1] undefined"

**Cause:** Not enough trades in topTrades array

**Fix:** Add conditional logic:
1. Add **Router** after Supabase
2. Route 1: If `topTrades.length > 0` → Continue to Claude
3. Route 2: If `topTrades.length = 0` → Skip posting

---

## Advanced: Using Make.com Functions

### Getting Array Length
```
{{length(1.data.live.activePositions)}}
```

### Conditional Text
```
{{if(1.data.daily.totalTrades > 20, "Big day", "Quiet day")}}
```

### Formatting Numbers
```
{{formatNumber(1.data.daily.totalPnL; 2)}}  // 2 decimal places
```

### Date Formatting
```
{{formatDate(1.data.live.lastTrade.timestamp; "MMM DD, HH:mm")}}
```

---

## Quick Setup Checklist

For each scenario, verify:

- [ ] Schedule module set with correct UTC times
- [ ] Supabase module configured with:
  - [ ] URL: `/functions/v1/marketing-stats`
  - [ ] Query: `type=[daily/live/oracle/community/leaderboard/strategy]`
  - [ ] Header: `x-api-key` with correct value
- [ ] Test Supabase module returns data
- [ ] Claude module has:
  - [ ] Model: claude-sonnet-4-20250514
  - [ ] Prompt with all variables mapped
  - [ ] Max tokens: 300
- [ ] Buffer module connected to @QuantumXCoin
- [ ] Test full scenario with "Run once"
- [ ] Verify tweet appears in Buffer queue
- [ ] Activate scenario (toggle ON)

---

## All 7 Scenarios Summary

| Scenario | Type | Schedule | Filter? |
|----------|------|----------|---------|
| 1. Daily Performance | `type=daily` | 07:00, 17:00 UTC | No |
| 2. Live Trade Alerts | `type=live` | 03:00, 11:00, 21:00 UTC | Yes (lastTrade exists) |
| 3. Social Proof | `type=community` | 05:00, 13:00 UTC | No |
| 4. Oracle Challenge | `type=oracle` | 09:00, 19:00 UTC | No |
| 5. Alpha Leak | `type=live` | 01:00, 15:00, 23:00 UTC | Optional |
| **6. Leaderboard Rankings** | `type=leaderboard` | **11:00, 18:00 UTC** | **Yes (competitionLevel/predictors)** |
| **7. Strategy Performance** | `type=strategy` | **12:00, 20:00 UTC** | **Yes (totalPnL/performanceGap)** |

**Total Posts Per Day:** 16 (up from 12)

---

## Pro Tips

### 1. Use Data Stores for Rate Limiting

Create a Make.com Data Store to track last post time:
```
Module: Data Store → Get Record
Key: last_post_time_scenario1

If timestamp < 2 hours ago → Skip
Else → Continue and update timestamp
```

### 2. Use Aggregator for Multiple Data Sources

If you want to combine multiple Supabase queries:
```
Supabase 1 → Get trades
Supabase 2 → Get positions
Aggregator → Combine both
Claude → Use combined data
```

### 3. Add Error Notifications

After Buffer module, add:
```
Tools → Set Multiple Variables
   success: true

On Error Path:
   Gmail → Send Email
   Subject: "Make.com Scenario Failed"
   Body: {{error.message}}
```

---

**Need the prompts?** See [MAKE_COM_PROMPTS.md](./MAKE_COM_PROMPTS.md)

**Need examples?** See [EXAMPLE_TWEETS.md](./EXAMPLE_TWEETS.md)
