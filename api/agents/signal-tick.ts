/**
 * QuantumX Server-Side Signal Generator + Outcome Resolver
 *
 * One execution = one full signal pass:
 *   1. Fetch live prices + 30-min OHLC candles via CoinGecko (free tier)
 *   2. Detect breadth-aware market regime (top-50, matches trade-tick)
 *   3. For each pair: compute multi-confirmation signal using RSI(14),
 *      EMA(20/50), ATR(14), 24h momentum, position-in-range, regime
 *   4. Dedupe against active signals from last 15 min
 *   5. Insert top-N confidence signals into intelligence_signals
 *   6. Resolve outcomes for stale active signals: walk OHLC since creation
 *      and detect TP1/TP2/SL hits → update status='completed' with
 *      exit_price, hit_target, hit_stop_loss, profit_loss_percent
 *   7. Mark untriggered signals expired after TTL
 *
 * Driven by GitHub Actions every 5 minutes.
 *
 * Authentication: `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Route: GET /api/agents/signal-tick
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

type Direction = 'LONG' | 'SHORT';

interface PriceData {
  symbol: string;
  ticker: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

interface Candle {
  ts: number;        // ms
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Indicators {
  rsi14: number;          // 0..100, 50 = neutral
  ema20: number;
  ema50: number;
  ema20Slope: number;     // %, last-15-bar slope
  atrPercent: number;     // ATR(14) as % of last close
  positionInRange: number;// 0..1 over last 48 bars
  bars: number;
}

interface Candidate {
  ticker: string;
  signalType: Direction;
  confidence: number;
  currentPrice: number;
  entryMin: number;
  entryMax: number;
  target1: number;
  target2: number;
  stopLoss: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  strength: string;
  thesis: string;
  invalidation: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SIGNAL_UNIVERSE = [
  { symbol: 'BTCUSDT',  ticker: 'BTC',  coingeckoId: 'bitcoin' },
  { symbol: 'ETHUSDT',  ticker: 'ETH',  coingeckoId: 'ethereum' },
  { symbol: 'SOLUSDT',  ticker: 'SOL',  coingeckoId: 'solana' },
  { symbol: 'BNBUSDT',  ticker: 'BNB',  coingeckoId: 'binancecoin' },
  { symbol: 'XRPUSDT',  ticker: 'XRP',  coingeckoId: 'ripple' },
  { symbol: 'DOGEUSDT', ticker: 'DOGE', coingeckoId: 'dogecoin' },
];

const SIGNAL_TTL_MS = 4 * 60 * 60 * 1000;   // 4 hours, matches trade-tick MAX_HOLD_MS
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;    // 30 min — broader window stops noise duplicates
const MIN_CONFIDENCE = 65;
const MAX_PUBLISH_PER_TICK = 4;
const OUTCOME_RESOLVER_LIMIT = 30;          // resolve up to N stale active signals per tick

// ─── Supabase ─────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL
    ?? process.env.VITE_SUPABASE_URL
    ?? 'https://abdjyaumafnewqjhsjlq.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Price + OHLC feed ───────────────────────────────────────────────────────

async function fetchPrices(): Promise<Map<string, PriceData>> {
  const map = new Map<string, PriceData>();
  const ids = SIGNAL_UNIVERSE.map(p => p.coingeckoId).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'accept': 'application/json' } });
    clearTimeout(timeout);
    if (!r.ok) {
      console.error(`[signal-tick] CoinGecko HTTP ${r.status}`);
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

    const idToPair = new Map(SIGNAL_UNIVERSE.map(p => [p.coingeckoId, p]));
    for (const row of arr) {
      const pair = idToPair.get(row.id);
      if (!pair) continue;
      map.set(pair.ticker, {
        symbol: pair.symbol,
        ticker: pair.ticker,
        price: row.current_price,
        change24h: row.price_change_percentage_24h ?? 0,
        high24h: row.high_24h ?? row.current_price,
        low24h: row.low_24h ?? row.current_price,
        volume: row.total_volume ?? 0,
      });
    }
  } catch (err: any) {
    clearTimeout(timeout);
    console.error('[signal-tick] CoinGecko fetch failed:', err?.message);
  }
  return map;
}

/**
 * Fetch ~48 candles of 30-min OHLC for last 24h. Per-pair, parallel.
 * Endpoint: /coins/{id}/ohlc?days=1 (free tier).
 */
