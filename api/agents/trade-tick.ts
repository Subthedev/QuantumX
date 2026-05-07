/**
 * QuantumX 24/7 Trading Worker — Vercel Cron
 *
 * Runs every minute via Vercel Cron. One execution = one trading tick:
 *   1. Fetch live Binance prices for all trading pairs
 *   2. For each open position: check TP / SL / timeout, close if hit
 *   3. For each agent without an open position: try to open a new one
 *   4. Persist all state to Supabase (arena_agent_sessions / arena_active_positions / arena_trade_history)
 *
 * This is the server-side counterpart to the browser arenaQuantEngine. The browser engine
 * still runs for live UI; this cron keeps trading alive 24/7 even when no tab is open.
 *
 * Authentication: Vercel sends `Authorization: Bearer ${CRON_SECRET}` for cron invocations.
 * Manual triggers can use the same header.
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
  positionSizePercent: number;   // e.g. 12 = 12% of balance per trade
  baseTPPercent: number;          // base take profit
  baseSLPercent: number;          // base stop loss
  tradeIntervalMs: number;        // min cooldown between trades
}

interface AgentSession {
  agent_id: string;
  trades: number;
  wins: number;
  pnl: number;                    // cumulative %
  balance_delta: number;          // dollars accrued from initial $10k
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

// ─── Config ───────────────────────────────────────────────────────────────────

const INITIAL_BALANCE = 10_000;
const MAX_POSITION_USD = 2_500;
const MIN_POSITION_USD = 200;
const MAX_HOLD_MS = 60 * 60 * 1000;     // 60 minutes
const MIN_RR = 1.8;
const TP_CAP_PERCENT = 10;
const SL_CAP_PERCENT = 4;
const SUITABILITY_FLOOR_PERCENT = 50;

const AGENTS: AgentConfig[] = [
  { id: 'alphax', name: 'AlphaX', type: 'AGGRESSIVE', positionSizePercent: 15, baseTPPercent: 3.5, baseSLPercent: 1.4, tradeIntervalMs: 4 * 60 * 1000 },
  { id: 'betax',  name: 'BetaX',  type: 'BALANCED',   positionSizePercent: 12, baseTPPercent: 2.5, baseSLPercent: 1.2, tradeIntervalMs: 5 * 60 * 1000 },
  { id: 'gammax', name: 'GammaX', type: 'CONSERVATIVE', positionSizePercent: 10, baseTPPercent: 4.5, baseSLPercent: 2.0, tradeIntervalMs: 6 * 60 * 1000 },
];

// Binance USDT pair symbol → CoinGecko id. We use CoinGecko on the server because
// Binance blocks Vercel/AWS IP ranges; the browser engine still uses Binance directly.
const TRADING_PAIRS = [
  { symbol: 'BTCUSDT',  display: 'BTC/USD',  tier: 'major',    coingeckoId: 'bitcoin' },
  { symbol: 'ETHUSDT',  display: 'ETH/USD',  tier: 'major',    coingeckoId: 'ethereum' },
  { symbol: 'SOLUSDT',  display: 'SOL/USD',  tier: 'major',    coingeckoId: 'solana' },
  { symbol: 'BNBUSDT',  display: 'BNB/USD',  tier: 'mid',      coingeckoId: 'binancecoin' },
  { symbol: 'XRPUSDT',  display: 'XRP/USD',  tier: 'mid',      coingeckoId: 'ripple' },
  { symbol: 'DOGEUSDT', display: 'DOGE/USD', tier: 'volatile', coingeckoId: 'dogecoin' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSupabase() {
  // URL is public (also embedded in src/integrations/supabase/client.ts) — env var optional
  const url = process.env.VITE_SUPABASE_URL
    ?? process.env.SUPABASE_URL
    ?? 'https://vidziydspeewmcexqicg.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Fetch live prices via CoinGecko's /coins/markets endpoint. Single batched request.
 * Free tier rate limit: ~30 calls/min — we use ≤1/tick so this is plenty.
 */
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
    const arr: Array<{
      id: string;
      current_price: number;
      high_24h: number;
      low_24h: number;
      total_volume: number;
      price_change_percentage_24h: number;
    }> = await r.json();

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

