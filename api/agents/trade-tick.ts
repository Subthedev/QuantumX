/**
 * QuantumX 24/7 Trading Worker — Vercel Cron
 *
 * Runs every minute via Vercel Cron. One execution = one trading tick:
 *   1. Fetch live prices via CoinGecko (Binance blocks AWS IP ranges)
 *   2. Load autonomous brain singleton from Supabase
 *   3. For each open position: check TP / SL / TIMEOUT via shared core
 *   4. For each agent without a position: call decideTrade() from src/core
 *   5. Persist results to Supabase
 *
 * Phase 1.B refactor: all decision logic now lives in src/core/tradeDecision.ts
 * and is shared with the browser engine. This file is now a thin I/O shell:
 *   - fetch prices from CoinGecko
 *   - read state from Supabase (sessions, positions, autonomous_state)
 *   - delegate the decision to decideTrade()
 *   - delegate close detection to manageOpenPosition()
 *   - persist results
 *
 * Authentication: Vercel sends `Authorization: Bearer ${CRON_SECRET}` for cron
 * invocations. Manual triggers can use the same header.
 *
 * Route: GET /api/agents/trade-tick
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import {
  decideTrade,
  manageOpenPosition,
  applyCloseToSession,
  computePnL,
  detectMarketStateFromPrices,
  DEFAULT_TRADING_PAIRS,
  DEFAULT_AGENTS,
  RISK_LIMITS,
  type PriceData,
  type SessionState,
  type AutonomousBrain,
  type OpenPositionState,
  type OpenPositionDecision,
} from '../../src/core/tradeDecision';
import { detectRegimeFromCoins, type CoinSnapshot, type RegimeAnalysis } from '../../src/core/regimeDetector';
import {
  hydrateBrain,
  serializeBrain,
  applyOutcome,
  applyRegimeChange,
  type BrainState,
  type AdaptiveDecision,
} from '../../src/core/orchestratorCore';
import { MarketState } from '../../src/core/marketState';
import {
  buildIntelContext,
  evaluateIntel,
  trainOnClose,
  defaultWeights,
  type IntelContext,
  type StrategyPerformance,
  type MLWeights,
} from '../lib/intel';

// CoinGecko id mapping for the default pairs
const COINGECKO_IDS: Record<string, string> = {
  BTCUSDT: 'bitcoin',
  ETHUSDT: 'ethereum',
  SOLUSDT: 'solana',
  BNBUSDT: 'binancecoin',
  XRPUSDT: 'ripple',
  DOGEUSDT: 'dogecoin',
};

// ─── Supabase ─────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL
    ?? process.env.SUPABASE_URL
    ?? 'https://vidziydspeewmcexqicg.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Price feed ───────────────────────────────────────────────────────────────

async function fetchPrices(): Promise<Map<string, PriceData>> {
  const map = new Map<string, PriceData>();
  const ids = DEFAULT_TRADING_PAIRS.map(p => COINGECKO_IDS[p.symbol]).filter(Boolean).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'accept': 'application/json' } });
    clearTimeout(timeout);
    if (!r.ok) {
      console.error(`[trade-tick] CoinGecko HTTP ${r.status}`);
      return map;
    }
    const arr: Array<{
      id: string;
      current_price: number;
      high_24h: number;
      low_24h: number;
      total_volume: number;
      price_change_percentage_24h: number;
    }> = await r.json();

    const idToSymbol = new Map(Object.entries(COINGECKO_IDS).map(([sym, id]) => [id, sym]));
    for (const row of arr) {
      const symbol = idToSymbol.get(row.id);
      if (!symbol) continue;
      map.set(symbol, {
        symbol,
        price: row.current_price,
        change24h: row.price_change_percentage_24h ?? 0,
        high24h: row.high_24h ?? row.current_price,
        low24h: row.low_24h ?? row.current_price,
        volume: row.total_volume ?? 0,
      });
    }
  } catch (err: any) {
    clearTimeout(timeout);
    console.error('[trade-tick] CoinGecko fetch failed:', err?.message);
  }
  return map;
}

// ─── Top-N market data for regime detection ──────────────────────────────────
// Pulls top-50 by market cap from CoinGecko in a single call. Used by
// detectRegimeFromCoins() — same algorithm as the browser's
// marketStateDetectionEngine but pure and runtime-agnostic.
async function fetchTopCoinsForRegime(): Promise<CoinSnapshot[]> {
  const url = 'https://api.coingecko.com/api/v3/coins/markets'
    + '?vs_currency=usd&order=market_cap_desc&per_page=50&page=1'
    + '&price_change_percentage=24h,7d';
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'accept': 'application/json' } });
    clearTimeout(timeout);
    if (!r.ok) {
      console.warn(`[trade-tick] top-50 fetch HTTP ${r.status} — falling back to BTC-only regime`);
      return [];
    }
    const arr = (await r.json()) as Array<any>;
    return arr.map(c => ({
      symbol: String(c.symbol ?? '').toUpperCase(),
      current_price: Number(c.current_price ?? 0),
      high_24h: Number(c.high_24h ?? c.current_price ?? 0),
      low_24h: Number(c.low_24h ?? c.current_price ?? 0),
      total_volume: Number(c.total_volume ?? 0),
      market_cap: Number(c.market_cap ?? 0),
      price_change_percentage_24h: Number(c.price_change_percentage_24h ?? 0),
      market_cap_change_percentage_24h: Number(c.market_cap_change_percentage_24h ?? 0),
      price_change_percentage_7d_in_currency: Number(c.price_change_percentage_7d_in_currency ?? 0),
    }));
  } catch (err: any) {
    clearTimeout(timeout);
    console.warn('[trade-tick] top-50 fetch failed:', err?.message);
    return [];
  }
}

async function loadPreviousRegime(supabase: any): Promise<MarketState | null> {
  try {
    const { data, error } = await supabase
      .from('arena_market_state')
      .select('state')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.state) return null;
    return data.state as MarketState;
  } catch {
    return null;
  }
}

async function writeMarketState(supabase: any, analysis: RegimeAnalysis): Promise<void> {
  // Single-row table by convention (we only ever look at the latest row).
  // Upsert on a stable id so we don't bloat the table; older row is overwritten.
  const { error } = await supabase
    .from('arena_market_state')
    .upsert({
      id: '00000000-0000-0000-0000-000000000001',
      state: analysis.state,
      confidence: analysis.confidence,
      volatility: analysis.volatility,
      trend_strength: analysis.trendStrength,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) {
    console.warn('[trade-tick] arena_market_state upsert failed:', error.message);
  }
}

// ─── Autonomous brain (read-only from cron) ──────────────────────────────────

const DEFAULT_BRAIN: AutonomousBrain = {
  positionSizeMultiplier: 1.0,
  signalFrequencyMultiplier: 1.0,
  regimeTransitionPenalty: 1.0,
  strategyBias: {},
  blacklistedStrategies: [],
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

async function loadAutonomousBrain(supabase: any): Promise<{
  brain: AutonomousBrain;
  brainState: BrainState;        // structured form for orchestratorCore
  persistedIntel: { strategyPerformance?: StrategyPerformance; mlWeights?: MLWeights } | null;
  decisions: AdaptiveDecision[];
  rawState: any;
}> {
  try {
    const { data, error } = await supabase
      .from('autonomous_state')
      .select('state, decisions')
      .eq('id', 'singleton')
      .single();
    if (error || !data?.state) {
      return {
        brain: DEFAULT_BRAIN,
        brainState: hydrateBrain(null),
        persistedIntel: null,
        decisions: [],
        rawState: {},
      };
    }
    const s = data.state;
    // hydrateBrain maps the same keys as the legacy autonomousOrchestrator
    // serialize() shape, so the existing autonomous_state row works as-is.
    const brainState = hydrateBrain({ state: s, decisions: data.decisions ?? [] });
    return {
      brain: {
        positionSizeMultiplier: brainState.positionSizeMultiplier,
        signalFrequencyMultiplier: brainState.signalFrequencyMultiplier,
        regimeTransitionPenalty: brainState.regimeTransitionPenalty,
        strategyBias: { ...brainState.strategyBias },
        blacklistedStrategies: [...brainState.blacklistedStrategies],
      },
      brainState,
      persistedIntel: s.intel ?? null,
      decisions: Array.isArray(data.decisions) ? data.decisions : [],
      rawState: s,
    };
  } catch {
    return {
      brain: DEFAULT_BRAIN,
      brainState: hydrateBrain(null),
      persistedIntel: null,
      decisions: [],
      rawState: {},
    };
  }
}

async function persistIntel(
  supabase: any,
  rawState: any,
  intel: IntelContext,
  brainState: BrainState,
  decisions: AdaptiveDecision[],
): Promise<void> {
  // Trim strategyPerformance to keep JSONB lean — drop cells with no activity in 7d
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const trimmedPerf: StrategyPerformance = {};
  for (const [k, v] of Object.entries(intel.strategyPerformance)) {
    if (v.lastUpdate >= cutoff || v.wins + v.losses >= 10) trimmedPerf[k] = v;
  }

  // Serialize the brain in the same shape as autonomousOrchestrator.serialize()
  // so the browser shell continues to read these fields without changes.
  const brainSerialized = serializeBrain(brainState, decisions);

  const newState = {
    // Preserve any unrelated keys we don't manage
    ...rawState,
    // Top-level brain fields — mirror legacy autonomousOrchestrator schema
    ...brainSerialized.state,
    // Nested intel substate (sentiment-driven ML + per-strategy EWMA)
    intel: {
      strategyPerformance: trimmedPerf,
      mlWeights: intel.mlWeights,
      lastUpdate: Date.now(),
    },
  };
  const { error } = await supabase
    .from('autonomous_state')
    .upsert({
      id: 'singleton',
      state: newState,
      decisions: brainSerialized.decisions,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) console.error('[trade-tick] persistIntel failed:', error.message);
}

/**
 * Once per ~6 hours, prune arena_trade_history rows older than 30 days. Keeps
 * Supabase free-tier storage under the 500MB cap. Triggered probabilistically
 * (~1% chance per tick) to avoid coordination across ticks.
 */
