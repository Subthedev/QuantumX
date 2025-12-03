# Make.com Visual Setup Guide

## How to Map Supabase Data to Claude Prompts

### SCENARIO 1: Daily Performance

**Supabase Module Output:**
```json
{
  "daily": {
    "totalTrades": 21,
    "winRate": 52.4,
    "totalPnL": 6.14,
    "bestAgent": {
      "name": "AlphaX",
      "pnl": 3.77,
      "trades": 10
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
```

**How to Map in Claude Module:**

In the prompt field, replace these placeholders with Make.com variables:

| Placeholder | Make.com Mapping |
|-------------|------------------|
| `{{daily.totalTrades}}` | Click field → Select `1. Supabase` → `daily` → `totalTrades` |
| `{{daily.winRate}}` | Click field → Select `1. Supabase` → `daily` → `winRate` |
| `{{daily.totalPnL}}` | Click field → Select `1. Supabase` → `daily` → `totalPnL` |
| `{{daily.bestAgent.name}}` | Click field → Select `1. Supabase` → `daily` → `bestAgent` → `name` |
| `{{daily.bestAgent.pnl}}` | Click field → Select `1. Supabase` → `daily` → `bestAgent` → `pnl` |
| `{{daily.topTrades[0].agent}}` | Click field → Select `1. Supabase` → `daily` → `topTrades` → `1: agent` |
| `{{daily.topTrades[0].symbol}}` | Click field → Select `1. Supabase` → `daily` → `topTrades` → `1: symbol` |
| `{{daily.topTrades[0].direction}}` | Click field → Select `1. Supabase` → `daily` → `topTrades` → `1: direction` |
| `{{daily.topTrades[0].pnl}}` | Click field → Select `1. Supabase` → `daily` → `topTrades` → `1: pnl` |

**Example Output Tweet:**
```
QuantumX Arena: +6.14% today.

• 21 trades executed
• 52.4% win rate
• AlphaX led: +3.77%

Best trade: BetaX LONG ETH/USD +1.33%

Real signals: t.me/agentquantumx
```

---

### SCENARIO 2: Live Trade Alerts

**Supabase Module Output:**
```json
{
  "live": {
    "lastTrade": {
      "agent": "BetaX",
      "symbol": "ETH/USD",
      "direction": "LONG",
      "pnl": 1.33,
      "timestamp": "2025-12-02T16:10:25.211Z"
    },
    "activePositions": [...]
  }
}
```

**How to Map:**

| Placeholder | Make.com Mapping |
|-------------|------------------|
| `{{live.lastTrade.agent}}` | `1. Supabase` → `live` → `lastTrade` → `agent` |
| `{{live.lastTrade.symbol}}` | `1. Supabase` → `live` → `lastTrade` → `symbol` |
| `{{live.lastTrade.direction}}` | `1. Supabase` → `live` → `lastTrade` → `direction` |
| `{{live.lastTrade.pnl}}` | `1. Supabase` → `live` → `lastTrade` → `pnl` |

**Example Output:**
```
While you were deciding, BetaX moved.

ETH/USD LONG: +1.33%
Bollinger Mean Reversion

Signals drop first in Telegram.
t.me/agentquantumx
```

---

### SCENARIO 3: Social Proof

**Supabase Module Output:**
```json
{
  "community": {
    "telegramMembers": 2847,
    "totalSignalsDelivered": 10288,
    "countriesRepresented": 47
  }
}
```

**How to Map:**

| Placeholder | Make.com Mapping |
|-------------|------------------|
| `{{community.telegramMembers}}` | `1. Supabase` → `community` → `telegramMembers` |
| `{{community.totalSignalsDelivered}}` | `1. Supabase` → `community` → `totalSignalsDelivered` |
| `{{community.countriesRepresented}}` | `1. Supabase` → `community` → `countriesRepresented` |

**Example Output:**
```
2,847 traders tracking QuantumX Arena.

10,288 signals delivered.
Traders from 47 countries.

The crowd is moving.
t.me/agentquantumx
```

---

### SCENARIO 4: Oracle Challenge

**Supabase Module Output:**
```json
{
  "oracle": {
    "currentSlot": 9,
    "totalPredictionsToday": 47,
    "nextQuestionIn": "1h 50m"
  }
}
```

**How to Map:**

| Placeholder | Make.com Mapping |
|-------------|------------------|
| `{{oracle.currentSlot}}` | `1. Supabase` → `oracle` → `currentSlot` |
| `{{oracle.totalPredictionsToday}}` | `1. Supabase` → `oracle` → `totalPredictionsToday` |
| `{{oracle.nextQuestionIn}}` | `1. Supabase` → `oracle` → `nextQuestionIn` |

**Example Output:**
```
Which QuantumX agent wins today?

⚡ AlphaX (aggressive)
🔷 BetaX (balanced)
🛡️ GammaX (conservative)

Slot 9/12 · Closes in 1h 50m

Lock your prediction: t.me/agentquantumx
```

