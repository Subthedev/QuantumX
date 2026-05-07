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
  change7d: number;       // higher-timeframe trend (free from CoinGecko's markets endpoint)
  high24h: number;
  low24h: number;
  volume: number;
}

// ─── Risk parameters ──────────────────────────────────────────────────────────

const INITIAL_BALANCE = 10_000;
const MAX_POSITION_USD = 2_500;
const MIN_POSITION_USD = 200;
// Hold window matches signal-tick TTL. With 1.5×ATR(30m) stops and ~2×ATR
// targets, a 60-min cap forced ~95% of closes to TIMEOUT — no real W/L
// signal for the brain to learn from. 4h aligns the trade horizon with
// the same TP/SL math the targets are sized for.
const MAX_HOLD_MS = 4 * 60 * 60 * 1000;
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
// Primary: CoinGecko (1 batched call, includes 24h high/low/volume + 7d change).
// Fallback: CoinPaprika per-pair (CoinGecko throttles AWS IPs randomly; this
// keeps the cron alive instead of skipping the whole tick).

const COINPAPRIKA_IDS: Record<string, string> = {
  BTCUSDT:  'btc-bitcoin',
  ETHUSDT:  'eth-ethereum',
  SOLUSDT:  'sol-solana',
  BNBUSDT:  'bnb-binance-coin',
  XRPUSDT:  'xrp-xrp',
  DOGEUSDT: 'doge-dogecoin',
};

// Coinbase Exchange product mapping. BNB isn't listed on Coinbase US; missing
// pairs simply stay missing and don't trade this tick.
const COINBASE_PRODUCTS: Record<string, string> = {
  BTCUSDT:  'BTC-USD',
  ETHUSDT:  'ETH-USD',
  SOLUSDT:  'SOL-USD',
  XRPUSDT:  'XRP-USD',
  DOGEUSDT: 'DOGE-USD',
  // BNB not on Coinbase
};

/**
 * Coinbase Exchange fallback. The most reliable price source from AWS-hosted
 * Vercel functions because Coinbase itself runs on AWS — no IP-block games.
 *
 * Two-call pattern per pair: /products/{id}/stats (24h high/low/last/volume)
 * + /products/{id}/ticker (current price). Stats has 30d open which we use
 * as a proxy for change24h. We pull ticker for current_price + Coinbase
 * doesn't expose direct change24h, so we compute it from open-vs-last.
 */
async function fetchPricesCoinbase(map: Map<string, PriceData>): Promise<number> {
  const missing = TRADING_PAIRS.filter(p => !map.has(p.symbol) && COINBASE_PRODUCTS[p.symbol]);
  if (missing.length === 0) return 0;
  let filled = 0;
  await Promise.all(missing.map(async pair => {
    const product = COINBASE_PRODUCTS[pair.symbol];
    const url = `https://api.exchange.coinbase.com/products/${product}/stats`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      clearTimeout(t);
      if (!r.ok) return;
      const stats: any = await r.json();
      const open = Number(stats.open ?? 0);
      const last = Number(stats.last ?? 0);
      const high = Number(stats.high ?? last);
      const low  = Number(stats.low  ?? last);
      const vol  = Number(stats.volume ?? 0);
      if (last <= 0 || open <= 0) return;
      const change24h = ((last - open) / open) * 100;
      // Coinbase doesn't ship 7d change in /stats. Approximate with 0; most
      // downstream code treats change7d as a soft tilt only.
      map.set(pair.symbol, {
        symbol:   pair.symbol,
        price:    last,
        change24h,
        change7d: 0,
        high24h:  high,
        low24h:   low,
        volume:   vol,
      });
      filled++;
    } catch {
      clearTimeout(t);
    }
  }));
  return filled;
}