async function fetchCandlesByTicker(): Promise<Map<string, Candle[]>> {
  const map = new Map<string, Candle[]>();
  await Promise.all(SIGNAL_UNIVERSE.map(async pair => {
    const url = `https://api.coingecko.com/api/v3/coins/${pair.coingeckoId}/ohlc?vs_currency=usd&days=1`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      clearTimeout(t);
      if (!r.ok) return;
      const raw = (await r.json()) as Array<[number, number, number, number, number]>;
      if (!Array.isArray(raw) || raw.length < 20) return;
      const candles: Candle[] = raw.map(c => ({ ts: c[0], open: c[1], high: c[2], low: c[3], close: c[4] }));
      map.set(pair.ticker, candles);
    } catch {
      clearTimeout(t);
    }
  }));
  return map;
}

// ─── Indicators ──────────────────────────────────────────────────────────────

function computeIndicators(candles: Candle[]): Indicators | null {
  if (candles.length < 20) return null;
  const closes = candles.map(c => c.close);
  const lastClose = closes[closes.length - 1];

  // RSI(14) — Wilder smoothing
  const period = 14;
  let gain = 0;
  let loss = 0;
  const startIdx = Math.max(1, closes.length - period - 1);
  for (let i = startIdx; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  const avgGain = gain / period;
  const avgLoss = loss / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi14 = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  // EMA(20) and EMA(50)
  const ema = (n: number) => {
    if (closes.length < n) return lastClose;
    const k = 2 / (n + 1);
    let e = closes.slice(0, n).reduce((s, v) => s + v, 0) / n;
    for (let i = n; i < closes.length; i++) {
      e = closes[i] * k + e * (1 - k);
    }
    return e;
  };
  const ema20 = ema(20);
  const ema50 = closes.length >= 50 ? ema(50) : ema20;

  // EMA20 slope over last ~15 bars (% change)
  const emaWindow = Math.min(15, candles.length - 5);
  let emaPrev = closes.slice(0, Math.max(20, closes.length - emaWindow)).reduce((s, v) => s + v, 0) / 20;
  const k = 2 / 21;
  for (let i = 20; i < closes.length - emaWindow; i++) {
    emaPrev = closes[i] * k + emaPrev * (1 - k);
  }
  const ema20Slope = emaPrev > 0 ? ((ema20 - emaPrev) / emaPrev) * 100 : 0;

  // ATR(14) %
  const tail = candles.slice(-15);
  let trSum = 0;
  for (let i = 1; i < tail.length; i++) {
    const tr = Math.max(
      tail[i].high - tail[i].low,
      Math.abs(tail[i].high - tail[i - 1].close),
      Math.abs(tail[i].low - tail[i - 1].close),
    );
    trSum += tr;
  }
  const atr14 = trSum / (tail.length - 1);
  const atrPercent = lastClose > 0 ? (atr14 / lastClose) * 100 : 0;

  // Position in range over last 48 bars
  const recent = candles.slice(-48);
  const hi = Math.max(...recent.map(c => c.high));
  const lo = Math.min(...recent.map(c => c.low));
  const positionInRange = hi > lo ? (lastClose - lo) / (hi - lo) : 0.5;

  return { rsi14, ema20, ema50, ema20Slope, atrPercent, positionInRange, bars: candles.length };
}

// ─── Regime (breadth-aware) ──────────────────────────────────────────────────

interface RegimeSnapshot {
  state: string;
  confidence: number;
  volatility: number;
  trendStrength: number;
  bullishRatio: number;
}

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
    console.warn('[signal-tick] top-50 regime fetch failed:', err?.message);
  }

  if (coins.length < 10) {
    if (!btcFallback) return { state: 'RANGEBOUND', confidence: 40, volatility: 0, trendStrength: 0, bullishRatio: 0.5 };
    const range = btcFallback.high24h > 0 ? ((btcFallback.high24h - btcFallback.low24h) / btcFallback.price) * 100 : 0;
    const isHighVol = range > 4.5;
    let state = 'RANGEBOUND';
    if (btcFallback.change24h > 2.5)       state = isHighVol ? 'BULLISH_HIGH_VOL' : 'BULLISH_LOW_VOL';
    else if (btcFallback.change24h < -2.5) state = isHighVol ? 'BEARISH_HIGH_VOL' : 'BEARISH_LOW_VOL';
    return {
      state, confidence: 50,
      volatility: Math.min(100, range * 5),
      trendStrength: Math.max(-100, Math.min(100, btcFallback.change24h * 2)),
      bullishRatio: btcFallback.change24h > 0 ? 1 : 0,
    };
  }

  const changes = coins.map(c => c.price_change_percentage_24h ?? 0);
  const avg = changes.reduce((s, v) => s + v, 0) / changes.length;
  const sd = Math.sqrt(changes.reduce((s, v) => s + (v - avg) ** 2, 0) / changes.length);
  const volatility = Math.min(100, sd * 5);
  const trendStrength = Math.max(-100, Math.min(100, avg * 2));
  const rangeScore = 100 - Math.abs(trendStrength);
  const bullishRatio = changes.filter(c => c > 0).length / changes.length;

  let state: string; let confidence: number;
  if (rangeScore > 60 && volatility < 20)      { state = 'RANGEBOUND'; confidence = rangeScore; }
  else if (trendStrength > 15)                 { state = volatility > 40 ? 'BULLISH_HIGH_VOL' : 'BULLISH_LOW_VOL'; confidence = volatility > 40 ? (trendStrength + volatility) / 2 : trendStrength + (100 - volatility) / 2; }
  else if (trendStrength < -15)                { state = volatility > 40 ? 'BEARISH_HIGH_VOL' : 'BEARISH_LOW_VOL'; confidence = volatility > 40 ? (Math.abs(trendStrength) + volatility) / 2 : Math.abs(trendStrength) + (100 - volatility) / 2; }
  else                                         { state = 'RANGEBOUND'; confidence = 50 + rangeScore / 4; }
  if (state.startsWith('BULLISH') && bullishRatio < 0.4) confidence *= 0.8;
  else if (state.startsWith('BEARISH') && bullishRatio > 0.6) confidence *= 0.8;
  confidence = Math.max(40, Math.min(95, confidence));
  return { state, confidence, volatility, trendStrength, bullishRatio };
}