/**
 * Detect a coarse market regime from BTC's 24h move.
 * The browser engine has a richer detector; this is a lightweight server-side proxy.
 */
function detectMarketState(prices: Map<string, PriceData>): string {
  const btc = prices.get('BTCUSDT');
  if (!btc) return 'RANGEBOUND';
  const change = btc.change24h;
  const range = btc.high24h > 0 ? ((btc.high24h - btc.low24h) / btc.price) * 100 : 0;
  const isHighVol = range > 4.5;
  if (change > 2.5)  return isHighVol ? 'BULLISH_HIGH_VOL'  : 'BULLISH_LOW_VOL';
  if (change < -2.5) return isHighVol ? 'BEARISH_HIGH_VOL'  : 'BEARISH_LOW_VOL';
  return 'RANGEBOUND';
}

/**
 * Multi-confirmation signal: combines momentum, mean-reversion, and volume bias.
 * Returns null if no high-conviction trade is found for this pair under this regime.
 */
function generateSignal(
  agent: AgentConfig,
  pair: typeof TRADING_PAIRS[0],
  price: PriceData,
  marketState: string
): { direction: Direction; confidence: number; takeProfitPercent: number; stopLossPercent: number; strategy: string } | null {
  const range = price.high24h > 0 ? ((price.high24h - price.low24h) / price.price) * 100 : 0;
  const positionInRange = price.high24h > price.low24h
    ? (price.price - price.low24h) / (price.high24h - price.low24h)
    : 0.5;

  // Five-signal confirmation system
  const signals = {
    momentum: price.change24h > 1 ? 1 : price.change24h < -1 ? -1 : 0,
    range:    positionInRange > 0.7 ? -1 : positionInRange < 0.3 ? 1 : 0, // mean-reversion
    volatility: range > 3 ? 1 : 0, // prefer trades when there's actual movement
    regimeAlignment: 0,
    agentTypeFit: 0,
  };

  if (marketState.startsWith('BULLISH'))      signals.regimeAlignment = 1;
  else if (marketState.startsWith('BEARISH')) signals.regimeAlignment = -1;

  // Agent personality: AlphaX = trend, BetaX = reversion, GammaX = volatility
  if (agent.type === 'AGGRESSIVE')         signals.agentTypeFit = signals.momentum;
  else if (agent.type === 'BALANCED')      signals.agentTypeFit = -signals.range; // BetaX flips: high-in-range = short
  else                                     signals.agentTypeFit = signals.volatility;

  // Aggregate. Any net bias triggers a trade — we'd rather take a moderate-conviction
  // trade than sit idle. The 24/7 mandate means flat conditions still need exploration.
  const bias = signals.momentum + signals.range + signals.regimeAlignment + signals.agentTypeFit;
  if (Math.abs(bias) < 1) return null;

  const direction: Direction = bias > 0 ? 'LONG' : 'SHORT';
  // Confidence floor 50, ceiling 95. Bias of 1 = 60%, bias of 2 = 70%, bias of 3 = 80%, bias of 4 = 90%.
  const confidence = Math.min(95, 50 + Math.abs(bias) * 10 + signals.volatility * 5);

  if (confidence < 50) return null;

  // Risk-adjusted TP/SL based on 24h range
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

function computeBalance(session: AgentSession | undefined): number {
  if (!session) return INITIAL_BALANCE;
  return INITIAL_BALANCE + (session.balance_delta || 0);
}

function isHaltedByCircuitBreaker(session: AgentSession | undefined): boolean {
  if (!session) return false;
  if (session.circuit_breaker_level === 'L4_HALTED' || session.circuit_breaker_level === 'L5_EMERGENCY') return true;
  if (session.halted_until && new Date(session.halted_until).getTime() > Date.now()) return true;
  return false;
}

// ─── Tick Logic ───────────────────────────────────────────────────────────────

interface TickResult {
  closed: number;
  opened: number;
  skippedNoSignal: number;
  skippedCooldown: number;
  skippedHalted: number;
  errors: string[];
}

async function runTradingTick(): Promise<TickResult> {
  const supabase = getSupabase();
  const result: TickResult = { closed: 0, opened: 0, skippedNoSignal: 0, skippedCooldown: 0, skippedHalted: 0, errors: [] };

  // 1. Load state
  const [pricesResult, sessionsResult, positionsResult] = await Promise.all([
    fetchPrices(),
    supabase.from('arena_agent_sessions').select('*'),
    supabase.from('arena_active_positions').select('*'),
  ]);

  const prices = pricesResult;
  const sessionsByAgent = new Map<string, AgentSession>(
    (sessionsResult.data || []).map((s: AgentSession) => [s.agent_id, s])
  );
  const positionsByAgent = new Map<string, ActivePosition>(
    (positionsResult.data || []).map((p: ActivePosition) => [p.agent_id, p])
  );

  if (prices.size === 0) {
    result.errors.push('Failed to fetch any prices from CoinGecko');
    return result;
  }

  const marketState = detectMarketState(prices);
  const reservedSymbols = new Set<string>(Array.from(positionsByAgent.values()).map(p => p.symbol));

  // 2. Manage existing positions — check TP / SL / TIMEOUT
  for (const [agentId, pos] of positionsByAgent) {
    const price = prices.get(pos.symbol);
    if (!price) continue;
    const isLong = pos.direction === 'LONG';
    const entryTime = new Date(pos.entry_time).getTime();
    const heldMs = Date.now() - entryTime;

    let close = false;
    let reason: CloseReason = 'TIMEOUT';
    let exitPrice = price.price;

    if (isLong) {
      if (price.price >= pos.take_profit_price) { close = true; reason = 'TP'; exitPrice = pos.take_profit_price; }
      else if (price.price <= pos.stop_loss_price) { close = true; reason = 'SL'; exitPrice = pos.stop_loss_price; }
    } else {
      if (price.price <= pos.take_profit_price) { close = true; reason = 'TP'; exitPrice = pos.take_profit_price; }
      else if (price.price >= pos.stop_loss_price) { close = true; reason = 'SL'; exitPrice = pos.stop_loss_price; }
    }

    if (!close && heldMs >= MAX_HOLD_MS) {
      close = true;
      reason = 'TIMEOUT';
      exitPrice = price.price;
    }

    if (close) {
      await closeTrade(supabase, pos, exitPrice, reason, sessionsByAgent.get(agentId));
      result.closed++;
      reservedSymbols.delete(pos.symbol);
      positionsByAgent.delete(agentId);
    }
  }

  // 3. Open new positions for agents without one
  for (const agent of AGENTS) {
    if (positionsByAgent.has(agent.id)) continue;

    const session = sessionsByAgent.get(agent.id);
    if (isHaltedByCircuitBreaker(session)) {
      result.skippedHalted++;
      continue;
    }

    // Cooldown
    const lastTrade = session?.last_trade_time ? new Date(session.last_trade_time).getTime() : 0;
    if (Date.now() - lastTrade < agent.tradeIntervalMs) {
      result.skippedCooldown++;
      continue;
    }

    // Find best pair (not already taken by another agent)
    const availablePairs = TRADING_PAIRS.filter(p => !reservedSymbols.has(p.symbol));
    if (availablePairs.length === 0) {
      result.skippedNoSignal++;
      continue;
    }

    let chosenSignal: ReturnType<typeof generateSignal> = null;
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
      result.skippedNoSignal++;
      continue;
    }

    const price = prices.get(chosenPair.symbol)!;
    const balance = computeBalance(session);
    let notional = balance * (agent.positionSizePercent / 100);
    // Confidence scaling
    notional *= Math.max(0.7, Math.min(1.3, 0.4 + chosenSignal.confidence / 100));
    notional = Math.min(notional, MAX_POSITION_USD);
    notional = Math.max(notional, MIN_POSITION_USD);

    if (notional < MIN_POSITION_USD || notional > balance * 0.5) {
      result.skippedNoSignal++;
      continue;
    }

    await openPosition(supabase, agent, chosenPair, price, chosenSignal, notional, marketState);
    result.opened++;
    reservedSymbols.add(chosenPair.symbol);
  }

  return result;
}