async function fetchPricesCoinPaprika(map: Map<string, PriceData>): Promise<number> {
  const missing = TRADING_PAIRS.filter(p => !map.has(p.symbol));
  if (missing.length === 0) return 0;
  let filled = 0;
  await Promise.all(missing.map(async pair => {
    const cpId = COINPAPRIKA_IDS[pair.symbol];
    if (!cpId) return;
    const url = `https://api.coinpaprika.com/v1/tickers/${cpId}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      clearTimeout(t);
      if (!r.ok) return;
      const data: any = await r.json();
      const usd = data?.quotes?.USD;
      if (!usd?.price) return;
      // CoinPaprika has no 24h high/low — synthesize from price ± half the
      // |24h move|. Good enough for the regime/range gates downstream.
      const change24h = Number(usd.percent_change_24h ?? 0);
      const change7d  = Number(usd.percent_change_7d  ?? 0);
      const moveAbs = Math.abs((change24h / 100) * usd.price);
      map.set(pair.symbol, {
        symbol:   pair.symbol,
        price:    Number(usd.price),
        change24h,
        change7d,
        high24h:  usd.price + moveAbs / 2,
        low24h:   usd.price - moveAbs / 2,
        volume:   Number(usd.volume_24h ?? 0),
      });
      filled++;
    } catch {
      clearTimeout(t);
    }
  }));
  return filled;
}

async function fetchPrices(): Promise<Map<string, PriceData>> {
  const map = new Map<string, PriceData>();
  const ids = TRADING_PAIRS.map(p => p.coingeckoId).join(',');
  // price_change_percentage=24h,7d — gets us the higher-timeframe trend in
  // the same call so multi-timeframe alignment is free (no extra HTTP).
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d`;

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
      price_change_percentage_7d_in_currency?: number;
    }>;

    const idToPair = new Map(TRADING_PAIRS.map(p => [p.coingeckoId, p]));
    for (const row of arr) {
      const pair = idToPair.get(row.id);
      if (!pair) continue;
      map.set(pair.symbol, {
        symbol: pair.symbol,
        price: row.current_price,
        change24h: row.price_change_percentage_24h ?? 0,
        change7d: row.price_change_percentage_7d_in_currency ?? 0,
        high24h: row.high_24h ?? row.current_price,
        low24h: row.low_24h ?? row.current_price,
        volume: row.total_volume ?? 0,
      });
    }
  } catch (err: any) {
    clearTimeout(timeout);
    console.error('[trade-tick] CoinGecko fetch failed:', err?.message);
  }

  // Fallback chain. Both CoinGecko AND CoinPaprika get throttled from AWS
  // IPs in production (we've seen ticks return zero pairs from both). Coinbase
  // Exchange runs on AWS itself, so it never IP-blocks — it's the third-tier
  // safety net. Each fallback only fills pairs the previous tiers missed.
  if (map.size < TRADING_PAIRS.length) {
    const beforeCp = map.size;
    const cpFilled = await fetchPricesCoinPaprika(map);
    if (cpFilled > 0) {
      console.info(`[trade-tick] CoinPaprika fallback filled ${cpFilled}/${TRADING_PAIRS.length - beforeCp} missing pairs`);
    }
  }
  if (map.size < TRADING_PAIRS.length) {
    const beforeCb = map.size;
    const cbFilled = await fetchPricesCoinbase(map);
    if (cbFilled > 0) {
      console.info(`[trade-tick] Coinbase fallback filled ${cbFilled}/${TRADING_PAIRS.length - beforeCb} missing pairs`);
    }
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
  const { error } = await supabase.rpc('worker_upsert_market_state', {
    p_secret: process.env.CRON_SECRET ?? '',
    p_state: snap.state,
    p_confidence: snap.confidence,
    p_volatility: snap.volatility,
    p_trend_strength: snap.trendStrength,
  });
  if (error) console.warn('[trade-tick] arena_market_state upsert failed:', error.message);
}

// ─── ATR fetch + compute ─────────────────────────────────────────────────────

interface AtrData {
  symbol: string;
  atrPercent: number;     // ATR(14) as % of last close
  sampleSize: number;
}

/**
 * Fetch CoinGecko OHLC (30-min candles, last 24h) for each pair in parallel
 * and compute ATR(14) as a % of current price. Used to size stop losses to
 * realized volatility instead of the cruder 24h range.
 *
 * Endpoint: /coins/{id}/ohlc?days=1 → ~48 candles of 30-min OHLC.
 * 6 calls × ~250ms parallel ≈ 300ms total. Within free-tier rate limits.
 */
async function fetchAtrForPairs(): Promise<Map<string, AtrData>> {
  const map = new Map<string, AtrData>();
  await Promise.all(TRADING_PAIRS.map(async pair => {
    const url = `https://api.coingecko.com/api/v3/coins/${pair.coingeckoId}/ohlc?vs_currency=usd&days=1`;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 7000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { 'accept': 'application/json' } });
      clearTimeout(timeout);
      if (!r.ok) return;
      const candles = (await r.json()) as Array<[number, number, number, number, number]>;
      if (!Array.isArray(candles) || candles.length < 15) return;
      // Use the last 15 candles → 14 True Range values for ATR(14)
      const recent = candles.slice(-15);
      let trSum = 0;
      for (let i = 1; i < recent.length; i++) {
        const [, , high, low] = recent[i];
        const prevClose = recent[i - 1][4];
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trSum += tr;
      }
      const atr14 = trSum / (recent.length - 1);
      const lastClose = recent[recent.length - 1][4];
      const atrPercent = lastClose > 0 ? (atr14 / lastClose) * 100 : 0;
      if (atrPercent > 0) {
        map.set(pair.symbol, { symbol: pair.symbol, atrPercent, sampleSize: recent.length - 1 });
      }
    } catch {
      clearTimeout(timeout);
      // Silent — fall back to range-based stops for this pair
    }
  }));
  return map;
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
  atr: AtrData | undefined,
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
  // BALANCED (Beta) is a contrarian — fade extremes. range is already the mean-reversion
  // direction (oversold→+1, overbought→-1), so we ADD it (not negate it) to weight reversion
  // higher. The previous `-signals.range` cancelled with `signals.range` and made Beta a
  // degenerate trend-follower — same as Alpha but with worse params.
  else if (agent.type === 'BALANCED') signals.agentTypeFit = signals.range;
  else                                signals.agentTypeFit = signals.volatility;

  const bias = signals.momentum + signals.range + signals.regimeAlignment + signals.agentTypeFit;
  if (Math.abs(bias) < 1) return null;

  const direction: Direction = bias > 0 ? 'LONG' : 'SHORT';
  const confidence = Math.min(95, 50 + Math.abs(bias) * 10 + signals.volatility * 5);
  if (confidence < 50) return null;

  const isHighVol = marketState.includes('HIGH_VOL');
  const isRangebound = marketState === 'RANGEBOUND';
  let tp: number;
  let sl: number;
  let strategy: string;

  if (atr && atr.atrPercent > 0) {
    // ATR-based stops: SL at 1.5×ATR(14, 30m) — sits just outside normal noise.
    // Light regime tilt: high-vol regimes earn slightly wider stops, ranges tighter.
    // TP keeps the agent's preferred R:R (capped at MIN_RR for safety).
    const regimeMult = isHighVol ? 1.2 : (isRangebound ? 0.9 : 1.0);
    sl = atr.atrPercent * 1.5 * regimeMult;
    tp = sl * Math.max(MIN_RR, agent.baseTPPercent / agent.baseSLPercent);
    strategy = `${agent.type.toLowerCase()}-atr`;
  } else {
    // Fallback path — keep the original range-based sizing for parity
    const volMultiplier = isHighVol ? 1.4 : (isRangebound ? 0.7 : 1.0);
    const rangeAdjustment = Math.min(1.5, Math.max(0.6, range / 4));
    tp = agent.baseTPPercent * volMultiplier * rangeAdjustment;
    sl = agent.baseSLPercent * volMultiplier * rangeAdjustment;
    if (tp / sl < MIN_RR) tp = sl * MIN_RR;
    strategy = `${agent.type.toLowerCase()}-multi-confirm`;
  }

  tp = Math.min(TP_CAP_PERCENT, Math.max(1.5, tp));
  sl = Math.min(SL_CAP_PERCENT, Math.max(0.75, sl));

  return {
    direction,
    confidence,
    takeProfitPercent: tp,
    stopLossPercent: sl,
    strategy,
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

// ─── Correlation gate ─────────────────────────────────────────────────────────
// Static 30-day correlation map — refreshed manually if/when the universe
// changes. Source: rolling Pearson on 30d daily closes from Binance.
// Above CORRELATION_THRESHOLD, two agents going same-direction is a
// concentrated bet, not a diversified one.
const CORRELATION_MAP: Record<string, Record<string, number>> = {
  BTCUSDT:  { ETHUSDT: 0.88, SOLUSDT: 0.82, BNBUSDT: 0.78, XRPUSDT: 0.65, DOGEUSDT: 0.70 },
  ETHUSDT:  { BTCUSDT: 0.88, SOLUSDT: 0.85, BNBUSDT: 0.80, XRPUSDT: 0.62, DOGEUSDT: 0.72 },
  SOLUSDT:  { BTCUSDT: 0.82, ETHUSDT: 0.85, BNBUSDT: 0.75, XRPUSDT: 0.60, DOGEUSDT: 0.68 },
  BNBUSDT:  { BTCUSDT: 0.78, ETHUSDT: 0.80, SOLUSDT: 0.75, XRPUSDT: 0.55, DOGEUSDT: 0.55 },
  XRPUSDT:  { BTCUSDT: 0.65, ETHUSDT: 0.62, SOLUSDT: 0.60, BNBUSDT: 0.55, DOGEUSDT: 0.50 },
  DOGEUSDT: { BTCUSDT: 0.70, ETHUSDT: 0.72, SOLUSDT: 0.68, BNBUSDT: 0.55, XRPUSDT: 0.50 },
};
const CORRELATION_THRESHOLD = 0.85;

interface OpenIntent { symbol: string; direction: Direction; }

function findCorrelatedConflict(
  newSymbol: string,
  newDirection: Direction,
  existing: OpenIntent[],
): { symbol: string; corr: number } | null {
  const corrMap = CORRELATION_MAP[newSymbol] ?? {};
  for (const e of existing) {
    if (e.symbol === newSymbol) continue;
    if (e.direction !== newDirection) continue;
    const corr = corrMap[e.symbol] ?? 0;
    if (corr > CORRELATION_THRESHOLD) return { symbol: e.symbol, corr };
  }
  return null;
}

// ─── Published intelligence signals (consumed from signal-tick) ───────────────
// signal-tick publishes top-confidence multi-confirmation candidates to
// `intelligence_signals` every 5 min. trade-tick reads these and uses them
// as a confidence overlay: same direction → boost, disagreement → penalty.
// This is the cheapest "wire what's already there" intelligence integration
// available given the self-contained constraint — signal-tick is already
// running, already publishing, so this is pure-read-side glue.
interface PublishedSignal {
  fullSymbol: string;     // 'BTCUSDT' (signal-tick stores 'BTC' as ticker)
  direction: Direction;
  confidence: number;
  expiresAt: number;
  regime: string;
}

async function loadActivePublishedSignals(supabase: any): Promise<Map<string, PublishedSignal>> {
  const map = new Map<string, PublishedSignal>();
  // Last 15 min — signal-tick runs every 5 min so this gives us up to 3 ticks
  const sinceCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  try {
    const { data, error } = await supabase
      .from('intelligence_signals')
      .select('symbol, signal_type, confidence, expires_at, regime, created_at')
      .eq('status', 'active')
      .gte('created_at', sinceCutoff)
      .order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) return map;
    const now = Date.now();
    for (const row of data) {
      if (!row.symbol || !row.signal_type) continue;
      const expiresAtMs = row.expires_at ? new Date(row.expires_at).getTime() : 0;
      if (expiresAtMs <= now) continue;
      const fullSymbol = `${String(row.symbol).toUpperCase()}USDT`;
      // Keep only the most-recent active signal per pair
      if (!map.has(fullSymbol)) {
        map.set(fullSymbol, {
          fullSymbol,
          direction: row.signal_type as Direction,
          confidence: Number(row.confidence) || 0,
          expiresAt: expiresAtMs,
          regime: row.regime ?? 'RANGEBOUND',
        });
      }
    }
  } catch (err: any) {
    console.warn('[trade-tick] loadActivePublishedSignals failed:', err?.message);
  }
  return map;
}

/**
 * Apply published-signal alignment to a candidate's confidence.
 * Same direction → boost; opposite direction → penalty (disagreement).
 * Returns adjusted confidence + a one-line annotation if alignment changed it.
 *
 * Phase 2 wiring: scaled by `signalQuality[symbol-regime]` from autonomous_state
 * (populated by signal-tick's resolver). When historical Hub-signal accuracy
 * for this pair+regime is high (>0.6), boost magnitude grows; when accuracy
 * is low (<0.4), boost is attenuated and conflict penalty also softens. So a
 * signal generator that's been wrong all day stops bullying the Arena's
 * native judgment.
 */
function applyPublishedSignalAlignment(
  baseConfidence: number,
  direction: Direction,
  pairSymbol: string,
  published: Map<string, PublishedSignal>,
  signalQuality?: Record<string, number>,
): { confidence: number; note: string | null } {
  const sig = published.get(pairSymbol);
  if (!sig) return { confidence: baseConfidence, note: null };

  // Lookup quality EMA (0..1, default 0.5 = neutral). Map 0.5 → 1.0x, 0.8 → 1.6x,
  // 0.2 → 0.4x. Clamped so a single bad cell can't completely silence the source.
  const ticker = pairSymbol.replace(/USDT$/, '');
  const qKey = `${ticker}-${sig.regime}`;
  const q = signalQuality?.[qKey];
  const qMult = (typeof q === 'number') ? Math.max(0.4, Math.min(1.6, 0.4 + 1.2 * q)) : 1.0;

  if (sig.direction === direction) {
    const baseBoost = Math.min(8, Math.max(2, sig.confidence / 10));
    const boost = baseBoost * qMult;
    const adjusted = Math.min(95, baseConfidence + boost);
    const qNote = q != null ? ` q=${(q * 100).toFixed(0)}%` : '';
    return { confidence: adjusted, note: `pub-aligned ${sig.direction}@${sig.confidence}+${boost.toFixed(1)}${qNote}` };
  }
  const basePenalty = Math.min(12, Math.max(4, sig.confidence / 8));
  // For disagreement, qMult > 1 means signal usually right → bigger penalty
  // for going against it; qMult < 1 means usually wrong → smaller penalty.
  const penalty = basePenalty * qMult;
  const adjusted = Math.max(0, baseConfidence - penalty);
  const qNote = q != null ? ` q=${(q * 100).toFixed(0)}%` : '';
  return { confidence: adjusted, note: `pub-conflict ${sig.direction}@${sig.confidence}-${penalty.toFixed(1)}${qNote}` };
}