async function maybePruneTradeHistory(supabase: any): Promise<number> {
  // 1% of ticks @ every 5 min ≈ once per ~8 hours on average
  if (Math.random() > 0.01) return 0;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await supabase
    .from('arena_trade_history')
    .delete({ count: 'exact' })
    .lt('timestamp', cutoff);
  if (error) {
    console.error('[trade-tick] prune failed:', error.message);
    return 0;
  }
  if ((count ?? 0) > 0) console.info(`[trade-tick] pruned ${count} rows older than 30d`);
  return count ?? 0;
}

// ─── Row types ────────────────────────────────────────────────────────────────

interface SessionRow {
  agent_id: string;
  trades: number;
  wins: number;
  pnl: number;
  balance_delta: number;
  consecutive_losses: number;
  circuit_breaker_level: string;
  halted_until: string | null;
  last_trade_time: string | null;
}

interface PositionRow {
  agent_id: string;
  position_id: string;
  symbol: string;
  display_symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  current_price: number;
  quantity: number;
  take_profit_price: number;
  stop_loss_price: number;
  strategy: string;
  market_state_at_entry: string;
  entry_time: string;
}

function rowToSession(row: SessionRow | undefined): SessionState {
  if (!row) {
    return {
      trades: 0, wins: 0, pnl: 0, balanceDelta: 0,
      consecutiveLosses: 0, circuitBreakerLevel: 'ACTIVE',
      haltedUntil: null, lastTradeTime: null,
    };
  }
  return {
    trades: row.trades ?? 0,
    wins: row.wins ?? 0,
    pnl: Number(row.pnl ?? 0),
    balanceDelta: Number(row.balance_delta ?? 0),
    consecutiveLosses: row.consecutive_losses ?? 0,
    circuitBreakerLevel: row.circuit_breaker_level ?? 'ACTIVE',
    haltedUntil: row.halted_until ? new Date(row.halted_until).getTime() : null,
    lastTradeTime: row.last_trade_time ? new Date(row.last_trade_time).getTime() : null,
  };
}