// ─── Signal generation (multi-factor, RSI/EMA + regime) ──────────────────────

function generateCandidate(
  price: PriceData,
  indicators: Indicators,
  regime: RegimeSnapshot,
): Candidate | null {
  const { rsi14, ema20, ema50, ema20Slope, atrPercent, positionInRange } = indicators;

  // Score components: each in [-2, +2]. LONG-positive, SHORT-negative.
  const score: Record<string, number> = {};

  // 1) RSI: <30 strong long bias, <40 mild; >70 strong short, >60 mild
  if (rsi14 < 25) score.rsi = 2;
  else if (rsi14 < 35) score.rsi = 1;
  else if (rsi14 > 75) score.rsi = -2;
  else if (rsi14 > 65) score.rsi = -1;
  else score.rsi = 0;

  // 2) EMA cross: price above both → trend long; below → trend short
  if (price.price > ema20 && ema20 > ema50)      score.trend = 2;
  else if (price.price > ema20)                  score.trend = 1;
  else if (price.price < ema20 && ema20 < ema50) score.trend = -2;
  else if (price.price < ema20)                  score.trend = -1;
  else score.trend = 0;

  // 3) EMA slope: directional momentum
  if (ema20Slope > 1.0)       score.slope = 2;
  else if (ema20Slope > 0.3)  score.slope = 1;
  else if (ema20Slope < -1.0) score.slope = -2;
  else if (ema20Slope < -0.3) score.slope = -1;
  else score.slope = 0;

  // 4) 24h momentum
  if (price.change24h > 4)       score.mom = 2;
  else if (price.change24h > 1.5) score.mom = 1;
  else if (price.change24h < -4) score.mom = -2;
  else if (price.change24h < -1.5) score.mom = -1;
  else score.mom = 0;

  // 5) Mean-reversion (position-in-range): extremes pull the OPPOSITE direction
  if (positionInRange < 0.15)      score.mr = 2;
  else if (positionInRange < 0.30) score.mr = 1;
  else if (positionInRange > 0.85) score.mr = -2;
  else if (positionInRange > 0.70) score.mr = -1;
  else score.mr = 0;

  // 6) Regime alignment (-2..+2 from regime)
  const regimeBias = regime.state.startsWith('BULLISH') ? 1 : regime.state.startsWith('BEARISH') ? -1 : 0;
  score.regime = regimeBias * (regime.confidence > 70 ? 2 : 1);

  // Combine. Trend & RSI carry the most weight; mr counterbalances; regime tilts.
  const composite = score.rsi * 1.0
                  + score.trend * 1.2
                  + score.slope * 0.8
                  + score.mom * 0.7
                  + score.mr * 0.9
                  + score.regime * 0.6;

  if (Math.abs(composite) < 2.5) return null;   // require meaningful conviction

  const direction: Direction = composite > 0 ? 'LONG' : 'SHORT';

  // Conflict guard: if trend and RSI strongly oppose → not a clean setup
  if (score.trend > 1 && score.rsi < -1) return null;
  if (score.trend < -1 && score.rsi > 1) return null;

  // Confidence: 50 + |composite|*5 + agreement bonus (count of components that agree with direction)
  const agreeCount = Object.values(score).filter(v =>
    direction === 'LONG' ? v > 0 : v < 0,
  ).length;
  const confidence = Math.min(95, Math.round(50 + Math.abs(composite) * 5 + agreeCount * 2));
  if (confidence < MIN_CONFIDENCE) return null;

  // ATR-based targets, sized to typically be hittable in TTL window.
  // Use ATR%×(time-multiplier) — over 4h ≈ ~3-4× the 30m ATR move on average.
  const atr = atrPercent > 0 ? atrPercent : 0.5;
  const slPct = Math.min(3.5, Math.max(0.8, atr * 1.4));
  const tp1Pct = Math.min(5.0, Math.max(1.2, atr * 2.0));
  const tp2Pct = Math.min(8.0, Math.max(2.0, atr * 3.5));

  const entryWindow = price.price * 0.0025;
  const entryMin = price.price - entryWindow;
  const entryMax = price.price + entryWindow;
  const target1  = direction === 'LONG' ? price.price * (1 + tp1Pct / 100) : price.price * (1 - tp1Pct / 100);
  const target2  = direction === 'LONG' ? price.price * (1 + tp2Pct / 100) : price.price * (1 - tp2Pct / 100);
  const stopLoss = direction === 'LONG' ? price.price * (1 - slPct / 100)  : price.price * (1 + slPct / 100);

  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    confidence >= 80 ? 'LOW' : confidence >= 70 ? 'MEDIUM' : 'HIGH';
  const strength = String(Math.min(10, Math.round(confidence / 10)));

  const drivers: string[] = [];
  if (Math.abs(score.rsi) >= 1)    drivers.push(`RSI=${rsi14.toFixed(0)}`);
  if (Math.abs(score.trend) >= 1)  drivers.push(score.trend > 0 ? 'price>EMA20>EMA50' : 'price<EMA20<EMA50');
  if (Math.abs(score.slope) >= 1)  drivers.push(`EMA20 slope ${ema20Slope.toFixed(2)}%`);
  if (Math.abs(score.mom) >= 1)    drivers.push(`24h ${price.change24h.toFixed(1)}%`);
  if (Math.abs(score.mr) >= 1)     drivers.push(positionInRange < 0.5 ? `near 24h low` : `near 24h high`);
  if (regimeBias !== 0)            drivers.push(regime.state);

  const decimals = price.price > 100 ? 2 : 4;
  const thesis = `${direction} ${price.ticker}: ` + drivers.join(' + ');
  const invalidation = direction === 'LONG'
    ? `Below ${stopLoss.toFixed(decimals)} invalidates`
    : `Above ${stopLoss.toFixed(decimals)} invalidates`;

  return {
    ticker: price.ticker,
    signalType: direction,
    confidence,
    currentPrice: price.price,
    entryMin, entryMax, target1, target2, stopLoss,
    riskLevel, strength, thesis, invalidation,
  };
}