---

### SCENARIO 5: Alpha Leak

**Supabase Module Output:**
```json
{
  "live": {
    "activePositions": [
      {
        "agent": "BetaX",
        "symbol": "DOGE/USD",
        "strategy": "Spring Trap"
      },
      {
        "agent": "AlphaX",
        "symbol": "BTC/USD",
        "strategy": "Golden Cross"
      }
    ]
  }
}
```

**How to Map:**

| Placeholder | Make.com Mapping |
|-------------|------------------|
| `{{live.activePositions.length}}` | `1. Supabase` → `live` → `activePositions` → Array length |
| `{{live.activePositions[0].agent}}` | `1. Supabase` → `live` → `activePositions` → `1: agent` |
| `{{live.activePositions[0].strategy}}` | `1. Supabase` → `live` → `activePositions` → `1: strategy` |

**Example Output:**
```
👀

2 positions active.
High conviction setups.

Telegram sees it first.
```

---

## Step-by-Step: Setting Up Scenario 1

### 1. Create New Scenario

1. Go to [Make.com Scenarios](https://www.make.com/en/scenarios)
2. Click **Create a new scenario**
3. Name: "QuantumX - Daily Performance"

### 2. Add Schedule Trigger

1. Click the **+** button
2. Search: "Schedule"
3. Select **"Schedule"** → **"Every day"**
4. Set times: **07:00 UTC** and **17:00 UTC** (add second schedule)

### 3. Add Supabase Module

1. Click **+** after Schedule
2. Search: "HTTP"
3. Select **"HTTP"** → **"Make a request"**
4. Configure:
   - **URL:** `https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=daily`
   - **Method:** GET
   - **Headers:**
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZHppeWRzcGVld21jZXhxaWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDc3MzIsImV4cCI6MjA2OTQyMzczMn0.cn4UuIO1zg-vtNZbHuVhTHK0fuZIIGFhNzz4hwkdwvg
     x-api-key: [YOUR_MARKETING_API_KEY]
     ```
   - **Parse response:** Yes

5. Click **Run once** to test

### 4. Add Claude Module

1. Click **+** after HTTP
2. Search: "Anthropic Claude"
3. Select **"Create a Message"**
4. Connect your Anthropic API key
5. Configure:
   - **Model:** `claude-sonnet-4-20250514`
   - **Max Tokens:** 300
   - **Temperature:** 0.8
   - **System:** (Leave empty)
   - **Messages → User Content:**
     - Copy the full prompt from `MAKE_COM_PROMPTS.md` (Scenario 1)
     - Replace `{{daily.totalTrades}}` with mapped field from step 3
     - Repeat for all variables

### 5. Add Buffer Module

1. Click **+** after Claude
2. Search: "Buffer"
3. Select **"Buffer"** → **"Create a Post"**
4. Connect your Buffer account
5. Configure:
   - **Profile:** Select @QuantumXCoin
   - **Text:** Map from `2. Claude` → `content` → `1: text`
   - **Now:** Toggle OFF (it will use Buffer's queue)

### 6. Test & Activate

1. Click **Run once**
2. Check each module's output
3. Verify tweet appears in Buffer queue
4. Toggle scenario **ON**

---

## Troubleshooting

### Issue: "No data returned from Supabase"

**Fix:**
- Check the URL has `?type=daily` (or relevant type)
- Verify both headers are present
- Test URL in browser first

### Issue: "Claude prompt too long"

**Fix:**
- Remove example section from prompt
- Keep only Rules and Format sections
- Max 4000 characters

### Issue: "Buffer says 'text too long'"

**Fix:**
- Add **Text Functions** module between Claude and Buffer
- Use "Limit text length" to 280 characters
- Or adjust Claude prompt to enforce shorter output

### Issue: "Variables not mapping"

**Fix:**
- After running HTTP module once, refresh the page
- Variables should now appear in dropdown
- If still missing, check "Parse response" is enabled

---

## Quick Copy-Paste: All Endpoints

```
Daily: https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=daily
Live: https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=live
Oracle: https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=oracle
Community: https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=community
All: https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=all
```

---

## Pro Tips

### Tip 1: Use Router for Smart Filtering

Add a **Router** between Supabase and Claude to skip posts when data is boring:

**Example Filter:**
- Route 1: If `daily.totalTrades > 15` → Post
- Route 2: If `daily.totalTrades <= 15` → Skip

### Tip 2: Add Randomization

To avoid repetitive tweets, add multiple Claude modules with different prompt variations and use Router to randomly select one.

### Tip 3: Schedule Variety

Don't post all scenarios at the same time. Spread them out:
- 1 AM: Alpha Leak
- 3 AM: Live Alert
- 5 AM: Social Proof
- 7 AM: Daily Performance
- 9 AM: Oracle Challenge
- ... and so on

---

**Need Help?** Check the main prompts file: [MAKE_COM_PROMPTS.md](./MAKE_COM_PROMPTS.md)