async function openPosition(
  supabase: any,
  agent: AgentConfig,
  pair: typeof TRADING_PAIRS[0],
  price: PriceData,
  signal: NonNullable<ReturnType<typeof generateSignal>>,
  notional: number,
  marketState: string,
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
    console.error(`[trade-tick] open failed for ${agent.id}:`, error.message);
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
): Promise<void> {
  const isLong = pos.direction === 'LONG';
  const pnlPercent = isLong
    ? ((exitPrice - pos.entry_price) / pos.entry_price) * 100
    : ((pos.entry_price - exitPrice) / pos.entry_price) * 100;
  const notional = pos.quantity * pos.entry_price;
  const pnlDollar = (pnlPercent / 100) * notional;
  const isWin = pnlPercent > 0;

  // 1. Insert into trade history
  await supabase.from('arena_trade_history').insert({
    agent_id: pos.agent_id,
    timestamp: new Date().toISOString(),
    symbol: pos.symbol,
    direction: pos.direction,
    entry_price: pos.entry_price,
    exit_price: exitPrice,
    quantity: pos.quantity,
    pnl_percent: pnlPercent,
    pnl_dollar: pnlDollar,
    is_win: isWin,
    strategy: pos.strategy,
    market_state: pos.market_state_at_entry,
    reason,
  });

  // 2. Delete active position
  await supabase.from('arena_active_positions').delete().eq('agent_id', pos.agent_id);

  // 3. Update session — accumulate stats + circuit breaker logic
  const consecutive = isWin ? 0 : (session?.consecutive_losses ?? 0) + 1;
  let circuitLevel = 'ACTIVE';
  let haltedUntil: string | null = null;
  if (consecutive >= 5)      { circuitLevel = 'L4_HALTED';   haltedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString(); }
  else if (consecutive >= 4) { circuitLevel = 'L3_MINIMAL';  }
  else if (consecutive >= 3) { circuitLevel = 'L1_CAUTIOUS'; }

  const newDelta = (session?.balance_delta ?? 0) + pnlDollar;
  // Stop-loss floor: if balance dropped below 50% of initial, halt
  if (INITIAL_BALANCE + newDelta < INITIAL_BALANCE * 0.5) {
    circuitLevel = 'L5_EMERGENCY';
    haltedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  await supabase.from('arena_agent_sessions').upsert({
    agent_id: pos.agent_id,
    trades: (session?.trades ?? 0) + 1,
    wins: (session?.wins ?? 0) + (isWin ? 1 : 0),
    pnl: (session?.pnl ?? 0) + pnlPercent,
    balance_delta: newDelta,
    consecutive_losses: consecutive,
    circuit_breaker_level: circuitLevel,
    halted_until: haltedUntil,
    last_trade_time: new Date().toISOString(),
  }, { onConflict: 'agent_id' });

  console.info(`[trade-tick] CLOSE ${pos.agent_id} ${pos.direction} ${pos.display_symbol} ${reason} pnl=${pnlPercent.toFixed(2)}% ($${pnlDollar.toFixed(2)}) consec=${consecutive}`);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
  // For manual triggering, the same header works.
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
    console.info(`[trade-tick] DONE in ${elapsedMs}ms`, result);
    return res.status(200).json({ ok: true, elapsedMs, ...result });
  } catch (err: any) {
    console.error('[trade-tick] FATAL', err);
    return res.status(500).json({ error: 'Tick failed', message: err?.message });
  }
}

export const config = {
  maxDuration: 30,
};