// ─── Brain (per-strategy bias EMA) ────────────────────────────────────────────
// Persisted to autonomous_state.state.strategyBias.
// Key: `${strategy}-${regime}` → 0.5..1.5 multiplier on notional.
// Update: alpha=0.1 EMA toward 1.3 (win) or 0.7 (loss). Clamped [0.5, 1.5]
// inside getStrategyBias to cap upside/downside per-trade. Strategies that
// consistently win in a regime get bigger trades; consistent losers get smaller.
// ─── Brain v2 ─────────────────────────────────────────────────────────────────
// Multi-dimensional learning brain. Every closed trade updates 5 things:
//   1. strategyBias EMA per (strategy, regime)         — position-size scaling
//   2. strategyOutcomes rolling window                  — auto-disable/boost gates
//   3. intelStats[regime].{sentiment,cascade}           — does that intel signal predict wins HERE?
//   4. confidenceCal[bin]                               — does our X% confidence ACTUALLY win X%?
//   5. pendingIntel[agent_id] is consumed (deleted)     — snapshot of intel-at-open for credit assignment
//
// The state.openIntel snapshot is written when a position opens and read when
// it closes so we can credit-assign which intel features helped/hurt this trade.
//
// All persisted to autonomous_state.state. Trimmed on persist to keep JSONB lean.
interface IntelSourceStats {
  trades: number;     // # trades where this intel source was active (|bias| ≥ threshold)
  wins: number;
  contribution: number;  // EMA win-rate (0..1), prior 0.5
}
interface IntelSnapshot {
  strategy: string;
  regime: string;
  direction: Direction;
  symbol: string;
  rawConfidence: number;
  effConfidence: number;
  sentBias: number;
  liqBias: number;
  pubDelta: number;        // signal-tick alignment delta at open
  mtfBias: number;         // 7d trend alignment at open
  fearGreed: number;
  cascadeIntensity: number;
  openedAt: number;
}
interface BrainState {
  strategyBias: Record<string, number>;                  // EMA per strategy-regime key
  strategyOutcomes: Record<string, number[]>;            // rolling last 20 outcomes (1=win, 0=loss)
  intelStats: Record<string, { sentiment: IntelSourceStats; cascade: IntelSourceStats }>;  // per-regime intel effectiveness
  confidenceCal: Record<string, { trades: number; wins: number }>;                          // bin → calibration
  pendingIntel: Record<string, IntelSnapshot>;           // agent_id → intel-at-open
  mlWeights?: MLWeights;                                  // online logistic regression coefficients
  signalQuality?: Record<string, number>;                // 0..1 EMA of Hub signal accuracy per `${ticker}-${regime}` (written by signal-tick)
}
// Forward-declared so BrainState compiles before the ML block defines it
interface MLWeights {
  w: number[];
  trained: number;
}
const DEFAULT_INTEL_SOURCE: IntelSourceStats = { trades: 0, wins: 0, contribution: 0.5 };
const DEFAULT_BRAIN: BrainState = {
  strategyBias: {},
  strategyOutcomes: {},
  intelStats: {},
  confidenceCal: {},
  pendingIntel: {},
};
const BIAS_ALPHA = 0.1;
const OUTCOME_WINDOW = 20;
const AUTO_DISABLE_WR = 0.40;       // < 40% over last 20 → bias clamped to 0.1
const AUTO_BOOST_WR = 0.65;         // > 65% over last 20 → bias clamped to 1.5
const AUTO_GATE_MIN_TRADES = 10;    // need at least this many before override kicks in
const INTEL_ALPHA = 0.12;           // intelStats EMA rate (slightly faster than strategy bias)
const INTEL_ACTIVE_THRESHOLD = 2;   // |bias| ≥ 2 = "this intel source actively contributed"
const INTEL_MIN_TRADES = 8;         // need this many before applying multiplier
const CONFCAL_MIN_TRADES = 8;       // need this many in a bin before remapping

async function loadBrain(supabase: any): Promise<{ brain: BrainState; rawState: any }> {
  const fresh = (): BrainState => ({
    strategyBias: {},
    strategyOutcomes: {},
    intelStats: {},
    confidenceCal: {},
    pendingIntel: {},
  });
  // Hydrate mlWeights from a JSONB blob, validating shape — fall back to a
  // zero-initialized 9-coefficient vector if anything is wrong (forward-compatible
  // with feature-vector size changes since we'd just relearn).
  const hydrateWeights = (raw: any): MLWeights | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    if (!Array.isArray(raw.w) || raw.w.length !== 9) return { w: new Array(9).fill(0), trained: 0 };
    const w = raw.w.map((v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : 0));
    const trained = typeof raw.trained === 'number' ? raw.trained : 0;
    return { w, trained };
  };
  try {
    const { data, error } = await supabase
      .from('autonomous_state')
      .select('state')
      .eq('id', 'singleton')
      .single();
    if (error || !data?.state) return { brain: fresh(), rawState: {} };
    const s = data.state;
    return {
      brain: {
        strategyBias:     s.strategyBias     && typeof s.strategyBias     === 'object' ? { ...s.strategyBias }     : {},
        signalQuality:    s.signalQuality    && typeof s.signalQuality    === 'object' ? { ...s.signalQuality }    : {},
        strategyOutcomes: s.strategyOutcomes && typeof s.strategyOutcomes === 'object' ? { ...s.strategyOutcomes } : {},
        intelStats:       s.intelStats       && typeof s.intelStats       === 'object' ? { ...s.intelStats }       : {},
        confidenceCal:    s.confidenceCal    && typeof s.confidenceCal    === 'object' ? { ...s.confidenceCal }    : {},
        pendingIntel:     s.pendingIntel     && typeof s.pendingIntel     === 'object' ? { ...s.pendingIntel }     : {},
        mlWeights:        hydrateWeights(s.mlWeights),
      },
      rawState: s,
    };
  } catch {
    return { brain: fresh(), rawState: {} };
  }
}

