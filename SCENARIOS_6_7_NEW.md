# New Scenarios 6 & 7 - Complete Documentation

**Date:** January 2, 2025
**Status:** ✅ DEPLOYED AND TESTED

---

## Overview

Two new marketing scenarios added to complement the existing 5:

- **Scenario 6:** Oracle Leaderboard Rankings (Competition/Status)
- **Scenario 7:** Strategy Performance Reveals (Educational Alpha)

Total scenarios: **7 comprehensive marketing angles**

---

# SCENARIO 6: Oracle Leaderboard Rankings

**When:** 11 AM, 6 PM UTC (2x per day)
**Psychology:** Competition + Status + Achievement
**Trigger:** Show leaderboard, create FOMO to join and compete
**Posts:** 2 per day

---

## API Data Structure

### Endpoint
```
GET /marketing-stats?type=leaderboard
```

### Complete Response
```json
{
  "leaderboard": {
    "topPredictors": [
      {
        "username": "CryptoKing",
        "accuracy": 78,
        "totalPredictions": 45,
        "points": 890,
        "rank": 1
      },
      {
        "username": "AlphaHunt",
        "accuracy": 72,
        "totalPredictions": 38,
        "points": 730,
        "rank": 2
      },
      {
        "username": "QuantMast",
        "accuracy": 69,
        "totalPredictions": 42,
        "points": 680,
        "rank": 3
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
    "pointsToTopTen": 420,
    "currentSlot": 10,
    "nextResetIn": "7 days",
    "rewardTier": "Platinum"
  }
}
```

---

## Claude Prompt for Scenario 6

```
You are a competitive gaming marketing expert. Your tweets create status envy and competitive drive. Think esports leaderboards, ranked systems, and achievement culture.

Create an Oracle Leaderboard post for QuantumX:

🏆 LEADERBOARD DATA (All fields from API):

📊 TOP 3 RANKINGS:
- First Place: {{leaderboard.firstPlace.username}} - {{leaderboard.firstPlace.accuracy}}% accuracy, {{leaderboard.firstPlace.points}} pts
- Second Place: {{leaderboard.secondPlace.username}} - {{leaderboard.secondPlace.accuracy}}% accuracy, {{leaderboard.secondPlace.points}} pts
- Third Place: {{leaderboard.thirdPlace.username}} - {{leaderboard.thirdPlace.accuracy}}% accuracy, {{leaderboard.thirdPlace.points}} pts

📈 COMPETITION STATS:
- Total Active Predictors: {{leaderboard.totalActivePredictors}}
- Average Accuracy: {{leaderboard.averageAccuracy}}%
- Competition Level: {{leaderboard.competitionLevel}} (High/Medium/Low)
- Points to Top 10: {{leaderboard.pointsToTopTen}}
- Next Reset: {{leaderboard.nextResetIn}}
- Current Reward Tier: {{leaderboard.rewardTier}} (Platinum/Gold/Silver)

🎯 WRITING RULES:
1. Lead with the top predictor's achievement (status showcase)
2. Show the competition intensity (X players competing)
3. Create achievement gap awareness ("You could be here")
4. Use ranking language: "climbing", "dominating", "overtaking"
5. Imply rewards/recognition for top performers
6. Max 260 characters
7. End with: "Compete: t.me/agentquantumx"

🧠 PSYCHOLOGY TRIGGERS:
- Status: "{{firstPlace.username}} is dominating"
- Competition: "87 players competing for top 10"
- Achievement Gap: "Only {{pointsToTopTen}} points to top 10"
- FOMO: "{{rewardTier}} tier rewards closing soon"
- Scarcity: "Resets in {{nextResetIn}}"

✅ POST STRUCTURES (choose based on data):

Structure A - Top Performer Showcase (when rewardTier = 'Platinum'):
"Oracle Leaderboard:

🥇 {{firstPlace.username}}: {{firstPlace.accuracy}}% accuracy, {{firstPlace.points}} pts
🥈 {{secondPlace.username}}: {{secondPlace.accuracy}}%
🥉 {{thirdPlace.username}}: {{thirdPlace.accuracy}}%

{{totalActivePredictors}} players competing.
Platinum tier active.

Compete: t.me/agentquantumx"

Structure B - Competition Intensity (when competitionLevel = 'High'):
"{{totalActivePredictors}} predictors battling for Oracle top 10.

Current leader: {{firstPlace.username}} ({{firstPlace.accuracy}}% accuracy)

Only {{pointsToTopTen}} points to crack the leaderboard.

Resets in {{nextResetIn}}.
t.me/agentquantumx"

Structure C - Achievement Gap (when averageAccuracy < 60):
"Oracle average accuracy: {{averageAccuracy}}%

Top 3 crushing it:
{{firstPlace.username}}: {{firstPlace.accuracy}}%
{{secondPlace.username}}: {{secondPlace.accuracy}}%
{{thirdPlace.username}}: {{thirdPlace.accuracy}}%

Can you beat the average?
t.me/agentquantumx"

Structure D - Status Challenge (always works):
"Who's predicting best in the Oracle?

🏆 {{firstPlace.username}} leads with {{firstPlace.points}} points

{{totalActivePredictors}} active competitors.
{{rewardTier}} rewards on the line.

Join the competition: t.me/agentquantumx"

📝 SELECTION LOGIC:
- If rewardTier = "Platinum" → Use Structure A
- If competitionLevel = "High" → Use Structure B
- If averageAccuracy < 60 → Use Structure C
- Otherwise → Use Structure D

🚫 NEVER:
- Reveal actual predictions or outcomes
- Guarantee rewards (imply only)
- Show losing records (focus on top performers only)
- Use hype words ("amazing", "incredible")

Choose the structure based on the data. Show competition intensity. Create status envy. Output ONLY the tweet.
```

