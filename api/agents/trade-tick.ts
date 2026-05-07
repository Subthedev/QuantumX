/**
 * QuantumX 24/7 Trading Worker — Self-contained
 *
 * One execution = one trading tick:
 *   1. Fetch CoinGecko prices (Binance blocks AWS IPs)
 *   2. Manage open positions (TP / SL / 60min TIMEOUT)
 *   3. Open new positions for idle agents using a 5-signal multi-confirmation
 *   4. Persist to Supabase (arena_*  + autonomous_state)
 *
 * Intentionally self-contained: no imports from src/* or api/lib/* so the
 * Vercel function bundle is stable regardless of upstream refactors.
 *
 * Authentication: `Authorization: Bearer ${CRON_SECRET}`. Driven from
 * Supabase pg_cron (every minute) since Vercel Hobby blocks 1-min crons.
 *
 * Route: GET /api/agents/trade-tick
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

type Direction = 'LONG' | 'SHORT';
type CloseReason = 'TP' | 'SL' | 'TIMEOUT';
type AgentType = 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';

interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  positionSizePercent: number;
  baseTPPercent: number;
  baseSLPercent: number;
  tradeIntervalMs: number;
}

interface AgentSession {
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

interface ActivePosition {
  agent_id: string;
  position_id: string;
  symbol: string;
  display_symbol: string;
  direction: Direction;
  entry_price: number;
  current_price: number;
  quantity: number;
  take_profit_price: number;
  stop_loss_price: number;
  strategy: string;
  market_state_at_entry: string;
  entry_time: string;
}

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

// ─── Risk parameters ──────────────────────────────────────────────────────────

const INITIAL_BALANCE = 10_000;
const MAX_POSITION_USD = 2_500;
const MIN_POSITION_USD = 200;
const MAX_HOLD_MS = 60 * 60 * 1000;
const MIN_RR = 1.8;
const TP_CAP_PERCENT = 10;
const SL_CAP_PERCENT = 4;

const AGENTS: AgentConfig[] = [
  { id: 'alphax', name: 'AlphaX', type: 'AGGRESSIVE',  positionSizePercent: 15, baseTPPercent: 3.5, baseSLPercent: 1.4, tradeIntervalMs: 4 * 60 * 1000 },
  { id: 'betax',  name: 'BetaX',  type: 'BALANCED',     positionSizePercent: 12, baseTPPercent: 2.5, baseSLPercent: 1.2, tradeIntervalMs: 5 * 60 * 1000 },
  { id: 'gammax', name: 'GammaX', type: 'CONSERVATIVE', positionSizePercent: 10, baseTPPercent: 4.5, baseSLPercent: 2.0, tradeIntervalMs: 6 * 60 * 1000 },
];

const TRADING_PAIRS = [
  { symbol: 'BTCUSDT',  display: 'BTC/USD',  coingeckoId: 'bitcoin' },
  { symbol: 'ETHUSDT',  display: 'ETH/USD',  coingeckoId: 'ethereum' },
  { symbol: 'SOLUSDT',  display: 'SOL/USD',  coingeckoId: 'solana' },
  { symbol: 'BNBUSDT',  display: 'BNB/USD',  coingeckoId: 'binancecoin' },
  { symbol: 'XRPUSDT',  display: 'XRP/USD',  coingeckoId: 'ripple' },
  { symbol: 'DOGEUSDT', display: 'DOGE/USD', coingeckoId: 'dogecoin' },
];

// ─── Supabase ─────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL
    ?? process.env.VITE_SUPABASE_URL
    ?? 'https://abdjyaumafnewqjhsjlq.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Price feed ───────────────────────────────────────────────────────────────

async function fetchPrices(): Promise<Map<string, PriceData>> {
  const map = new Map<string, PriceData>();
  const ids = TRADING_PAIRS.map(p => p.coingeckoId).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'accept': 'application/json' },
    });
    clearTimeout(timeout);
    if (!r.ok) {
      console.error(`[trade-tick] CoinGecko HTTP ${r.status}`);
      return map;
    }
    const arr = (await r.json()) as Array<{
      id: string;
      current_price: number;
      high_24h: number;
      low_24h: number;
      total_volume: number;
      price_change_percentage_24h: number;
    }>;

    const idToPair = new Map(TRADING_PAIRS.map(p => [p.coingeckoId, p]));
    for (const row of arr) {
      const pair = idToPair.get(row.id);
      if (!pair) continue;
      map.set(pair.symbol, {
        symbol: pair.symbol,
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

// ─── Market state + signal generation ────────────────────────────────────────

interface RegimeSnapshot {
  state: string;
  confidence: number;     // 0-100
  volatility: number;     // 0-100, normalized cross-sectional stdev
  trendStrength: number;  // -100..+100, avg 24h move ×2
  bullishRatio: number;   // 0-1
  sampleSize: number;
}

/**
 * Top-50 breadth-aware regime classifier. Same algorithm as the browser's
 * marketStateDetectionEngine. Falls back to BTC-only on top-50 fetch failure.
 */