async function persistBrain(
  supabase: any,
  rawState: any,
  brain: BrainState,
  lastTick?: any,                          // optional heartbeat payload
): Promise<void> {
  // Trim bias entries that have drifted back to ~1.0 (no signal) to keep JSONB lean
  const trimmedBias: Record<string, number> = {};
  for (const [k, v] of Object.entries(brain.strategyBias)) {
    if (Math.abs(v - 1.0) > 0.05) trimmedBias[k] = v;
  }
  // Garbage-collect stale pendingIntel entries (>2h old). Should normally clear
  // when their position closes, but a crash mid-tick could orphan one.
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  const liveIntel: Record<string, IntelSnapshot> = {};
  for (const [k, v] of Object.entries(brain.pendingIntel)) {
    if (v.openedAt >= cutoff) liveIntel[k] = v;
  }
  // Re-read signalQuality* RIGHT before persist so we don't clobber a write
  // signal-tick performed during this trade-tick run. signal-tick is the only
  // writer for those keys; trade-tick is read-only there.
  let freshSQ = rawState?.signalQuality;
  let freshSQCount = rawState?.signalQualityCount;
  let freshSQUpdate = rawState?.signalQualityLastUpdate;
  try {
    const { data: fresh } = await supabase
      .from('autonomous_state')
      .select('state')
      .eq('id', 'singleton')
      .single();
    if (fresh?.state) {
      if (fresh.state.signalQuality)            freshSQ       = fresh.state.signalQuality;
      if (fresh.state.signalQualityCount)       freshSQCount  = fresh.state.signalQualityCount;
      if (fresh.state.signalQualityLastUpdate)  freshSQUpdate = fresh.state.signalQualityLastUpdate;
    }
  } catch { /* swallow — fall back to rawState values */ }

  const newState: any = {
    ...rawState,
    strategyBias: trimmedBias,
    strategyOutcomes: brain.strategyOutcomes,
    intelStats: brain.intelStats,
    confidenceCal: brain.confidenceCal,
    pendingIntel: liveIntel,
    mlWeights: brain.mlWeights ?? null,    // null when never trained
    brainLastUpdate: Date.now(),
  };
  if (freshSQ)       newState.signalQuality           = freshSQ;
  if (freshSQCount)  newState.signalQualityCount      = freshSQCount;
  if (freshSQUpdate) newState.signalQualityLastUpdate = freshSQUpdate;
  // Heartbeat snapshot. Always written when supplied so external monitors
  // can verify the engine is alive even on zero-activity ticks.
  if (lastTick) newState.lastTick = lastTick;
  // Preserve killSwitch flag — the operator's pause should NOT be silently
  // cleared by a brain persist that didn't know about it.
  if (typeof rawState?.killSwitch === 'boolean') newState.killSwitch = rawState.killSwitch;

  const { error } = await supabase
    .from('autonomous_state')
    .upsert({ id: 'singleton', state: newState, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) console.warn('[trade-tick] brain persist failed:', error.message);
}

// ─── Brain v2 helpers: intel learning + confidence calibration ────────────────

function confidenceBin(conf: number): string {
  if (conf < 60)  return '50-60';
  if (conf < 70)  return '60-70';
  if (conf < 80)  return '70-80';
  if (conf < 90)  return '80-90';
  return '90-100';
}

/**
 * Apply intel learning at close. Updates intelStats EMA per regime+source
 * (only for sources that were "active" at open — |bias| ≥ threshold) and
 * confidence calibration. Consumes the pendingIntel snapshot.
 */
function applyIntelLearning(brain: BrainState, agentId: string, isWin: boolean): IntelSnapshot | null {
  const snap = brain.pendingIntel[agentId];
  if (!snap) return null;

  const stats = brain.intelStats[snap.regime] ?? {
    sentiment: { ...DEFAULT_INTEL_SOURCE },
    cascade:   { ...DEFAULT_INTEL_SOURCE },
  };

  // Sentiment was directionally aligned with the trade (bias ≥ threshold)
  if (snap.sentBias >= INTEL_ACTIVE_THRESHOLD) {
    stats.sentiment.trades++;
    if (isWin) stats.sentiment.wins++;
    stats.sentiment.contribution = stats.sentiment.contribution * (1 - INTEL_ALPHA) + (isWin ? 1 : 0) * INTEL_ALPHA;
  }
  // Cascade was directionally aligned
  if (snap.liqBias >= INTEL_ACTIVE_THRESHOLD) {
    stats.cascade.trades++;
    if (isWin) stats.cascade.wins++;
    stats.cascade.contribution = stats.cascade.contribution * (1 - INTEL_ALPHA) + (isWin ? 1 : 0) * INTEL_ALPHA;
  }
  brain.intelStats[snap.regime] = stats;

  // Confidence calibration on the eff confidence we actually used to decide
  const bin = confidenceBin(snap.effConfidence);
  const cal = brain.confidenceCal[bin] ?? { trades: 0, wins: 0 };
  cal.trades++;
  if (isWin) cal.wins++;
  brain.confidenceCal[bin] = cal;

  delete brain.pendingIntel[agentId];
  return snap;
}

/**
 * Multiplier for an intel source's bias based on its learned predictive power
 * in this regime. <1 dampens, >1 amplifies, default 1 (no data).
 */
function intelMultiplier(brain: BrainState, regime: string, source: 'sentiment' | 'cascade'): number {
  const s = brain.intelStats[regime]?.[source];
  if (!s || s.trades < INTEL_MIN_TRADES) return 1.0;
  // contribution 0.5 (random) → 1.0x. Above 0.5 → up to 1.5x. Below 0.5 → down to 0.4x.
  const c = s.contribution;
  if (c >= 0.5) return Math.min(1.5, 1 + (c - 0.5) * 1.0);
  return Math.max(0.4, 1 - (0.5 - c) * 1.2);
}

/**
 * Confidence calibration multiplier. If our 80%-confidence trades actually
 * win 60% of the time, we should treat 80% as more like 60% — return 0.75.
 * Returns 1.0 (no remap) when we have <8 trades in the bin.
 */
function confidenceCalMultiplier(brain: BrainState, conf: number): number {
  if (conf <= 0) return 1.0;
  const cal = brain.confidenceCal[confidenceBin(conf)];
  if (!cal || cal.trades < CONFCAL_MIN_TRADES) return 1.0;
  const actual = cal.wins / cal.trades;            // realized hit rate (0..1)
  const expected = conf / 100;                     // what we claimed
  if (expected <= 0) return 1.0;
  // Limit the swing to ±40% so bad bin samples don't crash decisions
  return Math.max(0.6, Math.min(1.4, actual / expected));
}

/**
 * Returns the bias multiplier for a (strategy, regime) cell.
 *
 * Auto-disable / auto-boost overrides the EMA when we have enough samples:
 *   - WR < 40% over last 20 → 0.1 (effectively muted)
 *   - WR > 65% over last 20 → 1.5 (max amplified)
 *   - else → EMA value, clamped [0.5, 1.5]
 *
 * The override fires only when n ≥ AUTO_GATE_MIN_TRADES so we don't slam a
 * strategy after a 2-trade losing streak.
 */
function getStrategyBias(brain: BrainState, strategy: string, regime: string): { bias: number; reason: string } {
  const key = `${strategy}-${regime}`;
  const outcomes = brain.strategyOutcomes[key];
  if (Array.isArray(outcomes) && outcomes.length >= AUTO_GATE_MIN_TRADES) {
    const wr = outcomes.reduce((s, v) => s + v, 0) / outcomes.length;
    if (wr < AUTO_DISABLE_WR) return { bias: 0.1, reason: `auto-disable WR=${(wr * 100).toFixed(0)}% n=${outcomes.length}` };
    if (wr > AUTO_BOOST_WR) return { bias: 1.5, reason: `auto-boost WR=${(wr * 100).toFixed(0)}% n=${outcomes.length}` };
  }
  const v = brain.strategyBias[key] ?? brain.strategyBias[strategy] ?? 1.0;
  return { bias: Math.max(0.5, Math.min(1.5, v)), reason: 'ema' };
}

function updateStrategyBias(brain: BrainState, strategy: string, regime: string, isWin: boolean): void {
  const key = `${strategy}-${regime}`;
  // EMA bias update
  const current = brain.strategyBias[key] ?? 1.0;
  const target = isWin ? 1.3 : 0.7;
  brain.strategyBias[key] = Math.max(0.1, Math.min(2.0, current * (1 - BIAS_ALPHA) + target * BIAS_ALPHA));
  // Rolling outcome window (1=win, 0=loss)
  const arr = brain.strategyOutcomes[key] ?? [];
  arr.push(isWin ? 1 : 0);
  if (arr.length > OUTCOME_WINDOW) arr.splice(0, arr.length - OUTCOME_WINDOW);
  brain.strategyOutcomes[key] = arr;
}

// ─── Inline ML: logistic regression with online SGD ──────────────────────────
// Captures FEATURE INTERACTIONS that the per-source EMAs (intelStats) cannot.
// E.g. "high sentiment AND low cascade pressure" can be a different signal
// than either feature alone — LR learns this through coefficients on the
// joint feature vector. Per-source EMAs treat each feature independently.
//
// Features (z-scored using fixed scales — crypto features are bounded):
//   x0 = bias                            (always 1)
//   x1 = (rawConfidence - 70) / 15       (typical conf is 60-95)
//   x2 = sentBias / 12                   (typical -12..+12)
//   x3 = liqBias / 12
//   x4 = pubDelta / 10                   (typical -12..+8)
//   x5 = mtfBias / 12
//   x6 = isHighVol                       (regime indicator)
//   x7 = isBullishRegime                 (regime indicator)
//   x8 = isBearishRegime                 (regime indicator)
//
// Output: pWin in (0, 1) via sigmoid. Trained online with logistic loss
// (cross-entropy + L2 regularization) on each closed trade.
//
// Conservative defaults:
//   - Cold-start: weights = 0 → pWin = 0.5 → mlDelta = 0 (no opinion until trained)
//   - Once trained ≥ ML_MIN_TRADES, pWin starts influencing decisions
//   - Magnitude capped at ±10 confidence pts so ML can't dominate the decision

// MLWeights interface is forward-declared next to BrainState so it can be referenced there.

const ML_FEATURE_COUNT = 9;
const ML_LR = 0.05;             // SGD learning rate
const ML_L2 = 0.001;             // L2 regularization
const ML_MIN_TRADES = 12;        // # trades before pWin actually adjusts decisions
const ML_DELTA_CAP = 10;         // max |confidence delta| from ML

interface MLFeatureInput {
  rawConf: number;
  sentBias: number;
  liqBias: number;
  pubDelta: number;
  mtfBias: number;
  regime: string;
}

function defaultMLWeights(): MLWeights {
  return { w: new Array(ML_FEATURE_COUNT).fill(0), trained: 0 };
}

function buildFeatureVector(f: MLFeatureInput): number[] {
  const isHighVol = f.regime.includes('HIGH_VOL') ? 1 : 0;
  const isBull = f.regime.startsWith('BULLISH') ? 1 : 0;
  const isBear = f.regime.startsWith('BEARISH') ? 1 : 0;
  return [
    1,                                 // bias
    (f.rawConf - 70) / 15,
    f.sentBias / 12,
    f.liqBias / 12,
    f.pubDelta / 10,
    f.mtfBias / 12,
    isHighVol,
    isBull,
    isBear,
  ];
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

/**
 * Score a candidate via logistic regression. Returns pWin in (0, 1).
 * Returns 0.5 (neutral) for cold-start until ML_MIN_TRADES is reached.
 */
function mlScoreCandidate(brain: BrainState, f: MLFeatureInput): number {
  const weights = brain.mlWeights ?? defaultMLWeights();
  if (weights.trained < ML_MIN_TRADES) return 0.5;
  const x = buildFeatureVector(f);
  let z = 0;
  for (let i = 0; i < ML_FEATURE_COUNT; i++) z += weights.w[i] * x[i];
  return sigmoid(z);
}

/**
 * Convert pWin to a confidence-points delta.
 *   pWin 0.50 → 0
 *   pWin 0.65 → +6
 *   pWin 0.80 → +10 (capped)
 *   pWin 0.35 → -6
 *   pWin 0.20 → -10 (capped)
 * Symmetric, capped at ±ML_DELTA_CAP. Returns 0 in cold-start.
 */
function mlConfidenceDelta(pWin: number): number {
  if (pWin === 0.5) return 0;
  const delta = (pWin - 0.5) * 2 * ML_DELTA_CAP * 2;     // ±20 raw, capped below
  return Math.max(-ML_DELTA_CAP, Math.min(ML_DELTA_CAP, delta));
}

/**
 * Online SGD step on a single closed trade. Updates weights in place.
 * Logistic loss with L2 regularization.
 */
function mlTrainOne(brain: BrainState, f: MLFeatureInput, isWin: boolean): void {
  if (!brain.mlWeights) brain.mlWeights = defaultMLWeights();
  const w = brain.mlWeights.w;
  const x = buildFeatureVector(f);
  const y = isWin ? 1 : 0;
  let z = 0;
  for (let i = 0; i < ML_FEATURE_COUNT; i++) z += w[i] * x[i];
  const pred = sigmoid(z);
  const err = pred - y;
  // Gradient: (pred - y) * x_i + L2 penalty (skip bias term)
  for (let i = 0; i < ML_FEATURE_COUNT; i++) {
    const grad = err * x[i] + (i === 0 ? 0 : ML_L2 * w[i]);
    w[i] -= ML_LR * grad;
  }
  brain.mlWeights.trained++;
}

// ─── Intel layer (sentiment + liquidation cascades) ──────────────────────────
// Self-contained — no imports from src/* or api/lib/*. Fetches free public APIs
// once per tick, applies a directional bias to candidate confidence, then lets
// the existing correlation gate / heat cap / brain bias do the rest.

interface SentimentSnap {
  fearGreed: number;            // 0=extreme fear, 100=extreme greed (alternative.me)
  fundingBTC: number;           // % per 8h on BTC perps
  fundingETH: number;
  longShortRatio: number;       // BTC top-trader account ratio (>2 crowd long)
  partial: boolean;
}

async function fetchSentiment(): Promise<SentimentSnap> {
  const snap: SentimentSnap = { fearGreed: 50, fundingBTC: 0, fundingETH: 0, longShortRatio: 1, partial: false };
  // Per-call AbortController + 6s timeout. Sharing one controller across
  // Promise.all caused a single slow upstream (Binance, which blocks AWS IPs
  // and times out at 7s) to abort ALL pending requests including the Bybit /
  // OKX fallbacks — leaving funding/L-S at their defaults forever.
  const fetchOne = async (url: string): Promise<any | null> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      clearTimeout(t);
      if (!r.ok) return null;
      return await r.json();
    } catch {
      clearTimeout(t);
      return null;
    }
  };
  // Binance Futures (fapi.binance.com) blocks AWS IP ranges → all 3 calls
  // return null in production. Fall back to Bybit (open IPs, free) for funding
  // and to OKX (open IPs, free) for the long/short crowd ratio. F&G has no
  // proper substitute; we leave the 50 default if it fails.
  const [fng, fBtc, fEth, lsrBin, fBtcByb, fEthByb, lsrOkx] = await Promise.all([
    fetchOne('https://api.alternative.me/fng/?limit=1'),
    fetchOne('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT'),
    fetchOne('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=ETHUSDT'),
    fetchOne('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1'),
    // Bybit perpetual funding rate (8h, latest tick). open-IP, no auth.
    fetchOne('https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT'),
    fetchOne('https://api.bybit.com/v5/market/tickers?category=linear&symbol=ETHUSDT'),
    // OKX long/short ratio for BTC perps (5min). open-IP, no auth.
    fetchOne('https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=5m'),
  ]);

  // F&G — primary only
  if (fng?.data?.[0]) snap.fearGreed = Number(fng.data[0].value);
  else snap.partial = true;

  // Funding BTC: try Binance, but accept the value only if it's a real (non-zero)
  // number. Binance from AWS is unreliable — sometimes it returns success with
  // an empty/zeroed body. In that case Bybit is the canonical source.
  const binBtcFund = fBtc?.lastFundingRate != null ? Number(fBtc.lastFundingRate) : NaN;
  const bybBtcFund = fBtcByb?.result?.list?.[0]?.fundingRate != null
    ? Number(fBtcByb.result.list[0].fundingRate) : NaN;
  if (Number.isFinite(binBtcFund) && binBtcFund !== 0) {
    snap.fundingBTC = binBtcFund * 100;
  } else if (Number.isFinite(bybBtcFund)) {
    snap.fundingBTC = bybBtcFund * 100;
  } else {
    snap.partial = true;
  }

  // Funding ETH — same pattern
  const binEthFund = fEth?.lastFundingRate != null ? Number(fEth.lastFundingRate) : NaN;
  const bybEthFund = fEthByb?.result?.list?.[0]?.fundingRate != null
    ? Number(fEthByb.result.list[0].fundingRate) : NaN;
  if (Number.isFinite(binEthFund) && binEthFund !== 0) {
    snap.fundingETH = binEthFund * 100;
  } else if (Number.isFinite(bybEthFund)) {
    snap.fundingETH = bybEthFund * 100;
  } else {
    snap.partial = true;
  }

  // L/S ratio: Binance → OKX fallback. OKX format:
  //   data: [[ ts, ratio ], ...] where ratio = longAccount / shortAccount
  if (Array.isArray(lsrBin) && lsrBin[0]) {
    snap.longShortRatio = Number(lsrBin[0].longShortRatio);
  } else {
    const okxRows = lsrOkx?.data;
    if (Array.isArray(okxRows) && okxRows.length > 0) {
      const latest = okxRows[okxRows.length - 1];
      const ratio = Array.isArray(latest) ? Number(latest[1]) : null;
      if (ratio != null && !Number.isNaN(ratio) && ratio > 0) {
        snap.longShortRatio = ratio;
      } else snap.partial = true;
    } else snap.partial = true;
  }
  return snap;
}

