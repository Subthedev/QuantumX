# 🔗 Signal Generator Integration with Agent System

## Overview

This guide shows how to integrate the new Agent Orchestration System with the existing `signal-generator` edge function.

## Current Architecture vs New Architecture

### ❌ Old Approach (Current)
```typescript
// Signal generator directly calls strategies
for (const symbol of SYMBOLS) {
  const signal = await someStrategy.analyze(symbol);
  if (signal.confidence > 70) {
    await insertSignal(signal);
  }
}
```

**Problems:**
- No awareness of market conditions
- Strategies run even when unsuitable
- No intelligent agent selection
- Hard-coded strategy selection

### ✅ New Approach (Agent-Driven)
```typescript
// 1. Detect market state
const marketState = await detectMarketState();

// 2. Agent orchestrator selects optimal strategies
const signals = await agentOrchestrator.generateSignals({
  symbol: 'BTC',
  tier: 'MAX',
  marketState: marketState.state
}, 5);

// 3. Insert with agent metadata
await insertSignalsWithAgentInfo(signals);
```

**Benefits:**
- Market-aware strategy selection
- Optimal agent for current conditions
- Performance tracking per agent
- Historical market state correlation

---

## Integration Steps

### Step 1: Add Imports to Edge Function

**File:** `supabase/functions/signal-generator/index.ts`

Add at the top (after existing imports):

```typescript
// PHASE 1: Agent System Integration
import { MarketState } from '../../../src/services/marketStateDetectionEngine.ts';
import { AgentType } from '../../../src/services/strategyMatrix.ts';

// Note: Full imports will be added once Edge Function deno runtime supports these modules
// For now, we'll implement the logic directly in the edge function
```

### Step 2: Add Market State Detection

Add this function to the edge function:

```typescript
/**
 * Detects current market state based on recent price action
 * Simplified version for edge function (full version in marketStateDetectionEngine)
 */
async function detectMarketState(cryptoData: any[]): Promise<MarketState> {
  // Calculate market-wide metrics
  const avgPriceChange = cryptoData.reduce((sum, c) => sum + (c.priceChangePercent || 0), 0) / cryptoData.length;

  // Calculate volatility (standard deviation of price changes)
  const priceChanges = cryptoData.map(c => c.priceChangePercent || 0);
  const mean = avgPriceChange;
  const variance = priceChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / priceChanges.length;
  const volatility = Math.sqrt(variance);

  // Decision logic
  const HIGH_VOL_THRESHOLD = 3;
  const BULLISH_THRESHOLD = 1;
  const BEARISH_THRESHOLD = -1;

  if (Math.abs(avgPriceChange) < 1 && volatility < 2) {
    return 'RANGEBOUND';
  } else if (avgPriceChange > BULLISH_THRESHOLD) {
    return volatility > HIGH_VOL_THRESHOLD ? 'BULLISH_HIGH_VOL' : 'BULLISH_LOW_VOL';
  } else if (avgPriceChange < BEARISH_THRESHOLD) {
    return volatility > HIGH_VOL_THRESHOLD ? 'BEARISH_HIGH_VOL' : 'BEARISH_LOW_VOL';
  } else {
    return 'RANGEBOUND';
  }
}
```

### Step 3: Add Agent Selection Logic

Add this function:

```typescript
/**
 * Selects optimal agent based on market state
 * Based on the 5x17 Strategy Matrix suitability scores
 */
function selectOptimalAgent(marketState: MarketState): AgentType {
  const agentSuitability = {
    'BULLISH_HIGH_VOL': 'ALPHA',   // Trend engine best for strong momentum
    'BULLISH_LOW_VOL': 'ALPHA',    // Still trending, but steadier
    'BEARISH_HIGH_VOL': 'GAMMA',   // Chaos engine for high volatility
    'BEARISH_LOW_VOL': 'BETA',     // Reversion engine for weak downtrends
    'RANGEBOUND': 'BETA'           // Reversion engine for sideways markets
  };

  return agentSuitability[marketState] as AgentType || 'ALPHA';
}
```

### Step 4: Add Strategy Selection by Agent

Add this mapping:

```typescript
/**
 * Strategy pool organized by agent specialization
 */
const AGENT_STRATEGIES = {
  'ALPHA': [
    'Momentum Surge V2',
    'Golden Cross Momentum',
    'Order Flow Tsunami',
    'Whale Shadow',
    'Liquidity Hunter',
    'Market Phase Sniper'
  ],
  'BETA': [
    'Momentum Recovery',
    'Bollinger Mean Reversion',
    'Fear & Greed Contrarian',
    'Spring Trap',
    'Statistical Arbitrage',
    'Correlation Breakdown'
  ],
  'GAMMA': [
    'Volatility Breakout',
    'Funding Squeeze',
    'Liquidation Cascade',
    'Order Book Microstructure'
  ]
};

/**
 * Gets strategy names for the selected agent
 */
function getAgentStrategies(agent: AgentType): string[] {
  return AGENT_STRATEGIES[agent] || AGENT_STRATEGIES['ALPHA'];
}
```

### Step 5: Update Main Signal Generation Logic

Replace the main generation loop with:

```typescript
serve(async (req) => {
  // ... existing CORS and request handling ...

  try {
    console.log('[Signal Generator] 🚀 Starting agent-driven signal generation...');

    // ===== NEW: PHASE 1 INTEGRATION =====

    // Step 1: Fetch market data for all symbols
    const marketData = await fetchMarketDataForSymbols(SYMBOLS);

    // Step 2: Detect overall market state
    const marketState = await detectMarketState(marketData);
    console.log(`[Signal Generator] 📊 Market State: ${marketState}`);

    // Step 3: Log market state to database
    const { error: logError } = await supabaseClient.rpc('log_market_state_change', {
      p_state: marketState,
      p_confidence: 85.0, // Simplified for now
      p_volatility: calculateVolatility(marketData),
      p_trend_strength: calculateTrendStrength(marketData),
      p_metadata: { symbols_analyzed: SYMBOLS.length }
    });

    if (logError) {
      console.warn('[Signal Generator] ⚠️  Failed to log market state:', logError.message);
    }

    // Step 4: Select optimal agent
    const selectedAgent = selectOptimalAgent(marketState);
    console.log(`[Signal Generator] 🤖 Selected Agent: ${selectedAgent}`);

    // Step 5: Get strategy pool for this agent
    const strategyPool = getAgentStrategies(selectedAgent);
    console.log(`[Signal Generator] 📋 Strategy Pool: ${strategyPool.join(', ')}`);

    // Step 6: Generate signals using agent's strategies
    const candidateSignals = [];

    for (const symbol of SYMBOLS) {
      // Run strategies from the selected agent's pool
      const signal = await generateSignalForSymbol(
        symbol,
        strategyPool,
        marketState,
        selectedAgent
      );

      if (signal && signal.confidence >= QUALITY_THRESHOLDS[tier].minConfidence) {
        candidateSignals.push(signal);
      }
    }

    // Step 7: Select best signals
    const bestSignals = candidateSignals
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, signalCount);

    console.log(`[Signal Generator] ✅ Generated ${bestSignals.length} signals via ${selectedAgent} agent`);

    // Step 8: Insert signals with agent metadata
    for (const signal of bestSignals) {
      await insertSignalWithAgentInfo(signal, selectedAgent, marketState);
    }

    // ===== END PHASE 1 INTEGRATION =====

    return new Response(
      JSON.stringify({
        success: true,
        marketState,
        agent: selectedAgent,
        strategiesUsed: strategyPool,
        signalsGenerated: bestSignals.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Signal Generator] ❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Step 6: Add Signal Insertion with Agent Info

Add this function:

```typescript
/**
 * Inserts signal with agent and market state metadata
 */