function sessionToRow(agentId: string, session: SessionState): any {
  return {
    agent_id: agentId,
    trades: session.trades,
    wins: session.wins,
    pnl: session.pnl,
    balance_delta: session.balanceDelta,
    consecutive_losses: session.consecutiveLosses,
    circuit_breaker_level: session.circuitBreakerLevel,
    halted_until: session.haltedUntil ? new Date(session.haltedUntil).toISOString() : null,
    last_trade_time: session.lastTradeTime ? new Date(session.lastTradeTime).toISOString() : null,
  };
}

// ─── Tick logic ───────────────────────────────────────────────────────────────

interface TickResult {
  closed: number;
  opened: number;
  skipReasons: Record<string, number>;
  errors: string[];
  brain: { posSize: number; freq: number; regimePenalty: number; biases: number };
  regime: string;
  intel?: {
    sentimentFG: number | null;
    fundingBTC: number | null;
    cascadesActive: number;
    mlTrained: number;
    perfCells: number;
  };
  pruned?: number;
}

async function runTradingTick(): Promise<TickResult> {
  const supabase = getSupabase();
  const result: TickResult = {
    closed: 0, opened: 0, skipReasons: {}, errors: [],
    brain: { posSize: 1, freq: 1, regimePenalty: 1, biases: 0 },
    regime: 'RANGEBOUND',
  };

  // 1. Load all state in parallel — including top-50 for regime detection
  //    and the previous regime so we can detect transitions.
  const [prices, sessionsResult, positionsResult, brainLoad, topCoins, prevRegime] = await Promise.all([
    fetchPrices(),
    supabase.from('arena_agent_sessions').select('*'),
    supabase.from('arena_active_positions').select('*'),
    loadAutonomousBrain(supabase),
    fetchTopCoinsForRegime(),
    loadPreviousRegime(supabase),
  ]);
  const { brain, brainState: initialBrainState, persistedIntel, decisions: initialDecisions, rawState } = brainLoad;
  let brainState: BrainState = initialBrainState;
  let allDecisions: AdaptiveDecision[] = [...initialDecisions];

  result.brain = {
    posSize: brain.positionSizeMultiplier,
    freq: brain.signalFrequencyMultiplier,
    regimePenalty: brain.regimeTransitionPenalty,
    biases: Object.keys(brain.strategyBias).length,
  };

  if (prices.size === 0) {
    result.errors.push('Failed to fetch any prices from CoinGecko');
    return result;
  }

  const sessionsByAgent = new Map<string, SessionState>(
    (sessionsResult.data || []).map((r: SessionRow) => [r.agent_id, rowToSession(r)]),
  );
  const positionsByAgent = new Map<string, PositionRow>(
    (positionsResult.data || []).map((r: PositionRow) => [r.agent_id, r]),
  );

  // Regime detection: prefer the rich top-50 detector, fall back to the
  // BTC-only proxy if CoinGecko's top-50 endpoint failed for this tick.
  let regimeAnalysis: RegimeAnalysis;
  if (topCoins.length >= 10) {
    regimeAnalysis = detectRegimeFromCoins(topCoins);
  } else {
    const fallback = detectMarketStateFromPrices(prices);
    regimeAnalysis = {
      state: fallback,
      confidence: 50,
      volatility: 0,
      trendStrength: 0,
      rangeScore: 50,
      bullishRatio: 0.5,
      avgPriceChange24h: 0,
      avgVolumeRatio: 0,
      sampleSize: prices.size,
      timestamp: Date.now(),
    };
  }
  const marketState = regimeAnalysis.state;
  result.regime = marketState;

  // If the regime changed since the last tick, run it through orchestratorCore
  // to update the regime transition penalty and adaptation counters.
  if (prevRegime && prevRegime !== marketState) {
    const { brain: updated, decisions } = applyRegimeChange(brainState, marketState, prevRegime, Date.now());
    brainState = updated;
    allDecisions = [...allDecisions, ...decisions];
    // Hot-reload the surface brain consumed by decideTrade — penalty changed
    brain.regimeTransitionPenalty = brainState.regimeTransitionPenalty;
    console.info(`[trade-tick] regime transition ${prevRegime} → ${marketState} → penalty=${brain.regimeTransitionPenalty.toFixed(2)}x`);
  }

  // Always write the canonical regime snapshot so other consumers (UI, signal-tick)
  // see a fresh value even when the regime didn't change.
  await writeMarketState(supabase, regimeAnalysis);

  const reservedSymbols = new Set<string>(Array.from(positionsByAgent.values()).map(p => p.symbol));

  // 1b. Build intelligence context (sentiment + cascades + persisted ML state)
  const intel = await buildIntelContext(prices, DEFAULT_TRADING_PAIRS.map(p => p.symbol), persistedIntel);

  let cascadesActive = 0;
  for (const p of intel.liquidationPulses.values()) if (p.sample > 0) cascadesActive++;

  console.info(
    `[trade-tick] regime=${marketState} ` +
    `brain.posSize=${brain.positionSizeMultiplier.toFixed(2)}x ` +
    `intel: F&G=${intel.sentiment?.fearGreed ?? 'n/a'} ` +
    `funding=${intel.sentiment?.fundingRateBTC?.toFixed(3) ?? 'n/a'}% ` +
    `cascades=${cascadesActive} ` +
    `mlTrained=${intel.mlWeights.trained} ` +
    `perfCells=${Object.keys(intel.strategyPerformance).length}`
  );

  // 2. Manage open positions — TP / SL / TIMEOUT via shared core
  const now = Date.now();
  let anyClose = false;
  for (const [agentId, pos] of positionsByAgent) {
    const price = prices.get(pos.symbol);
    if (!price) continue;
    const posState: OpenPositionState = {
      direction: pos.direction,
      entryPrice: Number(pos.entry_price),
      takeProfitPrice: Number(pos.take_profit_price),
      stopLossPrice: Number(pos.stop_loss_price),
      entryTime: new Date(pos.entry_time).getTime(),
    };
    const closeDecision = manageOpenPosition(posState, price.price, now);
    if (closeDecision) {
      await closeTrade(supabase, pos, closeDecision.exitPrice, closeDecision.reason, sessionsByAgent.get(agentId), intel);
      result.closed++;
      anyClose = true;
      reservedSymbols.delete(pos.symbol);
      positionsByAgent.delete(agentId);
    }
  }

  // 3. Open new positions for agents without one — decideTrade picks candidate, intel gates it
  for (const agent of DEFAULT_AGENTS) {
    if (positionsByAgent.has(agent.id)) continue;

    const session = sessionsByAgent.get(agent.id) ?? rowToSession(undefined);

    const output = decideTrade({
      agent,
      session,
      prices,
      pairs: DEFAULT_TRADING_PAIRS,
      marketState,
      reservedSymbols,
      brain,
      now,
      initialBalance: RISK_LIMITS.INITIAL_BALANCE,
    });

    if (!output.decision) {
      const key = output.skipReason ?? 'UNKNOWN';
      result.skipReasons[key] = (result.skipReasons[key] ?? 0) + 1;
      continue;
    }

    // Intel gate — quality scorer + sentiment + cascades + feedback + ML
    const d = output.decision;
    const price = prices.get(d.pair.symbol);
    if (!price) {
      result.skipReasons['NO_PRICE_DATA'] = (result.skipReasons['NO_PRICE_DATA'] ?? 0) + 1;
      continue;
    }
    const evalResult = evaluateIntel({
      agentRiskProfile: agent.riskProfile,
      signalDirection: d.direction,
      signalConfidence: d.confidence,
      signalStrategyName: d.strategy,
      marketState,
      symbol: d.pair.symbol,
      price: price.price,
      change24h: price.change24h,
      high24h: price.high24h,
      low24h: price.low24h,
      volume: price.volume,
    }, intel);

    if (!evalResult.shouldTake) {
      const key = evalResult.vetoReason ? 'INTEL_VETO' : 'INTEL_REJECT';
      result.skipReasons[key] = (result.skipReasons[key] ?? 0) + 1;
      console.info(`[trade-tick] ${agent.name} INTEL_REJECT ${d.pair.display} adj=${evalResult.totalAdjustment.toFixed(0)} eff=${evalResult.effectiveConfidence.toFixed(0)} q=${evalResult.qualityScore} pWin=${(evalResult.pWin * 100).toFixed(0)}%`);
      continue;
    }

    await openPosition(supabase, agent.id, agent.name, d, marketState, evalResult);
    result.opened++;
    reservedSymbols.add(d.pair.symbol);
  }

  // Persist intel back if anything changed
  if (anyClose) {
    await persistIntel(supabase, rawState, intel);
  }

  // Sustainability: occasional pruning
  result.pruned = await maybePruneTradeHistory(supabase);

  result.intel = {
    sentimentFG: intel.sentiment?.fearGreed ?? null,
    fundingBTC: intel.sentiment?.fundingRateBTC ?? null,
    cascadesActive,
    mlTrained: intel.mlWeights.trained,
    perfCells: Object.keys(intel.strategyPerformance).length,
  };

  return result;
}