/**
 * Sentiment → directional bias on a LONG. Flip sign for SHORT.
 * Range roughly -12..+12. Contrarian: extreme fear/funding/L-S favors LONG.
 */
function sentimentBiasFor(snap: SentimentSnap, direction: Direction): { bias: number; tag: string } {
  let raw = 0;
  const parts: string[] = [];
  if (snap.fearGreed <= 20)      { raw += 5; parts.push(`F&G=${snap.fearGreed}↑`); }
  else if (snap.fearGreed <= 30) { raw += 2; }
  else if (snap.fearGreed >= 80) { raw -= 5; parts.push(`F&G=${snap.fearGreed}↓`); }
  else if (snap.fearGreed >= 70) { raw -= 2; }
  const avgFund = (snap.fundingBTC + snap.fundingETH) / 2;
  if (avgFund > 0.05)  { raw -= 4; parts.push('fund-hot'); }
  else if (avgFund < -0.05) { raw += 4; parts.push('fund-inv'); }
  if (snap.longShortRatio >= 2.5) { raw -= 3; parts.push('crowd-long'); }
  else if (snap.longShortRatio <= 0.4) { raw += 3; parts.push('crowd-short'); }
  const bias = direction === 'LONG' ? raw : -raw;
  return { bias: Math.max(-12, Math.min(12, bias)), tag: parts.join(',') };
}

/**
 * Liquidation cascade pulse from public 1m perp klines. Detects "cascade
 * candles" (abnormal volume + range + wick signature). Aligned cascade
 * boosts confidence; opposing cascade penalizes (don't fight a flush).
 *
 * Source preference: Binance Futures (richer volume) → Bybit (always reachable
 * from AWS). Both endpoints are public and key-free; we keep Binance as the
 * primary because it has higher liquidity, but Bybit is a perfectly cromulent
 * substitute when Binance blocks our IPs (which it does in production).
 */