async function detectRichRegime(btcFallback?: PriceData): Promise<RegimeSnapshot> {
  const url = 'https://api.coingecko.com/api/v3/coins/markets'
    + '?vs_currency=usd&order=market_cap_desc&per_page=50&page=1';
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);
  let coins: Array<{ price_change_percentage_24h: number }> = [];
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'accept': 'application/json' } });
    clearTimeout(timeout);
    if (r.ok) coins = await r.json() as any;
  } catch (err: any) {
    clearTimeout(timeout);
    console.warn('[trade-tick] top-50 regime fetch failed:', err?.message);
  }

  // Fallback path — BTC-only (matches the previous detectMarketState behavior)
  if (coins.length < 10) {
    if (!btcFallback) {
      return { state: 'RANGEBOUND', confidence: 40, volatility: 0, trendStrength: 0, bullishRatio: 0.5, sampleSize: 0 };
    }
    const range = btcFallback.high24h > 0 ? ((btcFallback.high24h - btcFallback.low24h) / btcFallback.price) * 100 : 0;
    const isHighVol = range > 4.5;
    let state = 'RANGEBOUND';
    if (btcFallback.change24h > 2.5)       state = isHighVol ? 'BULLISH_HIGH_VOL' : 'BULLISH_LOW_VOL';
    else if (btcFallback.change24h < -2.5) state = isHighVol ? 'BEARISH_HIGH_VOL' : 'BEARISH_LOW_VOL';
    return {
      state,
      confidence: 50,
      volatility: Math.min(100, range * 5),
      trendStrength: Math.max(-100, Math.min(100, btcFallback.change24h * 2)),
      bullishRatio: btcFallback.change24h > 0 ? 1 : 0,
      sampleSize: 1,
    };
  }

  // Top-50 algorithm
  const changes = coins.map(c => c.price_change_percentage_24h ?? 0);
  const avg = changes.reduce((s, v) => s + v, 0) / changes.length;
  const variance = changes.reduce((s, v) => s + (v - avg) ** 2, 0) / changes.length;
  const sd = Math.sqrt(variance);
  const volatility = Math.min(100, sd * 5);
  const trendStrength = Math.max(-100, Math.min(100, avg * 2));
  const rangeScore = 100 - Math.abs(trendStrength);
  const bullishRatio = changes.filter(c => c > 0).length / changes.length;

  let state: string;
  let confidence: number;
  if (rangeScore > 60 && volatility < 20) {
    state = 'RANGEBOUND';
    confidence = rangeScore;
  } else if (trendStrength > 15) {
    state = volatility > 40 ? 'BULLISH_HIGH_VOL' : 'BULLISH_LOW_VOL';
    confidence = volatility > 40 ? (trendStrength + volatility) / 2 : trendStrength + (100 - volatility) / 2;
  } else if (trendStrength < -15) {
    state = volatility > 40 ? 'BEARISH_HIGH_VOL' : 'BEARISH_LOW_VOL';
    confidence = volatility > 40 ? (Math.abs(trendStrength) + volatility) / 2 : Math.abs(trendStrength) + (100 - volatility) / 2;
  } else {
    state = 'RANGEBOUND';
    confidence = 50 + rangeScore / 4;
  }
  if (state.startsWith('BULLISH') && bullishRatio < 0.4) confidence *= 0.8;
  else if (state.startsWith('BEARISH') && bullishRatio > 0.6) confidence *= 0.8;
  confidence = Math.max(40, Math.min(95, confidence));

  return { state, confidence, volatility, trendStrength, bullishRatio, sampleSize: coins.length };
}