---

## Make.com Variable Mapping (Scenario 6)

| Prompt Variable | Make.com Path |
|----------------|---------------|
| `{{leaderboard.firstPlace.username}}` | `1. HTTP → leaderboard → firstPlace → username` |
| `{{leaderboard.firstPlace.accuracy}}` | `1. HTTP → leaderboard → firstPlace → accuracy` |
| `{{leaderboard.firstPlace.points}}` | `1. HTTP → leaderboard → firstPlace → points` |
| `{{leaderboard.secondPlace.username}}` | `1. HTTP → leaderboard → secondPlace → username` |
| `{{leaderboard.thirdPlace.username}}` | `1. HTTP → leaderboard → thirdPlace → username` |
| `{{leaderboard.totalActivePredictors}}` | `1. HTTP → leaderboard → totalActivePredictors` |
| `{{leaderboard.averageAccuracy}}` | `1. HTTP → leaderboard → averageAccuracy` |
| `{{leaderboard.competitionLevel}}` | `1. HTTP → leaderboard → competitionLevel` |
| `{{leaderboard.pointsToTopTen}}` | `1. HTTP → leaderboard → pointsToTopTen` |
| `{{leaderboard.rewardTier}}` | `1. HTTP → leaderboard → rewardTier` |
| `{{leaderboard.nextResetIn}}` | `1. HTTP → leaderboard → nextResetIn` |

---

## Example Tweets (Scenario 6)

### Structure A - Top Performer Showcase
```
Oracle Leaderboard:

🥇 CryptoKing: 78% accuracy, 890 pts
🥈 AlphaHunt: 72%
🥉 QuantMast: 69%

87 players competing.
Platinum tier active.

Compete: t.me/agentquantumx
```

### Structure B - Competition Intensity
```
87 predictors battling for Oracle top 10.

Current leader: CryptoKing (78% accuracy)

Only 420 points to crack the leaderboard.

Resets in 7 days.
t.me/agentquantumx
```

### Structure C - Achievement Gap
```
Oracle average accuracy: 58%

Top 3 crushing it:
CryptoKing: 78%
AlphaHunt: 72%
QuantMast: 69%

Can you beat the average?
t.me/agentquantumx
```

---

# SCENARIO 7: Strategy Performance Reveals