// ─── Outcome resolver ────────────────────────────────────────────────────────
// For each active signal, walk the OHLC since signal creation. Any 30-min
// candle whose high/low touched target_1, target_2, or stop_loss → resolve
// the signal with the corresponding outcome. Signals that have not resolved
// AND are past their TTL → mark as 'expired' with no profit_loss.

interface ActiveSignalRow {
  id: string;
  symbol: string;
  signal_type: 'LONG' | 'SHORT';
  current_price: number;
  target_1: number | null;
  target_2: number | null;
  stop_loss: number | null;
  expires_at: string;
  created_at: string;
}

interface ResolvedOutcome {
  id: string;
  status: 'completed' | 'expired';
  exit_price: number | null;
  hit_target: number | null;       // 0=none, 1=TP1, 2=TP2
  hit_stop_loss: boolean;
  profit_loss_percent: number | null;
  completed_at: string;
}

function resolveSignalAgainstCandles(
  signal: ActiveSignalRow,
  candles: Candle[],
  nowMs: number,
): ResolvedOutcome | null {
  const createdAtMs = new Date(signal.created_at).getTime();
  const expiresAtMs = new Date(signal.expires_at).getTime();
  const isLong = signal.signal_type === 'LONG';
  const tp1 = signal.target_1 ?? null;
  const tp2 = signal.target_2 ?? null;
  const sl = signal.stop_loss ?? null;

  // Walk candles strictly after signal creation. Candle ts represents the
  // candle's OPEN; a candle at ts T covered T..T+30min, so include candles
  // whose CLOSE timestamp (ts+30m) is after createdAt.
  const HALF_HOUR = 30 * 60 * 1000;
  const relevant = candles.filter(c => (c.ts + HALF_HOUR) > createdAtMs && c.ts <= nowMs);

  for (const c of relevant) {
    if (isLong) {
      // For a LONG: SL is below entry → c.low ≤ SL means SL hit;
      //             TP1/TP2 above entry → c.high ≥ TP means TP hit.
      // Conservatively: if both TP and SL are inside the same candle,
      // resolve as SL (worst-case fill — conservative outcome accounting).
      const slHit = sl !== null && c.low <= sl;
      const tp2Hit = tp2 !== null && c.high >= tp2;
      const tp1Hit = tp1 !== null && c.high >= tp1;
      if (slHit) {
        const exit = sl!;
        const pl = ((exit - signal.current_price) / signal.current_price) * 100;
        return {
          id: signal.id, status: 'completed', exit_price: exit,
          hit_target: 0, hit_stop_loss: true, profit_loss_percent: pl,
          completed_at: new Date(Math.min(c.ts + HALF_HOUR, nowMs)).toISOString(),
        };
      }
      if (tp2Hit) {
        const exit = tp2!;
        const pl = ((exit - signal.current_price) / signal.current_price) * 100;
        return {
          id: signal.id, status: 'completed', exit_price: exit,
          hit_target: 2, hit_stop_loss: false, profit_loss_percent: pl,
          completed_at: new Date(Math.min(c.ts + HALF_HOUR, nowMs)).toISOString(),
        };
      }
      if (tp1Hit) {
        const exit = tp1!;
        const pl = ((exit - signal.current_price) / signal.current_price) * 100;
        return {
          id: signal.id, status: 'completed', exit_price: exit,
          hit_target: 1, hit_stop_loss: false, profit_loss_percent: pl,
          completed_at: new Date(Math.min(c.ts + HALF_HOUR, nowMs)).toISOString(),
        };
      }
    } else {
      // SHORT: SL above entry, TP below.
      const slHit = sl !== null && c.high >= sl;
      const tp2Hit = tp2 !== null && c.low <= tp2;
      const tp1Hit = tp1 !== null && c.low <= tp1;
      if (slHit) {
        const exit = sl!;
        const pl = ((signal.current_price - exit) / signal.current_price) * 100;
        return {
          id: signal.id, status: 'completed', exit_price: exit,
          hit_target: 0, hit_stop_loss: true, profit_loss_percent: pl,
          completed_at: new Date(Math.min(c.ts + HALF_HOUR, nowMs)).toISOString(),
        };
      }
      if (tp2Hit) {
        const exit = tp2!;
        const pl = ((signal.current_price - exit) / signal.current_price) * 100;
        return {
          id: signal.id, status: 'completed', exit_price: exit,
          hit_target: 2, hit_stop_loss: false, profit_loss_percent: pl,
          completed_at: new Date(Math.min(c.ts + HALF_HOUR, nowMs)).toISOString(),
        };
      }
      if (tp1Hit) {
        const exit = tp1!;
        const pl = ((signal.current_price - exit) / signal.current_price) * 100;
        return {
          id: signal.id, status: 'completed', exit_price: exit,
          hit_target: 1, hit_stop_loss: false, profit_loss_percent: pl,
          completed_at: new Date(Math.min(c.ts + HALF_HOUR, nowMs)).toISOString(),
        };
      }
    }
  }

  // No TP/SL hit — if past TTL, expire with the last close as exit
  if (expiresAtMs <= nowMs) {
    const lastClose = candles.length > 0 ? candles[candles.length - 1].close : signal.current_price;
    const pl = isLong
      ? ((lastClose - signal.current_price) / signal.current_price) * 100
      : ((signal.current_price - lastClose) / signal.current_price) * 100;
    return {
      id: signal.id, status: 'expired', exit_price: lastClose,
      hit_target: 0, hit_stop_loss: false, profit_loss_percent: pl,
      completed_at: new Date(nowMs).toISOString(),
    };
  }
  return null;
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

interface TickResult {
  generated: number;
  published: number;
  skippedDuplicate: number;
  resolved: number;
  resolvedHitTP1: number;
  resolvedHitTP2: number;
  resolvedHitSL: number;
  expired: number;
  errors: string[];
  regime: string;
}

async function runSignalTick(): Promise<TickResult> {
  const supabase = getSupabase();
  const result: TickResult = {
    generated: 0, published: 0, skippedDuplicate: 0,
    resolved: 0, resolvedHitTP1: 0, resolvedHitTP2: 0, resolvedHitSL: 0, expired: 0,
    errors: [], regime: 'RANGEBOUND',
  };

  const [prices, candlesByTicker, recentSignalsResult, activeSignalsResult] = await Promise.all([
    fetchPrices(),
    fetchCandlesByTicker(),
    supabase.from('intelligence_signals')
      .select('symbol, signal_type, created_at')
      .gte('created_at', new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString()),
    supabase.from('intelligence_signals')
      .select('id, symbol, signal_type, current_price, target_1, target_2, stop_loss, expires_at, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(OUTCOME_RESOLVER_LIMIT),
  ]);

  if ((recentSignalsResult as any).error) {
    const msg = `intelligence_signals read failed: ${(recentSignalsResult as any).error.message ?? (recentSignalsResult as any).error}`;
    console.error('[signal-tick]', msg);
    result.errors.push(msg);
    return result;
  }
  if (prices.size === 0) {
    result.errors.push('Failed to fetch prices from CoinGecko');
    return result;
  }

  // Step 1 — resolve outcomes for stale active signals against fresh OHLC.
  const nowMs = Date.now();
  const activeRows = (((activeSignalsResult as any).data) || []) as ActiveSignalRow[];
  const resolutions: ResolvedOutcome[] = [];
  for (const row of activeRows) {
    const candles = candlesByTicker.get(row.symbol);
    if (!candles || candles.length === 0) continue;
    const out = resolveSignalAgainstCandles(row, candles, nowMs);
    if (out) resolutions.push(out);
  }
  for (const r of resolutions) {
    const { error } = await supabase
      .from('intelligence_signals')
      .update({
        status: r.status,
        exit_price: r.exit_price,
        hit_target: r.hit_target,
        hit_stop_loss: r.hit_stop_loss,
        profit_loss_percent: r.profit_loss_percent,
        completed_at: r.completed_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', r.id);
    if (error) {
      result.errors.push(`resolve ${r.id} failed: ${error.message ?? error}`);
      continue;
    }
    if (r.status === 'completed') {
      result.resolved++;
      if (r.hit_stop_loss) result.resolvedHitSL++;
      else if (r.hit_target === 2) result.resolvedHitTP2++;
      else if (r.hit_target === 1) result.resolvedHitTP1++;
    } else {
      result.expired++;
    }
  }
  if (resolutions.length > 0) {
    console.info(`[signal-tick] RESOLVED ${result.resolved} (TP1=${result.resolvedHitTP1} TP2=${result.resolvedHitTP2} SL=${result.resolvedHitSL}) + ${result.expired} expired`);
  }

  // Step 2 — generate fresh candidates from breadth-aware regime + indicators.
  const regimeSnap = await detectRichRegime(prices.get('BTC'));
  result.regime = regimeSnap.state;
  console.info(`[signal-tick] regime=${regimeSnap.state} conf=${regimeSnap.confidence.toFixed(0)}% trend=${regimeSnap.trendStrength.toFixed(0)} breadth=${(regimeSnap.bullishRatio * 100).toFixed(0)}%`);

  const recentSignals = ((recentSignalsResult as any).data || []) as Array<{ symbol: string; signal_type: string }>;
  const dupeKey = (sym: string, dir: string) => `${sym}::${dir}`;
  const recentDupes = new Set<string>(recentSignals.map(s => dupeKey(s.symbol, s.signal_type)));

  const candidates: Candidate[] = [];
  for (const price of prices.values()) {
    const candles = candlesByTicker.get(price.ticker);
    if (!candles) continue;
    const ind = computeIndicators(candles);
    if (!ind) continue;
    const c = generateCandidate(price, ind, regimeSnap);
    if (c) candidates.push(c);
  }
  result.generated = candidates.length;

  const ranked = candidates
    .sort((a, b) => b.confidence - a.confidence)
    .filter(c => {
      if (recentDupes.has(dupeKey(c.ticker, c.signalType))) {
        result.skippedDuplicate++;
        return false;
      }
      return true;
    })
    .slice(0, MAX_PUBLISH_PER_TICK);

  // Step 3 — publish.
  if (ranked.length > 0) {
    const expiresAt = new Date(Date.now() + SIGNAL_TTL_MS).toISOString();
    const rows = ranked.map(c => ({
      symbol: c.ticker,
      signal_type: c.signalType,
      confidence: c.confidence,
      current_price: c.currentPrice,
      entry_min: c.entryMin,
      entry_max: c.entryMax,
      entry_price: c.currentPrice,
      target_1: c.target1,
      target_2: c.target2,
      stop_loss: c.stopLoss,
      risk_level: c.riskLevel,
      strength: c.strength,
      status: 'active',
      timeframe: '4h',
      expires_at: expiresAt,
      regime: result.regime,
      thesis: c.thesis,
      invalidation: c.invalidation,
    }));
    const { error } = await supabase.from('intelligence_signals').insert(rows);
    if (error) {
      const msg = `intelligence_signals insert failed: ${error.message ?? error.code ?? error}`;
      console.error('[signal-tick]', msg);
      result.errors.push(msg);
    } else {
      result.published = rows.length;
      console.info(`[signal-tick] PUBLISHED ${rows.length} signals: ${ranked.map(c => `${c.ticker}-${c.signalType}@${c.confidence}`).join(', ')}`);
    }
  }

  // Step 4 — final sweep: expire any active signal still past TTL that we
  // didn't resolve above (e.g. candles missing for that pair).
  const { count: expiredCount, error: expireErr } = await supabase
    .from('intelligence_signals')
    .update({ status: 'expired', completed_at: new Date().toISOString() }, { count: 'exact' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString());
  if (expireErr) {
    const msg = `expire pass failed: ${expireErr.message ?? expireErr.code ?? expireErr}`;
    console.error('[signal-tick]', msg);
    result.errors.push(msg);
  } else if (expiredCount && expiredCount > 0) {
    result.expired += expiredCount;
  }

  return result;
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
    const result = await runSignalTick();
    const elapsedMs = Date.now() - startedAt;
    console.info(`[signal-tick] DONE in ${elapsedMs}ms`, result);
    return res.status(200).json({ ok: true, elapsedMs, ...result });
  } catch (err: any) {
    console.error('[signal-tick] FATAL', err);
    return res.status(500).json({ error: 'Tick failed', message: err?.message, stack: err?.stack });
  }
}

export const config = {
  maxDuration: 60,
};