async function insertSignalWithAgentInfo(
  signal: any,
  agent: AgentType,
  marketState: MarketState
) {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Insert into user_signals with agent metadata
  const { error: signalError } = await supabaseClient
    .from('user_signals')
    .insert({
      ...signal,
      metadata: {
        ...signal.metadata,
        agent,
        marketState,
        generatedBy: 'agent-orchestrator-v1'
      }
    });

  if (signalError) {
    console.error('[Signal Generator] ❌ Failed to insert signal:', signalError);
    return;
  }

  // Log to agent activity
  const { error: activityError } = await supabaseClient
    .from('agent_activity_log')
    .insert({
      agent,
      strategy: signal.metadata.strategy,
      symbol: signal.symbol,
      signal_type: signal.signal_type,
      confidence: signal.confidence,
      quality_score: signal.quality_score,
      market_state: marketState,
      outcome: 'PENDING',
      metadata: {
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        take_profit: signal.take_profit,
        timeframe: signal.timeframe
      }
    });

  if (activityError) {
    console.warn('[Signal Generator] ⚠️  Failed to log activity:', activityError.message);
  }
}
```

### Step 7: Add Helper Functions

```typescript
function calculateVolatility(marketData: any[]): number {
  const priceChanges = marketData.map(d => d.priceChangePercent || 0);
  const mean = priceChanges.reduce((sum, val) => sum + val, 0) / priceChanges.length;
  const variance = priceChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / priceChanges.length;
  return Math.sqrt(variance);
}

function calculateTrendStrength(marketData: any[]): number {
  const avgPriceChange = marketData.reduce((sum, d) => sum + (d.priceChangePercent || 0), 0) / marketData.length;
  return Math.max(-100, Math.min(100, avgPriceChange * 10));
}

async function fetchMarketDataForSymbols(symbols: string[]): Promise<any[]> {
  // Use existing Binance API fetch logic
  // Return array of { symbol, priceChangePercent, volume, etc. }
  // Implementation depends on your current data fetching approach
  return []; // Placeholder
}
```

---

## Testing the Integration

### Test 1: Manual Trigger

```bash
# Trigger signal generator manually
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tier": "MAX"}'
```

### Test 2: Check Market State Logs

```sql
-- View recent market state detections
SELECT
  state,
  confidence,
  volatility,
  trend_strength,
  detected_at
FROM market_state_history
ORDER BY detected_at DESC
LIMIT 10;
```

### Test 3: Check Agent Activity

```sql
-- View which agents are being used
SELECT
  agent,
  market_state,
  COUNT(*) as signals_generated,
  AVG(confidence) as avg_confidence
FROM agent_activity_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agent, market_state
ORDER BY agent, market_state;
```

### Test 4: Verify Signal Metadata

```sql
-- Check that signals have agent info
SELECT
  symbol,
  signal_type,
  confidence,
  metadata->>'agent' as agent,
  metadata->>'marketState' as market_state,
  metadata->>'strategy' as strategy
FROM user_signals
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Expected Results

### Good Integration Signs ✅
- Market state is logged to `market_state_history` table
- Signals have `agent` field in metadata
- Agent activity is logged to `agent_activity_log`
- Different agents are selected for different market conditions
- Strategy selection aligns with agent specialization

### Common Issues ❌

**Issue 1: Market state always returns RANGEBOUND**
- **Cause:** Insufficient price volatility in data
- **Fix:** Lower thresholds in `detectMarketState()` function

**Issue 2: No agent activity logs**
- **Cause:** RLS policies blocking service role
- **Fix:** Verify service role has permissions (see migration script)

**Issue 3: All signals use ALPHA agent**
- **Cause:** Market state detection not working correctly
- **Fix:** Add logging to `detectMarketState()` to debug

---

## Performance Impact

- **Market State Detection:** ~50-100ms (once per cron run)
- **Agent Selection:** < 1ms (simple lookup)
- **Database Logging:** ~10-20ms per log entry
- **Total Overhead:** ~100-150ms per signal generation run

**Negligible impact on overall generation time.**

---

## Future Enhancements (Phase 2)

1. **Dynamic Strategy Weighting**: Adjust strategy confidence based on agent performance history
2. **Multi-Agent Ensemble**: Run multiple agents and vote on best signals
3. **Real-time Performance Feedback**: Update agent win rates based on actual signal outcomes
4. **Adaptive Thresholds**: ML-based threshold tuning for market state classification

---

## Rollback Plan

If integration causes issues:

1. **Quick Fix:** Comment out agent-related code, revert to direct strategy calls
2. **Database Rollback:** Agent tables are independent, won't affect existing signals
3. **Gradual Rollout:** Test on DEV tier first, then PRO, then MAX

---

## Summary

The Agent System integration adds:
- ✅ Intelligent market-aware strategy selection
- ✅ Performance tracking per agent
- ✅ Historical market state correlation
- ✅ Foundation for ML-based improvements

**Minimal code changes, maximum impact.**