// ─── Persist helpers ──────────────────────────────────────────────────────────

async function openPosition(
  supabase: any,
  agentId: string,
  agentName: string,
  d: OpenPositionDecision,
  marketState: string,
  evalResult?: { qualityScore: number; effectiveConfidence: number; totalAdjustment: number; pWin: number; reasons: string[] },
): Promise<void> {
  const positionId = `${agentId}-${Date.now()}`;
  const { error } = await supabase
    .from('arena_active_positions')
    .upsert({
      agent_id: agentId,
      position_id: positionId,
      symbol: d.pair.symbol,
      display_symbol: d.pair.display,
      direction: d.direction,
      entry_price: d.entryPrice,
      current_price: d.entryPrice,
      quantity: d.quantity,
      take_profit_price: d.takeProfitPrice,
      stop_loss_price: d.stopLossPrice,
      strategy: d.strategy,
      market_state_at_entry: marketState,
      entry_time: new Date().toISOString(),
    }, { onConflict: 'agent_id' });

  if (error) {
    console.error(`[trade-tick] open failed for ${agentId}:`, error.message);
    return;
  }

  if (evalResult) {
    console.info(
      `[trade-tick] INTEL_PASS ${agentName} q=${evalResult.qualityScore} adj=${evalResult.totalAdjustment >= 0 ? '+' : ''}${evalResult.totalAdjustment.toFixed(0)} eff=${evalResult.effectiveConfidence.toFixed(0)} pWin=${(evalResult.pWin * 100).toFixed(0)}%`
    );
  }
  console.info(
    `[trade-tick] OPEN ${agentName} ${d.direction} ${d.pair.display} ` +
    `@ $${d.entryPrice.toFixed(2)} notional=$${d.notional.toFixed(0)} ` +
    `TP=$${d.takeProfitPrice.toFixed(2)} SL=$${d.stopLossPrice.toFixed(2)} ` +
    `conf=${d.confidence.toFixed(0)}% strat=${d.strategy}`
  );
}