**When:** 12 PM, 8 PM UTC (2x per day)
**Psychology:** Educational + Pattern Recognition + Alpha Sharing
**Trigger:** Show which strategies are winning, create curiosity
**Posts:** 2 per day

---

## API Data Structure

### Endpoint
```
GET /marketing-stats?type=strategy
```

### Complete Response
```json
{
  "strategy": {
    "topStrategy": {
      "name": "Market Phase Sniper",
      "winRate": 58,
      "totalTrades": 45,
      "totalPnL": 9.72,
      "avgPnL": 0.22
    },
    "secondBestStrategy": {
      "name": "Bollinger Mean Reversion",
      "winRate": 40,
      "totalTrades": 42,
      "totalPnL": 0.58,
      "avgPnL": 0.01
    },
    "allStrategies": [
      {
        "name": "Market Phase Sniper",
        "winRate": 58,
        "totalTrades": 45,
        "totalPnL": 9.72,
        "avgPnL": 0.22
      },
      {
        "name": "Bollinger Mean Reversion",
        "winRate": 40,
        "totalTrades": 42,
        "totalPnL": 0.58,
        "avgPnL": 0.01
      }
    ],
    "totalStrategiesActive": 4,
    "isDominantStrategy": false,
    "isBalancedPerformance": false,
    "dominanceLevel": "Competitive",
    "marketSuitability": "Mean reversion favored",
    "strategyRecommendation": "Multiple strategies viable",
    "performanceGap": 9.14
  }
}
```

---

## Claude Prompt for Scenario 7

```
You are a trading education expert who reveals patterns and insights. Think Real Vision, Hedge Fund manager interviews, and alpha sharing. Educational but exclusive.

Create a Strategy Performance reveal for QuantumX:

📊 STRATEGY DATA (All fields from API):

🏆 TOP PERFORMING STRATEGY:
- Name: {{strategy.topStrategy.name}}
- Win Rate: {{strategy.topStrategy.winRate}}%
- Total Trades: {{strategy.topStrategy.totalTrades}}
- Total P&L: {{strategy.topStrategy.totalPnL}}%
- Avg P&L per trade: {{strategy.topStrategy.avgPnL}}%

🥈 SECOND BEST STRATEGY:
- Name: {{strategy.secondBestStrategy.name}}
- Win Rate: {{strategy.secondBestStrategy.winRate}}%
- Total P&L: {{strategy.secondBestStrategy.totalPnL}}%

📈 MARKET CONTEXT:
- Total Strategies Active: {{strategy.totalStrategiesActive}}
- Is Dominant Strategy: {{strategy.isDominantStrategy}} (true/false)
- Is Balanced Performance: {{strategy.isBalancedPerformance}}
- Dominance Level: {{strategy.dominanceLevel}} (High/Balanced/Competitive)
- Market Suitability: {{strategy.marketSuitability}}
- Strategy Recommendation: {{strategy.strategyRecommendation}}
- Performance Gap: {{strategy.performanceGap}}% (between 1st and 2nd)

🎯 WRITING RULES:
1. Lead with the winning strategy name + its performance
2. Explain WHY it's winning (market conditions)
3. Show the data (win rate, P&L, trade count)
4. Create educational value ("This is what's working")
5. Imply Arena agents are using this successfully
6. Max 280 characters
7. End with: "Full breakdown: t.me/agentquantumx"

🧠 PSYCHOLOGY TRIGGERS:
- Pattern Recognition: "X strategy dominating today"
- Education: "Here's why it's working"
- Alpha Sharing: Revealing what insiders see
- Market Insight: Connecting strategy to conditions
- Exclusivity: "We track this so you don't have to"

✅ POST STRUCTURES (choose based on data):

Structure A - Dominant Strategy (when isDominantStrategy = true):
"{{topStrategy.name}} dominating today's Arena.

{{topStrategy.winRate}}% win rate
{{topStrategy.totalTrades}} trades
+{{topStrategy.totalPnL}}% total P&L

Market conditions: {{marketSuitability}}

Pattern recognized.
Full breakdown: t.me/agentquantumx"

Structure B - Competitive Landscape (when dominanceLevel = 'Competitive'):
"Strategy battle in the Arena:

🥇 {{topStrategy.name}}: +{{topStrategy.totalPnL}}%
🥈 {{secondBestStrategy.name}}: +{{secondBestStrategy.totalPnL}}%

{{performanceGap}}% performance gap.

{{totalStrategiesActive}} strategies active.
Which wins today? t.me/agentquantumx"

Structure C - Market Suitability (when marketSuitability mentions specific condition):
"Today's market: {{marketSuitability}}

{{topStrategy.name}} capitalizing:
- {{topStrategy.winRate}}% win rate
- {{topStrategy.totalTrades}} trades executed
- +{{topStrategy.avgPnL}}% avg per trade

The data doesn't lie.
t.me/agentquantumx"

Structure D - Educational Alpha (always works):
"Strategy Performance Update:

{{topStrategy.name}} leading with {{topStrategy.totalPnL}}% today.

{{topStrategy.totalTrades}} trades, {{topStrategy.winRate}}% win rate.

Recommended for: {{strategyRecommendation}}

Learn more: t.me/agentquantumx"

📝 SELECTION LOGIC:
- If isDominantStrategy = true → Use Structure A
- If dominanceLevel = "Competitive" AND performanceGap > 5 → Use Structure B
- If marketSuitability mentions "Momentum" or "Mean reversion" → Use Structure C
- Otherwise → Use Structure D

🚫 NEVER:
- Claim "best strategy ever" (show data only)
- Guarantee future performance
- Use hype language
- Recommend specific trades

Choose the structure. Focus on data and education. Show what's working NOW. Output ONLY the tweet.
```

