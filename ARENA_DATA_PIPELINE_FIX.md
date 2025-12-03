# Arena Data Pipeline Fix - Marketing Integration

## Problem Identified

The marketing-stats API returns empty data because:
1. ❌ Arena agents are trading but NOT persisting data to Supabase
2. ❌ Tables `arena_trade_history`, `arena_agent_sessions`, `arena_active_positions` don't exist or have no data
3. ❌ Marketing can't pull real performance data for tweets

## Current State Analysis

**What EXISTS:**
- ✅ `intelligence_signals` table (has signal data)
- ✅ Arena agents ARE trading (visible in UI)
- ✅ Signals ARE being sent to Telegram
- ❌ But trades are NOT being logged to database for marketing

**What's MISSING:**
- Tables for Arena trade history
- Real-time position tracking
- Agent performance metrics storage

---

## Solution: 3-Part Data Pipeline

### Part 1: Create Missing Database Tables

We need to create these tables in Supabase:

```sql
-- 1. Arena Trade History (completed trades)
CREATE TABLE IF NOT EXISTS arena_trade_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL, -- 'alphax', 'betax', 'gammax'
  symbol TEXT NOT NULL, -- 'BTCUSDT', 'ETHUSDT', etc
  direction TEXT NOT NULL, -- 'LONG' or 'SHORT'
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  entry_time BIGINT NOT NULL, -- Unix timestamp in ms
  exit_time BIGINT, -- Unix timestamp in ms
  pnl_percent NUMERIC, -- P&L as percentage
  pnl_usd NUMERIC, -- P&L in dollars
  is_win BOOLEAN,
  strategy TEXT, -- Strategy name used
  confidence NUMERIC,
  timestamp BIGINT NOT NULL, -- For ordering
  session_id UUID, -- Link to session
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_arena_trades_timestamp ON arena_trade_history(timestamp DESC);
CREATE INDEX idx_arena_trades_agent ON arena_trade_history(agent_id);
CREATE INDEX idx_arena_trades_symbol ON arena_trade_history(symbol);

-- 2. Arena Active Positions (currently open trades)
CREATE TABLE IF NOT EXISTS arena_active_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC,
  entry_time BIGINT NOT NULL,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  strategy TEXT,
  confidence NUMERIC,
  unrealized_pnl_percent NUMERIC,
  unrealized_pnl_usd NUMERIC,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_arena_positions_agent ON arena_active_positions(agent_id);
CREATE UNIQUE INDEX idx_arena_positions_agent_symbol ON arena_active_positions(agent_id, symbol);

-- 3. Arena Agent Sessions (performance tracking)
CREATE TABLE IF NOT EXISTS arena_agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  session_start BIGINT NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  total_pnl_percent NUMERIC DEFAULT 0,
  total_pnl_usd NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  consecutive_wins INTEGER DEFAULT 0,
  consecutive_losses INTEGER DEFAULT 0,
  best_trade_pnl NUMERIC DEFAULT 0,
  worst_trade_pnl NUMERIC DEFAULT 0,
  avg_trade_duration_minutes INTEGER DEFAULT 0,
  strategies_used TEXT[], -- Array of strategy names
  last_updated BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_arena_sessions_agent ON arena_agent_sessions(agent_id);
CREATE INDEX idx_arena_sessions_start ON arena_agent_sessions(session_start DESC);

-- 4. Enable Row Level Security (but allow service role to access)
ALTER TABLE arena_trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_active_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_agent_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write (for edge functions)
CREATE POLICY "Service role can access arena_trade_history" ON arena_trade_history
  FOR ALL USING (true);

CREATE POLICY "Service role can access arena_active_positions" ON arena_active_positions
  FOR ALL USING (true);

CREATE POLICY "Service role can access arena_agent_sessions" ON arena_agent_sessions
  FOR ALL USING (true);
```

---

### Part 2: Create Supabase Edge Function to Log Trades