async function fetchCascadePulse(symbol: string): Promise<{ pressure: number; intensity: number }> {
  const fetchKlines = async (url: string): Promise<any[] | null> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      clearTimeout(t);
      if (!r.ok) return null;
      return (await r.json()) as any[];
    } catch { clearTimeout(t); return null; }
  };

  // Try Binance first (richer data); fall back to Bybit if blocked.
  let raw = await fetchKlines(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1m&limit=20`);
  let usingBybit = false;

  if (!Array.isArray(raw) || raw.length < 10) {
    // Bybit response shape: { result: { list: [[start, open, high, low, close, vol, turnover], ...] } }
    // Returns most-recent first, so we reverse to chronological for parity with Binance.
    const bybit: any = await fetchKlines(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=1&limit=20`);
    const list = bybit?.result?.list;
    if (Array.isArray(list) && list.length >= 10) {
      raw = [...list].reverse();
      usingBybit = true;
    } else {
      return { pressure: 0, intensity: 0 };
    }
  }

  // Binance kline: [openTime, open, high, low, close, vol, ...]
  // Bybit kline:  [start,    open, high, low, close, vol, turnover]
  // Both put the same fields in the same indexes 1..5, so the parser below
  // works for either source.
  const candles = raw.map(k => ({ open: +k[1], high: +k[2], low: +k[3], close: +k[4], vol: +k[5] }));
  const baseline = candles.slice(0, -3);
  const median = (arr: number[]) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)] || 0;
  const medVol = median(baseline.map(c => c.vol));
  const medRng = median(baseline.map(c => (c.high - c.low) / Math.max(1e-9, c.close)));
  if (medVol === 0 || medRng === 0) return { pressure: 0, intensity: 0 };
  let pSum = 0, n = 0, maxI = 0;
  for (const c of candles.slice(-3)) {
    const rng = (c.high - c.low) / Math.max(1e-9, c.close);
    const vR = c.vol / medVol;
    const rR = rng / medRng;
    if (vR < 2 || rR < 1.8) continue;
    n++;
    const body = c.close - c.open;
    const upper = c.high - Math.max(c.open, c.close);
    const lower = Math.min(c.open, c.close) - c.low;
    const total = c.high - c.low || 1e-9;
    const dir = (body / total) * 60 + ((upper - lower) / total) * 30;
    const mag = Math.min(2.5, (vR + rR) / 2);
    pSum += Math.max(-100, Math.min(100, dir * mag));
    maxI = Math.max(maxI, Math.min(100, vR * 20 + rR * 15));
  }
  return { pressure: n > 0 ? Math.round(pSum / n) : 0, intensity: Math.round(maxI) };
}

function cascadeBiasFor(pulse: { pressure: number; intensity: number }, direction: Direction): number {
  if (pulse.intensity < 30) return 0;
  const aligned = (direction === 'LONG' && pulse.pressure > 0)
              || (direction === 'SHORT' && pulse.pressure < 0);
  const mag = Math.min(12, Math.abs(pulse.pressure) / 8);
  return aligned ? mag : -mag * 1.4;
}

/**
 * Multi-timeframe alignment bias.
 *
 * Compares the signal direction (driven by 24h move + intra-day structure)
 * against the higher-timeframe 7d trend from CoinGecko's markets endpoint.
 *
 * Returns a confidence delta:
 *   - LONG with strong 7d uptrend  → boost (riding the trend)
 *   - LONG with strong 7d downtrend → penalty (counter-trend, statistically lower hit rate)
 *   - mirror logic for SHORT
 *   - flat 7d (|change7d| < 2%) → no opinion, returns 0
 *
 * Magnitudes capped at ±12 confidence points so MTF can't override the entire
 * decision; it's a weighting, not a veto. The penalty side is heavier (×1.3)
 * because counter-trend trades that LOSE typically lose harder.
 */
function multiTimeframeBiasFor(
  change7d: number,
  direction: Direction,
): { bias: number; tag: string } {
  const FLAT_BAND = 2;          // |change7d| ≤ 2% → no MTF signal
  if (Math.abs(change7d) < FLAT_BAND) return { bias: 0, tag: '' };

  const trendIsUp = change7d > 0;
  const aligned = (direction === 'LONG' && trendIsUp) || (direction === 'SHORT' && !trendIsUp);
  // Magnitude scales with the 7d move, capped at ±12. A 2% 7d move barely
  // counts; a 10%+ move dominates.
  const mag = Math.min(12, Math.max(2, Math.abs(change7d) * 1.2));
  const dir = aligned ? '+' : '-';
  const bias = aligned ? mag : -mag * 1.3;
  return { bias, tag: `mtf7d${dir}${Math.abs(bias).toFixed(0)}(${change7d >= 0 ? '+' : ''}${change7d.toFixed(1)}%)` };
}

// ─── Operational primitives: kill switch + heartbeat + history retention ─────

/**
 * Read the kill switch from autonomous_state.state.killSwitch. When true, the
 * cron WILL still manage open positions (TP/SL/timeout/trailing) — those are
 * safety-critical and must run — but it WILL NOT open new positions. Lets
 * the operator pause the system without redeploying or removing the GHA cron.
 *
 * Set via Supabase SQL:
 *   UPDATE autonomous_state SET state = state || '{"killSwitch": true}'
 *   WHERE id = 'singleton';
 *
 * Resume:
 *   UPDATE autonomous_state SET state = state || '{"killSwitch": false}'
 *   WHERE id = 'singleton';
 */
function isKillSwitchOn(rawState: any): boolean {
  return rawState?.killSwitch === true;
}

/**
 * Write a per-tick heartbeat to autonomous_state.state.lastTick. This is the
 * single source of truth for "is the engine alive?" — the timestamp tells us
 * when the last successful tick ran; if it's > 10 minutes old, something
 * is broken (GHA cron disabled? Supabase down? Vercel function failing?).
 *
 * Stays cheap: ~200 bytes added to the JSONB. Always written, even on
 * zero-activity ticks, so a stale `lastTick.ts` is itself a signal.
 */
function buildTickSummary(result: TickResult, brain: BrainState, elapsedMs: number, killSwitch: boolean): any {
  const skipTotal = Object.values(result.skipReasons).reduce((s, v) => s + v, 0);
  return {
    ts: Date.now(),
    elapsedMs,
    regime: result.regime,
    opened: result.opened,
    closed: result.closed,
    skipped: skipTotal,
    skipReasons: result.skipReasons,
    errors: result.errors.slice(0, 5),     // cap error count for storage
    killSwitch,
    brainHealth: {
      biasCells: Object.keys(brain.strategyBias).length,
      outcomeCells: Object.keys(brain.strategyOutcomes).length,
      intelRegimes: Object.keys(brain.intelStats).length,
      confCalBins: Object.keys(brain.confidenceCal).length,
      mlTrained: brain.mlWeights?.trained ?? 0,
      pendingIntel: Object.keys(brain.pendingIntel).length,
    },
  };
}

/**
 * Probabilistically prune old trade history rows. Runs on roughly 1% of ticks,
 * which at 5-min cadence is ~3 prunes per day — plenty to keep the table small.
 * Keeps the most recent 30 days of trades (which is more than enough for any
 * rolling-window learner the brain currently uses).
 */
async function maybePruneTradeHistory(supabase: any): Promise<number> {
  if (Math.random() > 0.01) return 0;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { error, count } = await supabase
      .from('arena_trade_history')
      .delete({ count: 'exact' })
      .lt('timestamp', cutoff);
    if (error) {
      console.warn('[trade-tick] history prune failed:', error.message);
      return 0;
    }
    if ((count ?? 0) > 0) console.info(`[trade-tick] pruned ${count} trade rows older than 30d`);
    return count ?? 0;
  } catch (err: any) {
    console.warn('[trade-tick] history prune threw:', err?.message);
    return 0;
  }
}

// ─── Tick logic ───────────────────────────────────────────────────────────────

interface TickResult {
  closed: number;
  opened: number;
  skipReasons: Record<string, number>;
  errors: string[];
  regime: string;
  intel?: { fearGreed: number; fundingBTC: number; longShortRatio: number; cascadesActive: number };
  brain?: {
    biasCells: number;             // # populated strategyBias entries
    intelRegimes: number;          // # regimes with intelStats data
    confCalBins: number;           // # confidence bins with samples
    pendingIntel: number;          // # snapshots awaiting outcome (open positions)
    sample?: {
      sentMultByRegime?: Record<string, number>;
      liqMultByRegime?: Record<string, number>;
      confCalRates?: Record<string, { wins: number; trades: number }>;
    };
  };
}