---

## Make.com Variable Mapping (Scenario 7)

| Prompt Variable | Make.com Path |
|----------------|---------------|
| `{{strategy.topStrategy.name}}` | `1. HTTP → strategy → topStrategy → name` |
| `{{strategy.topStrategy.winRate}}` | `1. HTTP → strategy → topStrategy → winRate` |
| `{{strategy.topStrategy.totalTrades}}` | `1. HTTP → strategy → topStrategy → totalTrades` |
| `{{strategy.topStrategy.totalPnL}}` | `1. HTTP → strategy → topStrategy → totalPnL` |
| `{{strategy.topStrategy.avgPnL}}` | `1. HTTP → strategy → topStrategy → avgPnL` |
| `{{strategy.secondBestStrategy.name}}` | `1. HTTP → strategy → secondBestStrategy → name` |
| `{{strategy.secondBestStrategy.totalPnL}}` | `1. HTTP → strategy → secondBestStrategy → totalPnL` |
| `{{strategy.isDominantStrategy}}` | `1. HTTP → strategy → isDominantStrategy` |
| `{{strategy.dominanceLevel}}` | `1. HTTP → strategy → dominanceLevel` |
| `{{strategy.marketSuitability}}` | `1. HTTP → strategy → marketSuitability` |
| `{{strategy.performanceGap}}` | `1. HTTP → strategy → performanceGap` |

---

## Example Tweets (Scenario 7)

### Structure A - Dominant Strategy
```
Market Phase Sniper dominating today's Arena.

58% win rate
45 trades
+9.72% total P&L

Market conditions: Mean reversion favored

Pattern recognized.
Full breakdown: t.me/agentquantumx
```

### Structure B - Competitive Landscape
```
Strategy battle in the Arena:

🥇 Market Phase Sniper: +9.72%
🥈 Bollinger Mean Reversion: +0.58%

9.14% performance gap.

4 strategies active.
Which wins today? t.me/agentquantumx
```

### Structure C - Market Suitability
```
Today's market: Mean reversion favored

Market Phase Sniper capitalizing:
- 58% win rate
- 45 trades executed
- +0.22% avg per trade

The data doesn't lie.
t.me/agentquantumx
```

---

## Posting Schedule (All 7 Scenarios)