async function writeMarketState(supabase: any, snap: RegimeSnapshot): Promise<void> {
  // Singleton row keyed by a fixed UUID — overwrite in place each tick
  const { error } = await supabase
    .from('arena_market_state')
    .upsert({
      id: '00000000-0000-0000-0000-000000000001',
      state: snap.state,
      confidence: snap.confidence,
      volatility: snap.volatility,
      trend_strength: snap.trendStrength,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) console.warn('[trade-tick] arena_market_state upsert failed:', error.message);
}

interface Signal {
  direction: Direction;
  confidence: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  strategy: string;
}

function generateSignal(
  agent: AgentConfig,
  pair: typeof TRADING_PAIRS[0],
  price: PriceData,
  marketState: string,
): Signal | null {
  const range = price.high24h > 0 ? ((price.high24h - price.low24h) / price.price) * 100 : 0;
  const positionInRange = price.high24h > price.low24h
    ? (price.price - price.low24h) / (price.high24h - price.low24h)
    : 0.5;

  const signals = {
    momentum:        price.change24h > 1 ? 1 : price.change24h < -1 ? -1 : 0,
    range:           positionInRange > 0.7 ? -1 : positionInRange < 0.3 ? 1 : 0,
    volatility:      range > 3 ? 1 : 0,
    regimeAlignment: marketState.startsWith('BULLISH') ? 1 : marketState.startsWith('BEARISH') ? -1 : 0,
    agentTypeFit:    0,
  };

  if (agent.type === 'AGGRESSIVE')    signals.agentTypeFit = signals.momentum;
  else if (agent.type === 'BALANCED') signals.agentTypeFit = -signals.range;
  else                                signals.agentTypeFit = signals.volatility;

  const bias = signals.momentum + signals.range + signals.regimeAlignment + signals.agentTypeFit;
  if (Math.abs(bias) < 1) return null;

  const direction: Direction = bias > 0 ? 'LONG' : 'SHORT';
  const confidence = Math.min(95, 50 + Math.abs(bias) * 10 + signals.volatility * 5);
  if (confidence < 50) return null;

  const isHighVol = marketState.includes('HIGH_VOL');
  const isRangebound = marketState === 'RANGEBOUND';
  const volMultiplier = isHighVol ? 1.4 : (isRangebound ? 0.7 : 1.0);
  const rangeAdjustment = Math.min(1.5, Math.max(0.6, range / 4));

  let tp = agent.baseTPPercent * volMultiplier * rangeAdjustment;
  let sl = agent.baseSLPercent * volMultiplier * rangeAdjustment;
  if (tp / sl < MIN_RR) tp = sl * MIN_RR;
  tp = Math.min(TP_CAP_PERCENT, Math.max(1.5, tp));
  sl = Math.min(SL_CAP_PERCENT, Math.max(0.75, sl));

  return {
    direction,
    confidence,
    takeProfitPercent: tp,
    stopLossPercent: sl,
    strategy: `${agent.type.toLowerCase()}-multi-confirm`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeBalance(session: AgentSession | undefined): number {
  if (!session) return INITIAL_BALANCE;
  return INITIAL_BALANCE + (Number(session.balance_delta) || 0);
}

function isHaltedByCircuitBreaker(session: AgentSession | undefined): boolean {
  if (!session) return false;
  if (session.circuit_breaker_level === 'L4_HALTED' || session.circuit_breaker_level === 'L5_EMERGENCY') return true;
  if (session.halted_until && new Date(session.halted_until).getTime() > Date.now()) return true;
  return false;
}

// ─── Tick logic ───────────────────────────────────────────────────────────────

interface TickResult {
  closed: number;
  opened: number;
  skipReasons: Record<string, number>;
  errors: string[];
  regime: string;
}

async function runTradingTick(): Promise<TickResult> {
  const supabase = getSupabase();
  const result: TickResult = {
    closed: 0, opened: 0, skipReasons: {}, errors: [], regime: 'RANGEBOUND',
  };

  const [prices, sessionsResult, positionsResult] = await Promise.all([
    fetchPrices(),
    supabase.from('arena_agent_sessions').select('*'),
    supabase.from('arena_active_positions').select('*'),
  ]);

  if ((sessionsResult as any).error) {
    const msg = `arena_agent_sessions read failed: ${(sessionsResult as any).error.message ?? (sessionsResult as any).error}`;
    console.error('[trade-tick]', msg);
    result.errors.push(msg);
  }
  if ((positionsResult as any).error) {
    const msg = `arena_active_positions read failed: ${(positionsResult as any).error.message ?? (positionsResult as any).error}`;
    console.error('[trade-tick]', msg);
    result.errors.push(msg);
  }
  if ((sessionsResult as any).error || (positionsResult as any).error) {
    return result;
  }

  if (prices.size === 0) {
    result.errors.push('Failed to fetch prices from CoinGecko');
    return result;
  }

  const sessionsByAgent = new Map<string, AgentSession>(
    ((sessionsResult as any).data || []).map((s: AgentSession) => [s.agent_id, s])
  );
  const positionsByAgent = new Map<string, ActivePosition>(
    ((positionsResult as any).data || []).map((p: ActivePosition) => [p.agent_id, p])
  );

  // Top-50 breadth-aware regime classification (with BTC fallback if CoinGecko's
  // breadth endpoint is throttled). Snapshot is also written to arena_market_state
  // so the UI shows a fresh state every minute.
  const regime = await detectRichRegime(prices.get('BTCUSDT'));
  const marketState = regime.state;
  result.regime = marketState;
  await writeMarketState(supabase, regime);
  console.info(`[trade-tick] regime=${marketState} conf=${regime.confidence.toFixed(0)}% vol=${regime.volatility.toFixed(0)} trend=${regime.trendStrength.toFixed(0)} breadth=${(regime.bullishRatio * 100).toFixed(0)}%`);

  const reservedSymbols = new Set<string>(Array.from(positionsByAgent.values()).map(p => p.symbol));

  // 1. Manage existing positions (TP / SL / TIMEOUT + trailing stop) — parallel
  const closeOps: Promise<void>[] = [];
  const trailOps: Promise<void>[] = [];
  let trailedCount = 0;
  for (const [agentId, pos] of positionsByAgent) {
    const price = prices.get(pos.symbol);
    if (!price) continue;
    const isLong = pos.direction === 'LONG';
    const entry = Number(pos.entry_price);
    const sl = Number(pos.stop_loss_price);
    const tp = Number(pos.take_profit_price);
    const heldMs = Date.now() - new Date(pos.entry_time).getTime();

    let close = false;
    let reason: CloseReason = 'TIMEOUT';
    let exitPrice = price.price;

    if (isLong) {
      if (price.price >= tp)      { close = true; reason = 'TP'; exitPrice = tp; }
      else if (price.price <= sl) { close = true; reason = 'SL'; exitPrice = sl; }
    } else {
      if (price.price <= tp)      { close = true; reason = 'TP'; exitPrice = tp; }
      else if (price.price >= sl) { close = true; reason = 'SL'; exitPrice = sl; }
    }

    if (!close && heldMs >= MAX_HOLD_MS) {
      close = true;
      reason = 'TIMEOUT';
      exitPrice = price.price;
    }

    if (close) {
      closeOps.push(closeTrade(supabase, pos, exitPrice, reason, sessionsByAgent.get(agentId), result));
      result.closed++;
      reservedSymbols.delete(pos.symbol);
      positionsByAgent.delete(agentId);
      continue;
    }

    // Trailing stop: once profit ≥ original-SL distance, raise SL to break-even.
    // Identifying "already trailed" without an extra column: SL is at entry (or
    // beyond, in our favor) — that's only true post-trail since opens always
    // place SL on the wrong side of entry.
    const alreadyTrailed = isLong ? sl >= entry : sl <= entry;
    if (!alreadyTrailed) {
      const slDistance = Math.abs(entry - sl);
      const profitDistance = isLong ? (price.price - entry) : (entry - price.price);
      if (profitDistance >= slDistance) {
        trailedCount++;
        const newSL = entry; // break-even
        trailOps.push(
          (async () => {
            const { error } = await supabase
              .from('arena_active_positions')
              .update({ stop_loss_price: newSL, updated_at: new Date().toISOString() })
              .eq('agent_id', pos.agent_id);
            if (error) {
              console.warn(`[trade-tick] trail SL failed for ${pos.agent_id}: ${error.message}`);
            } else {
              console.info(`[trade-tick] TRAIL ${pos.agent_id} ${pos.direction} ${pos.display_symbol} SL ${sl.toFixed(2)} → ${newSL.toFixed(2)} (BE)`);
            }
          })(),
        );
      }
    }
  }
  await Promise.all([...closeOps, ...trailOps]);
  if (trailedCount > 0) (result as any).trailed = trailedCount;

  // 2. Open new positions for idle agents — parallel
  // Portfolio-heat cap: at-risk dollars across all open positions cannot exceed
  // 5% of total bankroll ($30K). Heat = Σ (notional × |entry - SL| / entry).
  // Trailed stops (SL at break-even) contribute zero heat — they can't lose.
  const TOTAL_BANKROLL = INITIAL_BALANCE * AGENTS.length;
  const MAX_PORTFOLIO_HEAT_USD = TOTAL_BANKROLL * 0.05;

  const computePositionHeatUSD = (pos: ActivePosition): number => {
    const isLong = pos.direction === 'LONG';
    const entry = Number(pos.entry_price);
    const sl = Number(pos.stop_loss_price);
    const qty = Number(pos.quantity);
    const slDistance = isLong ? Math.max(0, entry - sl) : Math.max(0, sl - entry);
    return slDistance * qty;
  };

  let currentHeatUSD = 0;
  for (const pos of positionsByAgent.values()) {
    currentHeatUSD += computePositionHeatUSD(pos);
  }
  if (currentHeatUSD > 0) {
    console.info(`[trade-tick] portfolio heat: $${currentHeatUSD.toFixed(0)} / $${MAX_PORTFOLIO_HEAT_USD.toFixed(0)} (${((currentHeatUSD / MAX_PORTFOLIO_HEAT_USD) * 100).toFixed(0)}%)`);
  }

  const openOps: Promise<void>[] = [];
  for (const agent of AGENTS) {
    if (positionsByAgent.has(agent.id)) continue;

    const session = sessionsByAgent.get(agent.id);
    if (isHaltedByCircuitBreaker(session)) {
      result.skipReasons['HALTED'] = (result.skipReasons['HALTED'] ?? 0) + 1;
      continue;
    }

    const lastTrade = session?.last_trade_time ? new Date(session.last_trade_time).getTime() : 0;
    if (Date.now() - lastTrade < agent.tradeIntervalMs) {
      result.skipReasons['COOLDOWN'] = (result.skipReasons['COOLDOWN'] ?? 0) + 1;
      continue;
    }

    const availablePairs = TRADING_PAIRS.filter(p => !reservedSymbols.has(p.symbol));
    if (availablePairs.length === 0) {
      result.skipReasons['NO_PAIRS_AVAILABLE'] = (result.skipReasons['NO_PAIRS_AVAILABLE'] ?? 0) + 1;
      continue;
    }

    let chosenSignal: Signal | null = null;
    let chosenPair: typeof TRADING_PAIRS[0] | null = null;
    for (const pair of availablePairs) {
      const price = prices.get(pair.symbol);
      if (!price) continue;
      const sig = generateSignal(agent, pair, price, marketState);
      if (sig && (!chosenSignal || sig.confidence > chosenSignal.confidence)) {
        chosenSignal = sig;
        chosenPair = pair;
      }
    }

    if (!chosenSignal || !chosenPair) {
      result.skipReasons['NO_SIGNAL'] = (result.skipReasons['NO_SIGNAL'] ?? 0) + 1;
      continue;
    }

    const price = prices.get(chosenPair.symbol)!;
    const balance = computeBalance(session);
    let notional = balance * (agent.positionSizePercent / 100);
    notional *= Math.max(0.7, Math.min(1.3, 0.4 + chosenSignal.confidence / 100));
    notional = Math.min(notional, MAX_POSITION_USD);
    notional = Math.max(notional, MIN_POSITION_USD);

    if (notional < MIN_POSITION_USD || notional > balance * 0.5) {
      result.skipReasons['SIZE_OUT_OF_BOUNDS'] = (result.skipReasons['SIZE_OUT_OF_BOUNDS'] ?? 0) + 1;
      continue;
    }

    // Portfolio-heat gate: would adding this position exceed the global cap?
    const projectedHeatUSD = notional * (chosenSignal.stopLossPercent / 100);
    if (currentHeatUSD + projectedHeatUSD > MAX_PORTFOLIO_HEAT_USD) {
      result.skipReasons['PORTFOLIO_HEAT_CAP'] = (result.skipReasons['PORTFOLIO_HEAT_CAP'] ?? 0) + 1;
      console.info(`[trade-tick] heat-cap skip ${agent.name}: $${projectedHeatUSD.toFixed(0)} would push total to $${(currentHeatUSD + projectedHeatUSD).toFixed(0)} (cap $${MAX_PORTFOLIO_HEAT_USD.toFixed(0)})`);
      continue;
    }
    currentHeatUSD += projectedHeatUSD;

    openOps.push(openPosition(supabase, agent, chosenPair, price, chosenSignal, notional, marketState, result));
    result.opened++;
    reservedSymbols.add(chosenPair.symbol);
  }
  await Promise.all(openOps);

  return result;
}

async function openPosition(
  supabase: any,
  agent: AgentConfig,
  pair: typeof TRADING_PAIRS[0],
  price: PriceData,
  signal: Signal,
  notional: number,
  marketState: string,
  result: TickResult,
): Promise<void> {
  const isLong = signal.direction === 'LONG';
  const entry = price.price;
  const tp = isLong ? entry * (1 + signal.takeProfitPercent / 100) : entry * (1 - signal.takeProfitPercent / 100);
  const sl = isLong ? entry * (1 - signal.stopLossPercent / 100)   : entry * (1 + signal.stopLossPercent / 100);
  const quantity = notional / entry;
  const positionId = `${agent.id}-${Date.now()}`;

  const { error } = await supabase
    .from('arena_active_positions')
    .upsert({
      agent_id: agent.id,
      position_id: positionId,
      symbol: pair.symbol,
      display_symbol: pair.display,
      direction: signal.direction,
      entry_price: entry,
      current_price: entry,
      quantity,
      take_profit_price: tp,
      stop_loss_price: sl,
      strategy: signal.strategy,
      market_state_at_entry: marketState,
      entry_time: new Date().toISOString(),
    }, { onConflict: 'agent_id' });

  if (error) {
    const msg = `open failed for ${agent.id}: ${error.message ?? error.code ?? error}`;
    console.error('[trade-tick]', msg);
    result.errors.push(msg);
    return;
  }

  console.info(`[trade-tick] OPEN ${agent.name} ${signal.direction} ${pair.display} @ $${entry.toFixed(2)} notional=$${notional.toFixed(0)} TP=$${tp.toFixed(2)} SL=$${sl.toFixed(2)} conf=${signal.confidence}`);
}

async function closeTrade(
  supabase: any,
  pos: ActivePosition,
  exitPrice: number,
  reason: CloseReason,
  session: AgentSession | undefined,
  result: TickResult,
): Promise<void> {
  const isLong = pos.direction === 'LONG';
  const entry = Number(pos.entry_price);
  const qty = Number(pos.quantity);
  const pnlPercent = isLong
    ? ((exitPrice - entry) / entry) * 100
    : ((entry - exitPrice) / entry) * 100;
  const notional = qty * entry;
  const pnlDollar = (pnlPercent / 100) * notional;
  const isWin = pnlPercent > 0;

  const consecutive = isWin ? 0 : (session?.consecutive_losses ?? 0) + 1;
  let circuitLevel = 'ACTIVE';
  let haltedUntil: string | null = null;
  if (consecutive >= 5)      { circuitLevel = 'L4_HALTED';   haltedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString(); }
  else if (consecutive >= 4) { circuitLevel = 'L3_MINIMAL';  }
  else if (consecutive >= 3) { circuitLevel = 'L1_CAUTIOUS'; }

  const newDelta = Number(session?.balance_delta ?? 0) + pnlDollar;
  if (INITIAL_BALANCE + newDelta < INITIAL_BALANCE * 0.5) {
    circuitLevel = 'L5_EMERGENCY';
    haltedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  const writes = await Promise.all([
    supabase.from('arena_trade_history').insert({
      agent_id: pos.agent_id,
      timestamp: new Date().toISOString(),
      symbol: pos.symbol,
      direction: pos.direction,
      entry_price: entry,
      exit_price: exitPrice,
      quantity: qty,
      pnl_percent: pnlPercent,
      pnl_dollar: pnlDollar,
      is_win: isWin,
      strategy: pos.strategy,
      market_state: pos.market_state_at_entry,
      reason,
    }),
    supabase.from('arena_active_positions').delete().eq('agent_id', pos.agent_id),
    supabase.from('arena_agent_sessions').upsert({
      agent_id: pos.agent_id,
      trades: (session?.trades ?? 0) + 1,
      wins: (session?.wins ?? 0) + (isWin ? 1 : 0),
      pnl: Number(session?.pnl ?? 0) + pnlPercent,
      balance_delta: newDelta,
      consecutive_losses: consecutive,
      circuit_breaker_level: circuitLevel,
      halted_until: haltedUntil,
      last_trade_time: new Date().toISOString(),
    }, { onConflict: 'agent_id' }),
  ]);

  const labels = ['trade_history.insert', 'active_position.delete', 'agent_session.upsert'];
  writes.forEach((w: any, i: number) => {
    if (w?.error) {
      const msg = `close ${labels[i]} failed for ${pos.agent_id}: ${w.error.message ?? w.error.code ?? w.error}`;
      console.error('[trade-tick]', msg);
      result.errors.push(msg);
    }
  });

  console.info(`[trade-tick] CLOSE ${pos.agent_id} ${pos.direction} ${pos.display_symbol} ${reason} pnl=${pnlPercent.toFixed(2)}% ($${pnlDollar.toFixed(2)}) consec=${consecutive}`);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return res.status(500).json({ error: 'CRON_SECRET not configured' });
  if (authHeader !== `Bearer ${expectedSecret}`) return res.status(401).json({ error: 'Unauthorized' });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }

  const startedAt = Date.now();
  try {
    const result = await runTradingTick();
    const elapsedMs = Date.now() - startedAt;
    console.info(`[trade-tick] DONE in ${elapsedMs}ms`, result);
    return res.status(200).json({ ok: true, elapsedMs, ...result });
  } catch (err: any) {
    console.error('[trade-tick] FATAL', err);
    return res.status(500).json({ error: 'Tick failed', message: err?.message, stack: err?.stack });
  }
}

export const config = {
  maxDuration: 60,
};