async function closeTrade(
  supabase: any,
  pos: PositionRow,
  exitPrice: number,
  reason: 'TP' | 'SL' | 'TIMEOUT',
  session: SessionState | undefined,
  intel?: IntelContext,
): Promise<void> {
  const result = computePnL(pos.direction, Number(pos.entry_price), exitPrice, Number(pos.quantity));

  // 1. Insert into trade history
  await supabase.from('arena_trade_history').insert({
    agent_id: pos.agent_id,
    timestamp: new Date().toISOString(),
    symbol: pos.symbol,
    direction: pos.direction,
    entry_price: pos.entry_price,
    exit_price: exitPrice,
    quantity: pos.quantity,
    pnl_percent: result.pnlPercent,
    pnl_dollar: result.pnlDollar,
    is_win: result.isWin,
    strategy: pos.strategy,
    market_state: pos.market_state_at_entry,
    reason,
  });

  // 2. Delete active position
  await supabase.from('arena_active_positions').delete().eq('agent_id', pos.agent_id);

  // 3. Update session via shared core (circuit breaker logic lives in core)
  const baselineSession = session ?? rowToSession(undefined);
  const newSession = applyCloseToSession(baselineSession, result, Date.now(), RISK_LIMITS.INITIAL_BALANCE);

  await supabase.from('arena_agent_sessions').upsert(sessionToRow(pos.agent_id, newSession), { onConflict: 'agent_id' });

  // 4. Train intel: feedback EWMA + ML SGD step on this outcome
  if (intel) {
    // Look up the agent to recover risk profile
    const agentDef = DEFAULT_AGENTS.find(a => a.id === pos.agent_id);
    if (agentDef) {
      trainOnClose(intel, {
        agentRiskProfile: agentDef.riskProfile,
        strategyName: pos.strategy,
        regime: pos.market_state_at_entry,
        direction: pos.direction,
        isWin: result.isWin,
        pnlPercent: result.pnlPercent,
      });
    }
  }

  console.info(
    `[trade-tick] CLOSE ${pos.agent_id} ${pos.direction} ${pos.display_symbol} ${reason} ` +
    `pnl=${result.pnlPercent.toFixed(2)}% ($${result.pnlDollar.toFixed(2)}) ` +
    `consec=${newSession.consecutiveLosses} cb=${newSession.circuitBreakerLevel}`
  );
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }

  const startedAt = Date.now();
  try {
    const result = await runTradingTick();
    const elapsedMs = Date.now() - startedAt;
    console.info(`[trade-tick] DONE in ${elapsedMs}ms`, JSON.stringify(result));
    return res.status(200).json({ ok: true, elapsedMs, ...result });
  } catch (err: any) {
    console.error('[trade-tick] FATAL', err);
    return res.status(500).json({ error: 'Tick failed', message: err?.message });
  }
}

export const config = {
  maxDuration: 30,
};