| Time (UTC) | Scenario | Type | Frequency |
|------------|----------|------|-----------|
| 01:00 | 5 | Alpha Leak | 3x/day |
| 03:00 | 2 | Live Alert | 3x/day |
| 05:00 | 3 | Social Proof | 2x/day |
| 07:00 | 1 | Daily Performance | 2x/day |
| 09:00 | 4 | Oracle Challenge | 2x/day |
| 11:00 | **6** | **Leaderboard** | **2x/day** |
| 12:00 | **7** | **Strategy** | **2x/day** |
| 13:00 | 3 | Social Proof | 2x/day |
| 15:00 | 5 | Alpha Leak | 3x/day |
| 17:00 | 1 | Daily Performance | 2x/day |
| 18:00 | **6** | **Leaderboard** | **2x/day** |
| 19:00 | 4 | Oracle Challenge | 2x/day |
| 20:00 | **7** | **Strategy** | **2x/day** |
| 21:00 | 2 | Live Alert | 3x/day |
| 23:00 | 5 | Alpha Leak | 3x/day |

**Total Posts Per Day:** 16 (was 12, now 16 with new scenarios)

---

## Smart Filters for New Scenarios

### Scenario 6 Filters (Leaderboard)

**Post When:**
```
competitionLevel = "High" OR rewardTier = "Platinum" OR totalActivePredictors > 50
```

**Skip When:**
- No active predictors (totalActivePredictors = 0)
- Competition level = "Low" AND no rewards tier active

### Scenario 7 Filters (Strategy)

**Post When:**
```
topStrategy.totalPnL > 2.0 OR (isDominantStrategy = true AND topStrategy.winRate > 60)
```

**Skip When:**
- All strategies losing (topStrategy.totalPnL < 0)
- Less than 10 trades executed today
- No clear winner (performanceGap < 1.0 AND all negative)

---

## Production Checklist

### Scenario 6 (Leaderboard)
- ✅ API endpoint `/marketing-stats?type=leaderboard`
- ✅ 11 data fields implemented
- ✅ Default fallback data for cold start
- ✅ Real prediction aggregation logic
- ✅ Points and ranking calculation
- ✅ 4 tweet structures
- ✅ Make.com variable mapping documented
- ✅ Smart filters defined

### Scenario 7 (Strategy)
- ✅ API endpoint `/marketing-stats?type=strategy`
- ✅ 11 data fields implemented
- ✅ Real strategy performance calculation
- ✅ Market suitability detection
- ✅ Dominance level logic
- ✅ 4 tweet structures
- ✅ Make.com variable mapping documented
- ✅ Smart filters defined

---

## Why These Scenarios Work

### Scenario 6 (Leaderboard) Psychology
1. **Status Competition** - People want to be recognized
2. **Achievement Display** - Top 3 showcase creates aspiration
3. **Gap Awareness** - "Only X points to top 10" creates urgency
4. **Reward Tiers** - Platinum/Gold/Silver creates hierarchy
5. **Time Scarcity** - "Resets in 7 days" adds urgency

### Scenario 7 (Strategy) Psychology
1. **Pattern Recognition** - Humans love spotting patterns
2. **Educational Value** - "Here's what's working" creates trust
3. **Alpha Sharing** - Feels like insider information
4. **Market Context** - Connects strategy to conditions
5. **Proof of Concept** - Real data validates the Arena

---

## Next Steps

1. ✅ API deployed with new endpoints
2. **Add to [MAKE_COM_PROMPTS.md](./MAKE_COM_PROMPTS.md)**
3. **Create Make.com scenarios:**
   - Scenario 6: HTTP → Router → Claude → Buffer
   - Scenario 7: HTTP → Router → Claude → Buffer
4. **Set schedules:**
   - Scenario 6: 11 AM, 6 PM UTC
   - Scenario 7: 12 PM, 8 PM UTC
5. **Test with manual triggers**
6. **Monitor engagement for 1 week**
7. **Optimize based on performance**

---

**Last Updated:** January 2, 2025, 2:00 PM EST
**Status:** ✅ PRODUCTION READY
