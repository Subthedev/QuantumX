# Arena Marketing Data Pipeline - Deployment Guide

This guide walks through deploying the Arena trade logging system to enable **real-time, data-driven marketing**.

## Problem Solved

✅ Marketing API was returning empty data (all zeros)
✅ Arena agents were trading but not persisting to database
✅ No historical trade data for marketing tweets

## Solution Overview

**3-Part Data Pipeline:**
1. **Database Tables** → Store trade history, active positions, agent sessions
2. **Edge Function** → API to log trades from client
3. **Client Integration** → Arena agents call logger when trades execute

---

## Step 1: Create Database Tables

### Option A: Supabase Dashboard SQL Editor (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/vidziydspeewmcexqicg/editor)
2. Click **SQL Editor** → **New Query**
3. Copy and paste the contents of [`supabase/migrations/20250102_arena_marketing_tables.sql`](supabase/migrations/20250102_arena_marketing_tables.sql)
4. Click **Run**
5. Verify tables created:
   - `arena_trade_history`
   - `arena_active_positions`
   - `arena_agent_sessions`

### Option B: Supabase CLI (if Docker is running)

```bash
# Apply migration
supabase db push

# Verify tables
supabase db pull
```

### Verification

Run this in SQL Editor to confirm tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'arena_%';
```

Expected output:
```
arena_active_positions
arena_agent_sessions
arena_trade_history
```

---

## Step 2: Deploy Edge Function

### Deploy arena-trade-logger

```bash
# From project root
cd supabase/functions
supabase functions deploy arena-trade-logger
```

Expected output:
```
✅ Deployed Function arena-trade-logger
   URL: https://vidziydspeewmcexqicg.supabase.co/functions/v1/arena-trade-logger
```

### Test Edge Function

```bash
# Test log_trade action
curl -X POST 'https://vidziydspeewmcexqicg.supabase.co/functions/v1/arena-trade-logger' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "log_trade",
    "data": {
      "agentId": "alphax",
      "symbol": "BTCUSDT",
      "direction": "LONG",
      "entryPrice": 97000,
      "exitPrice": 97500,
      "entryTime": 1735819200000,
      "exitTime": 1735820100000,
      "pnlPercent": 0.52,
      "pnlUsd": 5.20,
      "strategy": "Momentum Surge V2",
      "confidence": 78
    }
  }'
```

Expected response:
```json
{"success": true}
```

### Verify Data Inserted

Run in SQL Editor:
```sql
SELECT * FROM arena_trade_history ORDER BY timestamp DESC LIMIT 5;
SELECT * FROM arena_agent_sessions;
```

---

## Step 3: Integrate Trade Logging into Arena Agents

Now we need to find where Arena agents execute trades and add logging calls.

### Find Arena Trade Execution Code

Let's search for where trades are executed:

```bash
# Search for trade execution patterns
grep -r "executeTradeSignal\|tradingEngine\|agentExecute" src/ --include="*.ts" --include="*.tsx"

# Search for Arena agent files
find src/ -name "*arena*" -o -name "*agent*" | grep -i arena
```

### Integration Pattern

Wherever a trade **opens**, call:
```typescript
import { arenaTradeLogger } from '@/services/arenaTradeLogger'

// When position opens
await arenaTradeLogger.updatePosition({
  agentId: 'alphax', // or 'betax', 'gammax'
  symbol: 'BTCUSDT',
  direction: 'LONG',
  entryPrice: 97000,
  currentPrice: 97000,
  entryTime: Date.now(),
  strategy: 'Momentum Surge V2',
  confidence: 78,
  unrealizedPnlPercent: 0,
  unrealizedPnlUsd: 0
})
```

Wherever a trade **closes**, call:
```typescript
// When position closes
await arenaTradeLogger.logCompletedTrade({
  agentId: 'alphax',
  symbol: 'BTCUSDT',
  direction: 'LONG',
  entryPrice: 97000,
  exitPrice: 97500,
  entryTime: entryTimestamp,
  exitTime: Date.now(),
  pnlPercent: 0.52,
  pnlUsd: 5.20,
  strategy: 'Momentum Surge V2',
  confidence: 78
})

// Also close the position tracking
await arenaTradeLogger.closePosition('alphax', 'BTCUSDT')
```

### Periodic Position Updates (Optional)

For live marketing stats, update positions every 30-60 seconds:

```typescript
// In Arena agent loop
setInterval(async () => {
  if (hasOpenPosition) {
    await arenaTradeLogger.updatePosition({
      agentId: 'alphax',
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: 97000,
      currentPrice: getCurrentPrice(), // Get live price
      entryTime: positionEntryTime,
      strategy: 'Momentum Surge V2',
      confidence: 78,
      unrealizedPnlPercent: calculatePnL(),
      unrealizedPnlUsd: calculatePnLUsd()
    })
  }
}, 60000) // Every 60 seconds
```

---

## Step 4: Verify Marketing API Returns Real Data

Once trades are being logged, test the marketing API:

```bash
curl -s 'https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=all' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZHppeWRzcGVld21jZXhxaWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDc3MzIsImV4cCI6MjA2OTQyMzczMn0.cn4UuIO1zg-vtNZbHuVhTHK0fuZIIGFhNzz4hwkdwvg' \
  -H 'x-api-key: [YOUR_MARKETING_API_KEY]'