async function runTradingTick(): Promise<TickResult> {
  const tickStartedAt = Date.now();
  const supabase = getSupabase();
  const result: TickResult = {
    closed: 0, opened: 0, skipReasons: {}, errors: [], regime: 'RANGEBOUND',
  };

  // 1. Load all state + intel in parallel. Sentiment + cascade pulses are pure
  //    free APIs (alternative.me F&G + Binance public endpoints). Each has its
  //    own short timeout so a slow source can't stall the whole tick.
  const [prices, sessionsResult, positionsResult, atrByPair, brainLoad, sentiment, btcCascade, ethCascade, solCascade, dogeCascade, publishedSignals] = await Promise.all([
    fetchPrices(),
    supabase.from('arena_agent_sessions').select('*'),
    supabase.from('arena_active_positions').select('*'),
    fetchAtrForPairs(),
    loadBrain(supabase),
    fetchSentiment(),
    fetchCascadePulse('BTCUSDT'),
    fetchCascadePulse('ETHUSDT'),
    fetchCascadePulse('SOLUSDT'),
    fetchCascadePulse('DOGEUSDT'),
    loadActivePublishedSignals(supabase),
  ]);
  const { brain, rawState: brainRawState } = brainLoad;
  let brainDirty = false;
  if (publishedSignals.size > 0) {
    console.info(`[trade-tick] consuming ${publishedSignals.size} published signal(s): ${Array.from(publishedSignals.values()).map(s => `${s.fullSymbol}-${s.direction}@${s.confidence}`).join(', ')}`);
  }
  const cascadeBySymbol = new Map<string, { pressure: number; intensity: number }>([
    ['BTCUSDT', btcCascade], ['ETHUSDT', ethCascade], ['SOLUSDT', solCascade], ['DOGEUSDT', dogeCascade],
  ]);
  const cascadesActive = [btcCascade, ethCascade, solCascade, dogeCascade].filter(c => c.intensity >= 30).length;
  result.intel = {
    fearGreed: sentiment.fearGreed,
    fundingBTC: sentiment.fundingBTC,
    longShortRatio: sentiment.longShortRatio,
    cascadesActive,
  };
  // Surface what the brain has learned so far (for observability / API consumers)
  const sentByR: Record<string, number> = {};
  const liqByR: Record<string, number> = {};
  for (const r of Object.keys(brain.intelStats)) {
    sentByR[r] = +intelMultiplier(brain, r, 'sentiment').toFixed(2);
    liqByR[r]  = +intelMultiplier(brain, r, 'cascade').toFixed(2);
  }
  result.brain = {
    biasCells: Object.keys(brain.strategyBias).length,
    intelRegimes: Object.keys(brain.intelStats).length,
    confCalBins: Object.keys(brain.confidenceCal).length,
    pendingIntel: Object.keys(brain.pendingIntel).length,
    sample: {
      sentMultByRegime: sentByR,
      liqMultByRegime: liqByR,
      confCalRates: brain.confidenceCal,
    },
  };
  console.info(
    `[trade-tick] intel: F&G=${sentiment.fearGreed} fund=${sentiment.fundingBTC.toFixed(3)}% ` +
    `L/S=${sentiment.longShortRatio.toFixed(2)} cascades=${cascadesActive}/4` +
    `${sentiment.partial ? ' (partial)' : ''} ` +
    `| brain: bias=${result.brain.biasCells} intel=${result.brain.intelRegimes}r ` +
    `conf=${result.brain.confCalBins}b pending=${result.brain.pendingIntel}`,
  );

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
      closeOps.push(closeTrade(supabase, pos, exitPrice, reason, sessionsByAgent.get(agentId), result, brain, () => { brainDirty = true; }));
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

  // Track open intents (positions already open + new ones we open this tick) so
  // the correlation gate can also block within-tick correlated co-openings.
  const openIntents: OpenIntent[] = Array.from(positionsByAgent.values())
    .map(p => ({ symbol: p.symbol, direction: p.direction }));

  const openOps: Promise<void>[] = [];
  // Kill-switch gate: if the operator has paused the engine, do NOT open
  // anything new — but the close loop above still ran, so existing positions
  // continue to be managed safely (TP/SL/timeout/trailing). When the operator
  // flips killSwitch back to false, the engine resumes opening on the next tick.
  const killSwitch = isKillSwitchOn(brainRawState);
  if (killSwitch) {
    console.warn('[trade-tick] KILL_SWITCH ON — skipping all opens (close loop already ran for safety)');
  }
  for (const agent of AGENTS) {
    if (killSwitch) {
      result.skipReasons['KILL_SWITCH'] = (result.skipReasons['KILL_SWITCH'] ?? 0) + 1;
      continue;
    }
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

    // Generate candidate signals per pair, then pick the best one that ALSO
    // passes the correlation gate (prefer a less-correlated lower-confidence
    // candidate over the highest-confidence one if it conflicts).
    // Generate base candidates, then enrich each with intel-derived bias
    // (sentiment direction-bias + per-symbol cascade alignment). Effective
    // confidence drives ranking; raw confidence still drives sizing later.
    //
    // BRAIN v2: each intel source's bias is scaled by its LEARNED predictive
    // power in the current regime (intelStats), and raw confidence is
    // recalibrated against historical hit rates per confidence bin
    // (confidenceCal). With <8 trades the multipliers are 1.0 (no remap).
    const sentMult = intelMultiplier(brain, marketState, 'sentiment');
    const liqMult  = intelMultiplier(brain, marketState, 'cascade');
    const candidates: Array<{ pair: typeof TRADING_PAIRS[0]; signal: Signal; effConf: number; intelTag: string }> = [];
    for (const pair of availablePairs) {
      const price = prices.get(pair.symbol);
      if (!price) continue;
      const sig = generateSignal(agent, pair, price, marketState, atrByPair.get(pair.symbol));
      if (!sig) continue;
      const sBias = sentimentBiasFor(sentiment, sig.direction);
      const cPulse = cascadeBySymbol.get(pair.symbol) ?? { pressure: 0, intensity: 0 };
      const cBias = cascadeBiasFor(cPulse, sig.direction);
      const pubAdj = applyPublishedSignalAlignment(sig.confidence, sig.direction, pair.symbol, publishedSignals, brain.signalQuality);
      const pubDelta = pubAdj.confidence - sig.confidence;
      // Multi-timeframe: 7d trend agreement amplifies, disagreement penalizes
      const mtf = multiTimeframeBiasFor(price.change7d, sig.direction);
      // Inline ML logistic regression — captures feature interactions the
      // independent per-source EMAs cannot. Trains on each closed trade.
      const mlScore = mlScoreCandidate(brain, {
        rawConf: sig.confidence,
        sentBias: sBias.bias,
        liqBias: cBias,
        pubDelta,
        mtfBias: mtf.bias,
        regime: marketState,
      });
      const mlDelta = mlConfidenceDelta(mlScore);    // -10..+10
      // Scale intel bias by learned effectiveness; recalibrate raw conf
      const confCalMult = confidenceCalMultiplier(brain, sig.confidence);
      const calibratedConf = sig.confidence * confCalMult;
      const effConf = Math.max(0, Math.min(100,
        calibratedConf + sBias.bias * sentMult + cBias * liqMult + pubDelta + mtf.bias + mlDelta,
      ));
      const tagParts: string[] = [];
      if (sBias.bias !== 0) tagParts.push(`sent${sBias.bias >= 0 ? '+' : ''}${sBias.bias.toFixed(0)}${sentMult !== 1 ? `×${sentMult.toFixed(2)}` : ''}${sBias.tag ? `:${sBias.tag}` : ''}`);
      if (cBias !== 0)      tagParts.push(`liq${cBias >= 0 ? '+' : ''}${cBias.toFixed(0)}${liqMult !== 1 ? `×${liqMult.toFixed(2)}` : ''}`);
      if (pubAdj.note)      tagParts.push(pubAdj.note);
      if (mtf.tag)          tagParts.push(mtf.tag);
      if (mlDelta !== 0)    tagParts.push(`ml${mlDelta >= 0 ? '+' : ''}${mlDelta.toFixed(0)}(p=${mlScore.toFixed(2)})`);
      if (confCalMult !== 1.0) tagParts.push(`confCal×${confCalMult.toFixed(2)}`);
      candidates.push({ pair, signal: sig, effConf, intelTag: tagParts.join(' ') });
    }
    candidates.sort((a, b) => b.effConf - a.effConf);

    // Hard veto: opposing cascade with high intensity is strong "don't fight it"
    const FLOOR = 50;
    let chosen: { pair: typeof TRADING_PAIRS[0]; signal: Signal; effConf: number; intelTag: string } | null = null;
    let correlatedRejection: { newSym: string; conflict: { symbol: string; corr: number } } | null = null;
    let intelRejected = 0;
    for (const c of candidates) {
      if (c.effConf < FLOOR) { intelRejected++; continue; }
      const conflict = findCorrelatedConflict(c.pair.symbol, c.signal.direction, openIntents);
      if (!conflict) {
        chosen = c;
        break;
      }
      if (!correlatedRejection) correlatedRejection = { newSym: c.pair.symbol, conflict };
    }

    if (!chosen) {
      if (candidates.length === 0) {
        result.skipReasons['NO_SIGNAL'] = (result.skipReasons['NO_SIGNAL'] ?? 0) + 1;
      } else if (intelRejected === candidates.length) {
        result.skipReasons['INTEL_REJECT'] = (result.skipReasons['INTEL_REJECT'] ?? 0) + 1;
        console.info(`[trade-tick] intel-reject ${agent.name}: best effConf=${candidates[0]?.effConf.toFixed(0)} < ${FLOOR}`);
      } else {
        result.skipReasons['CORRELATION_GATE'] = (result.skipReasons['CORRELATION_GATE'] ?? 0) + 1;
        if (correlatedRejection) {
          console.info(`[trade-tick] corr-gate skip ${agent.name} ${correlatedRejection.newSym}: ${correlatedRejection.conflict.corr.toFixed(2)} corr with open ${correlatedRejection.conflict.symbol} same dir`);
        }
      }
      continue;
    }
    if (chosen.intelTag) {
      console.info(`[trade-tick] intel ${agent.name} ${chosen.signal.direction} ${chosen.pair.symbol} rawConf=${chosen.signal.confidence.toFixed(0)} effConf=${chosen.effConf.toFixed(0)} ${chosen.intelTag}`);
    }

    const chosenSignal = chosen.signal;
    const chosenPair = chosen.pair;
    const price = prices.get(chosenPair.symbol)!;
    const balance = computeBalance(session);

    // Brain bias: scale notional by per-(strategy, regime) EMA learned from outcomes.
    // Auto-disable kicks in if recent 20-trade WR < 40% (bias forced to 0.1);
    // auto-boost if WR > 65% (bias forced to 1.5). Otherwise EMA value applies.
    const biasResult = getStrategyBias(brain, chosenSignal.strategy, marketState);
    const bias = biasResult.bias;

    // Skip outright if auto-disabled — sized down to 0.1 means notional would
    // collapse below MIN_POSITION_USD, so save the work and tag the skip clearly.
    if (biasResult.reason.startsWith('auto-disable')) {
      result.skipReasons['STRATEGY_DISABLED'] = (result.skipReasons['STRATEGY_DISABLED'] ?? 0) + 1;
      console.info(`[trade-tick] strategy disabled ${agent.name} ${chosenSignal.strategy}@${marketState}: ${biasResult.reason}`);
      continue;
    }

    let notional = balance * (agent.positionSizePercent / 100);
    notional *= Math.max(0.7, Math.min(1.3, 0.4 + chosenSignal.confidence / 100));
    notional *= bias;
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

    if (Math.abs(bias - 1.0) > 0.05 || biasResult.reason !== 'ema') {
      console.info(`[trade-tick] brain bias ${agent.name} ${chosenSignal.strategy}@${marketState}=${bias.toFixed(2)}x (${biasResult.reason}) notional=$${notional.toFixed(0)}`);
    }

    openOps.push(openPosition(supabase, agent, chosenPair, price, chosenSignal, notional, marketState, result));
    result.opened++;
    reservedSymbols.add(chosenPair.symbol);
    openIntents.push({ symbol: chosenPair.symbol, direction: chosenSignal.direction });

    // Snapshot intel-at-open so we can credit-assign at close. Stored on the
    // brain singleton (not arena_active_positions) so we don't need a schema
    // migration. One snapshot per agent — overwritten on each open.
    const sBiasAtOpen = sentimentBiasFor(sentiment, chosenSignal.direction);
    const cPulseAtOpen = cascadeBySymbol.get(chosenPair.symbol) ?? { pressure: 0, intensity: 0 };
    const cBiasAtOpen = cascadeBiasFor(cPulseAtOpen, chosenSignal.direction);
    const pubAdjAtOpen = applyPublishedSignalAlignment(chosenSignal.confidence, chosenSignal.direction, chosenPair.symbol, publishedSignals, brain.signalQuality);
    const mtfAtOpen = multiTimeframeBiasFor(price.change7d, chosenSignal.direction);
    brain.pendingIntel[agent.id] = {
      strategy: chosenSignal.strategy,
      regime: marketState,
      direction: chosenSignal.direction,
      symbol: chosenPair.symbol,
      rawConfidence: chosenSignal.confidence,
      effConfidence: chosen.effConf,
      sentBias: sBiasAtOpen.bias,
      liqBias: cBiasAtOpen,
      pubDelta: pubAdjAtOpen.confidence - chosenSignal.confidence,
      mtfBias: mtfAtOpen.bias,
      fearGreed: sentiment.fearGreed,
      cascadeIntensity: cPulseAtOpen.intensity,
      openedAt: Date.now(),
    };
    brainDirty = true;
  }
  await Promise.all(openOps);

  // ─── End of tick: ALWAYS write heartbeat + persist brain if changed ───────
  // The heartbeat snapshot (state.lastTick) is the single source of truth for
  // "is the engine alive?". It's written every tick regardless of activity, so
  // a stale `lastTick.ts` (>10 min old) is itself an alert signal.
  const elapsedMs = Date.now() - tickStartedAt;
  const tickSummary = buildTickSummary(result, brain, elapsedMs, killSwitch);
  await persistBrain(supabase, brainRawState, brain, tickSummary);

  // Probabilistic history pruning — runs ~1% of ticks (~3×/day at 5-min cadence).
  // Keeps arena_trade_history bounded for long-term Supabase storage.
  const pruned = await maybePruneTradeHistory(supabase);
  if (pruned > 0) (result as any).pruned = pruned;

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

  // Use SECURITY DEFINER RPC instead of direct UPSERT — anon role no longer
  // has INSERT/UPDATE/DELETE on worker tables. The RPC verifies CRON_SECRET
  // before bypassing RLS to write.
  const { error } = await supabase.rpc('worker_open_position', {
    p_secret: process.env.CRON_SECRET ?? '',
    p_agent_id: agent.id,
    p_position_id: positionId,
    p_symbol: pair.symbol,
    p_display_symbol: pair.display,
    p_direction: signal.direction,
    p_entry_price: entry,
    p_quantity: quantity,
    p_take_profit_price: tp,
    p_stop_loss_price: sl,
    p_strategy: signal.strategy,
    p_market_state: marketState,
  });

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
  brain?: BrainState,
  onBrainUpdate?: () => void,
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

  // Brain learning: EMA-update the per-(strategy, regime) bias from this outcome.
  // Mutates brain in place. The caller flips brainDirty so the end-of-tick
  // persist actually writes the update back to autonomous_state.
  if (brain && pos.strategy && pos.market_state_at_entry) {
    updateStrategyBias(brain, pos.strategy, pos.market_state_at_entry, isWin);

    // Credit-assign intel snapshots — does sentiment / cascade actually predict wins
    // in this regime? Did our confidence rate match reality? Consumed snapshot.
    const consumedSnap = applyIntelLearning(brain, pos.agent_id, isWin);
    if (consumedSnap) {
      // Online SGD step using the EXACT features that scored this trade at open.
      // pubDelta and mtfBias were captured into the snapshot at open time so
      // gradients flow back to the right coefficients (no feature drift).
      mlTrainOne(brain, {
        rawConf: consumedSnap.rawConfidence,
        sentBias: consumedSnap.sentBias,
        liqBias: consumedSnap.liqBias,
        pubDelta: consumedSnap.pubDelta ?? 0,
        mtfBias: consumedSnap.mtfBias ?? 0,
        regime: consumedSnap.regime,
      }, isWin);

      const fb: string[] = [];
      if (consumedSnap.sentBias >= INTEL_ACTIVE_THRESHOLD) fb.push(`sent=${consumedSnap.sentBias.toFixed(0)}`);
      if (consumedSnap.liqBias  >= INTEL_ACTIVE_THRESHOLD) fb.push(`liq=${consumedSnap.liqBias.toFixed(0)}`);
      const mlT = brain.mlWeights?.trained ?? 0;
      console.info(
        `[trade-tick] LEARN ${pos.agent_id} ${isWin ? 'WIN' : 'LOSS'} ` +
        `bin=${confidenceBin(consumedSnap.effConfidence)} conf=${consumedSnap.effConfidence.toFixed(0)} ` +
        `${fb.length ? '(' + fb.join(' ') + ') ' : ''}` +
        `mlTrained=${mlT}`,
      );
    }
    onBrainUpdate?.();
  }

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

  // Use SECURITY DEFINER RPC — atomic insert+delete+upsert + circuit-breaker
  // logic on the DB side. Anon no longer has direct write rights on these tables.
  const { error: closeErr } = await supabase.rpc('worker_close_trade', {
    p_secret: process.env.CRON_SECRET ?? '',
    p_agent_id: pos.agent_id,
    p_symbol: pos.symbol,
    p_direction: pos.direction,
    p_entry_price: entry,
    p_exit_price: exitPrice,
    p_quantity: qty,
    p_pnl_percent: pnlPercent,
    p_pnl_dollar: pnlDollar,
    p_is_win: isWin,
    p_strategy: pos.strategy,
    p_market_state: pos.market_state_at_entry,
    p_reason: reason,
  });
  if (closeErr) {
    const msg = `close failed for ${pos.agent_id}: ${closeErr.message ?? closeErr.code ?? closeErr}`;
    console.error('[trade-tick]', msg);
    result.errors.push(msg);
  }

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