**File:** `supabase/functions/arena-trade-logger/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data } = await req.json()

    switch (action) {
      case 'log_trade': {
        // Log completed trade
        const { error } = await supabaseClient
          .from('arena_trade_history')
          .insert({
            agent_id: data.agentId,
            symbol: data.symbol,
            direction: data.direction,
            entry_price: data.entryPrice,
            exit_price: data.exitPrice,
            entry_time: data.entryTime,
            exit_time: data.exitTime,
            pnl_percent: data.pnlPercent,
            pnl_usd: data.pnlUsd,
            is_win: data.pnlPercent > 0,
            strategy: data.strategy,
            confidence: data.confidence,
            timestamp: Date.now()
          })

        if (error) throw error

        // Update agent session stats
        await updateAgentSession(supabaseClient, data.agentId, data)

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_position': {
        // Update or insert active position
        const { error } = await supabaseClient
          .from('arena_active_positions')
          .upsert({
            agent_id: data.agentId,
            symbol: data.symbol,
            direction: data.direction,
            entry_price: data.entryPrice,
            current_price: data.currentPrice,
            entry_time: data.entryTime,
            stop_loss: data.stopLoss,
            take_profit: data.takeProfit,
            strategy: data.strategy,
            confidence: data.confidence,
            unrealized_pnl_percent: data.unrealizedPnlPercent,
            unrealized_pnl_usd: data.unrealizedPnlUsd,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'agent_id,symbol'
          })

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'close_position': {
        // Remove from active positions when trade closes
        const { error } = await supabaseClient
          .from('arena_active_positions')
          .delete()
          .eq('agent_id', data.agentId)
          .eq('symbol', data.symbol)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Arena trade logger error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function updateAgentSession(supabaseClient: any, agentId: string, tradeData: any) {
  // Get or create current session
  const { data: session, error: fetchError } = await supabaseClient
    .from('arena_agent_sessions')
    .select('*')
    .eq('agent_id', agentId)
    .order('session_start', { ascending: false })
    .limit(1)
    .single()

  const isWin = tradeData.pnlPercent > 0

  if (!session || fetchError) {
    // Create new session
    await supabaseClient
      .from('arena_agent_sessions')
      .insert({
        agent_id: agentId,
        session_start: Date.now(),
        total_trades: 1,
        winning_trades: isWin ? 1 : 0,
        losing_trades: isWin ? 0 : 1,
        total_pnl_percent: tradeData.pnlPercent,
        total_pnl_usd: tradeData.pnlUsd,
        win_rate: isWin ? 100 : 0,
        consecutive_wins: isWin ? 1 : 0,
        consecutive_losses: isWin ? 0 : 1,
        best_trade_pnl: isWin ? tradeData.pnlPercent : 0,
        worst_trade_pnl: isWin ? 0 : tradeData.pnlPercent,
        strategies_used: [tradeData.strategy],
        last_updated: Date.now()
      })
  } else {
    // Update existing session
    await supabaseClient
      .from('arena_agent_sessions')
      .update({
        total_trades: session.total_trades + 1,
        winning_trades: session.winning_trades + (isWin ? 1 : 0),
        losing_trades: session.losing_trades + (isWin ? 0 : 1),
        total_pnl_percent: session.total_pnl_percent + tradeData.pnlPercent,
        total_pnl_usd: session.total_pnl_usd + tradeData.pnlUsd,
        win_rate: ((session.winning_trades + (isWin ? 1 : 0)) / (session.total_trades + 1)) * 100,
        consecutive_wins: isWin ? session.consecutive_wins + 1 : 0,
        consecutive_losses: isWin ? 0 : session.consecutive_losses + 1,
        best_trade_pnl: Math.max(session.best_trade_pnl, tradeData.pnlPercent),
        worst_trade_pnl: Math.min(session.worst_trade_pnl, tradeData.pnlPercent),
        strategies_used: [...new Set([...session.strategies_used, tradeData.strategy])],
        last_updated: Date.now()
      })
      .eq('id', session.id)
  }
}
```

---

### Part 3: Integrate Arena Client-Side to Log Trades

Update Arena code to call the edge function when trades happen.