```

**Before (Empty Data):**
```json
{
  "daily": {
    "totalTrades": 0,
    "winRate": 0,
    "totalPnL": 0
  }
}
```

**After (Real Data):**
```json
{
  "daily": {
    "totalTrades": 47,
    "winRate": 68.1,
    "totalPnL": 4.23,
    "bestAgent": {"name": "GammaX", "pnl": 2.1},
    "topTrades": [
      {"agent": "AlphaX", "symbol": "BTCUSDT", "pnl": 3.47}
    ]
  }
}
```

---

## Step 5: Enable Make.com Scenarios

Once data is flowing, your Make.com scenarios will automatically start generating real tweets:

1. Go to [Make.com Dashboard](https://www.make.com/en/scenarios)
2. Enable all 5 scenarios:
   - ✅ Daily Performance
   - ✅ Live Trade Alert
   - ✅ Social Proof
   - ✅ Oracle Challenge
   - ✅ Alpha Leak

3. Monitor Buffer queue: [buffer.com/app/queue](https://buffer.com/app/queue)

---

## Marketing Strategy with Real Data

### When to Post Automatically

**Immediate FOMO Posts** (via webhook or high-frequency polling):
- Any trade closes with >2% profit → instant "Missed Alpha" tweet
- Agent hits 3+ win streak → hot streak tweet
- Any trade closes with >5% profit → big win celebration

**Scheduled Daily Posts**:
- 7 AM UTC: Daily recap with yesterday's performance
- 5 PM UTC: Daily recap with today's performance so far

**Weekly Posts**:
- Sunday 6 PM UTC: Weekly summary thread

### What to Show vs Hide

**Always Show:**
- ✅ Winning trades or sessions with >55% win rate
- ✅ Specific P&L numbers (builds trust)
- ✅ Agent names and strategies used
- ✅ Win streaks and hot performances

**Hide or Filter:**
- ❌ Individual losing trades (show win rate instead)
- ❌ Sessions below 55% win rate (skip those posts)
- ❌ Trades below 0.5% profit (too small for marketing)

---

## Troubleshooting

### Issue: Tables not created

**Solution:** Run SQL manually in Supabase dashboard (Step 1, Option A)

### Issue: Edge function deployment fails

```bash
# Check Supabase CLI is logged in
supabase login

# Check project linked
supabase link --project-ref vidziydspeewmcexqicg

# Retry deployment
supabase functions deploy arena-trade-logger
```

### Issue: Marketing API still returns zeros

**Check:**
1. Are trades being logged? Query `arena_trade_history` table
2. Are timestamps within the last 7 days? (marketing-stats filters by date)
3. Is trade data valid? Check for NULL values in critical fields

```sql
-- Debug query
SELECT
  COUNT(*) as total_trades,
  COUNT(*) FILTER (WHERE is_win = true) as wins,
  SUM(pnl_percent) as total_pnl,
  MIN(timestamp) as oldest_trade,
  MAX(timestamp) as newest_trade
FROM arena_trade_history;
```

### Issue: No trades being logged from Arena

**Check:**
1. Is `arenaTradeLogger` imported in Arena agent files?
2. Are logging calls actually executing? Add console.logs
3. Check browser console for errors
4. Verify Supabase client is initialized

---

## Success Criteria

✅ **Database:** All 3 tables exist with proper indexes
✅ **Edge Function:** `arena-trade-logger` deployed and responding
✅ **Client Integration:** Arena agents logging trades on open/close
✅ **Marketing API:** Returns real data (non-zero numbers)
✅ **Make.com:** Scenarios generating tweets with actual performance data
✅ **Buffer:** Queue filling with data-driven tweets
✅ **Twitter:** Posts going live with real Arena results

---

## Next Steps After Deployment

1. **Monitor First 24 Hours:**
   - Check `arena_trade_history` table grows
   - Verify marketing-stats API updates
   - Watch Buffer queue populate
   - Confirm tweets posting to Twitter

2. **Optimize Marketing Timing:**
   - Track which post times get best engagement
   - A/B test immediate vs delayed FOMO posts
   - Adjust frequency based on trade volume

3. **Expand Tracking:**
   - Add more agent metrics (drawdown, Sharpe ratio)
   - Track strategy-specific win rates
   - Add trade duration analytics

---

## Files Created

- [`supabase/migrations/20250102_arena_marketing_tables.sql`](supabase/migrations/20250102_arena_marketing_tables.sql) - Database schema
- [`supabase/functions/arena-trade-logger/index.ts`](supabase/functions/arena-trade-logger/index.ts) - Trade logging API
- [`src/services/arenaTradeLogger.ts`](src/services/arenaTradeLogger.ts) - Client-side logging service
- [`ARENA_MARKETING_DEPLOYMENT.md`](ARENA_MARKETING_DEPLOYMENT.md) - This guide

---

## Quick Reference: Agent IDs

| Agent | ID String | Use in Code |
|-------|-----------|-------------|
| AlphaX | `'alphax'` | Aggressive momentum trader |
| BetaX | `'betax'` | Balanced strategy trader |
| GammaX | `'gammax'` | Conservative swing trader |

**Marketing Positioning:**
- AlphaX: "The aggressive profit hunter"
- BetaX: "The balanced strategist"
- GammaX: "The risk manager"

---

Ready to deploy? Start with **Step 1: Create Database Tables**