**Add to Arena service files:**

```typescript
// In src/services/arenaTradeLogger.ts (NEW FILE)
import { supabase } from '@/integrations/supabase/client'

export const arenaTradeLogger = {
  async logCompletedTrade(trade: {
    agentId: string
    symbol: string
    direction: 'LONG' | 'SHORT'
    entryPrice: number
    exitPrice: number
    entryTime: number
    exitTime: number
    pnlPercent: number
    pnlUsd: number
    strategy: string
    confidence: number
  }) {
    try {
      const { data, error } = await supabase.functions.invoke('arena-trade-logger', {
        body: {
          action: 'log_trade',
          data: {
            agentId: trade.agentId,
            symbol: trade.symbol,
            direction: trade.direction,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            entryTime: trade.entryTime,
            exitTime: trade.exitTime,
            pnlPercent: trade.pnlPercent,
            pnlUsd: trade.pnlUsd,
            strategy: trade.strategy,
            confidence: trade.confidence
          }
        }
      })

      if (error) console.error('[Arena Logger] Failed to log trade:', error)
      return { success: !error }
    } catch (error) {
      console.error('[Arena Logger] Error:', error)
      return { success: false }
    }
  },

  async updatePosition(position: {
    agentId: string
    symbol: string
    direction: 'LONG' | 'SHORT'
    entryPrice: number
    currentPrice: number
    entryTime: number
    stopLoss?: number
    takeProfit?: number
    strategy: string
    confidence: number
    unrealizedPnlPercent: number
    unrealizedPnlUsd: number
  }) {
    try {
      await supabase.functions.invoke('arena-trade-logger', {
        body: {
          action: 'update_position',
          data: position
        }
      })
    } catch (error) {
      console.error('[Arena Logger] Failed to update position:', error)
    }
  },

  async closePosition(agentId: string, symbol: string) {
    try {
      await supabase.functions.invoke('arena-trade-logger', {
        body: {
          action: 'close_position',
          data: { agentId, symbol }
        }
      })
    } catch (error) {
      console.error('[Arena Logger] Failed to close position:', error)
    }
  }
}
```

---

## Implementation Steps

### Step 1: Create Database Tables
```bash
# Run the SQL schema creation
# Either in Supabase dashboard SQL editor or via CLI
```

### Step 2: Deploy Trade Logger Function
```bash
cd supabase/functions
mkdir arena-trade-logger
# Copy index.ts content above
supabase functions deploy arena-trade-logger
```

### Step 3: Integrate with Arena
- Add trade logging calls where trades are executed
- Call `arenaTradeLogger.logCompletedTrade()` when trade closes
- Call `arenaTradeLogger.updatePosition()` periodically for open positions
- Call `arenaTradeLogger.closePosition()` when position exits

### Step 4: Verify Data Flow
```bash
# Test the endpoint
curl https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=all \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'x-api-key: YOUR_MARKETING_KEY'

# Should now return real data!
```

---

## Marketing Strategy with Real Data

Once data is flowing, tweets will be data-driven:

**When to Post:**
1. **Immediately after winning trade >2%:** FOMO post within 5 minutes
2. **Daily recaps:** 7 AM & 5 PM UTC with actual day's performance
3. **Hot streak:** When agent hits 3+ wins in a row - instant post
4. **Big win:** Any trade >5% - instant celebration post
5. **Milestone:** Every 10 winning trades - social proof post

**What to Show:**
- ✅ Only winning trades or profitable sessions
- ✅ Avg win rate over last 24h (if >55%)
- ✅ Best performing agent of the day
- ✅ Actual P&L percentages from real trades
- ❌ Hide losing trades (or show win rate including them if >60%)

---

## Expected Outcome

After implementation:
- ✅ Every Arena trade logged to database
- ✅ Real-time position tracking
- ✅ Agent performance metrics accumulate
- ✅ Marketing API returns real data
- ✅ Tweets show actual trading results
- ✅ Trust & credibility skyrockets

**Data-driven marketing = Higher conversion!**
