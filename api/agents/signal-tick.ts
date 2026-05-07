/**
 * QuantumX Server-Side Signal Generator — Self-contained
 *
 * One execution = one signal pass:
 *   1. Fetch live prices via CoinGecko
 *   2. Detect coarse market regime
 *   3. For each pair: compute multi-confirmation signal
 *   4. Dedupe against active signals from last 15 min
 *   5. Insert top-5 confidence signals into intelligence_signals
 *   6. Mark expired signals (older than expires_at)
 *
 * Driven by Supabase pg_cron every 5 min.
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

const SIGNAL_TTL_MS = 2 * 60 * 60 * 1000;
const DEDUPE_WINDOW_MS = 15 * 60 * 1000;
const MIN_CONFIDENCE = 60;
const MAX_PUBLISH_PER_TICK = 5;

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

// ─── Regime + signal generation ──────────────────────────────────────────────

function detectMarketRegime(prices: Map<string, PriceData>): string {
  const btc = prices.get('BTC');
  if (!btc) return 'RANGEBOUND';
  const range = btc.high24h > 0 ? ((btc.high24h - btc.low24h) / btc.price) * 100 : 0;
  const isHighVol = range > 4.5;
  if (btc.change24h > 2.5)  return isHighVol ? 'BULLISH_HIGH_VOL' : 'BULLISH_LOW_VOL';
  if (btc.change24h < -2.5) return isHighVol ? 'BEARISH_HIGH_VOL' : 'BEARISH_LOW_VOL';
  return 'RANGEBOUND';
}

function generateCandidate(price: PriceData, regime: string): Candidate | null {
  const range = price.high24h > 0 ? ((price.high24h - price.low24h) / price.price) * 100 : 0;
  const positionInRange = price.high24h > price.low24h
    ? (price.price - price.low24h) / (price.high24h - price.low24h)
    : 0.5;

  const momentum   = price.change24h > 1 ? 1 : price.change24h < -1 ? -1 : 0;
  const meanRevert = positionInRange > 0.7 ? -1 : positionInRange < 0.3 ? 1 : 0;
  const regimeBias = regime.startsWith('BULLISH') ? 1 : regime.startsWith('BEARISH') ? -1 : 0;
  const volBias    = range > 3 ? Math.sign(momentum + regimeBias) : 0;

  const bias = momentum + meanRevert + regimeBias + volBias;
  if (Math.abs(bias) < 1) return null;

  const direction: Direction = bias > 0 ? 'LONG' : 'SHORT';
  const confidence = Math.min(95, Math.round(50 + Math.abs(bias) * 10 + (range > 3 ? 5 : 0)));
  if (confidence < MIN_CONFIDENCE) return null;

  const entryWindow = price.price * 0.003;
  const slPercent  = 0.02;
  const tp1Percent = 0.04;
  const tp2Percent = 0.07;

  const entryMin = price.price - entryWindow;
  const entryMax = price.price + entryWindow;
  const target1  = direction === 'LONG' ? price.price * (1 + tp1Percent) : price.price * (1 - tp1Percent);
  const target2  = direction === 'LONG' ? price.price * (1 + tp2Percent) : price.price * (1 - tp2Percent);
  const stopLoss = direction === 'LONG' ? price.price * (1 - slPercent)  : price.price * (1 + slPercent);

  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    confidence >= 80 ? 'LOW' : confidence >= 70 ? 'MEDIUM' : 'HIGH';
  const strength = String(Math.min(10, Math.round(confidence / 10)));

  const driverParts: string[] = [];
  if (momentum !== 0)   driverParts.push(`24h momentum ${price.change24h.toFixed(1)}%`);
  if (meanRevert !== 0) driverParts.push(positionInRange < 0.3 ? 'price near 24h low' : 'price near 24h high');
  if (regimeBias !== 0) driverParts.push(`${regime} regime`);
  if (range > 3)        driverParts.push(`expansion (24h range ${range.toFixed(1)}%)`);

  const decimals = price.price > 100 ? 2 : 4;
  const thesis = `${direction} ${price.ticker}: ` + driverParts.join(' + ');
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

// ─── Pipeline ────────────────────────────────────────────────────────────────

interface TickResult {
  generated: number;
  published: number;
  skippedDuplicate: number;
  expired: number;
  errors: string[];
  regime: string;
}

async function runSignalTick(): Promise<TickResult> {
  const supabase = getSupabase();
  const result: TickResult = {
    generated: 0, published: 0, skippedDuplicate: 0, expired: 0, errors: [], regime: 'RANGEBOUND',
  };

  const [prices, activeSignalsResult] = await Promise.all([
    fetchPrices(),
    supabase.from('intelligence_signals')
      .select('symbol, signal_type, created_at')
      .gte('created_at', new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString()),
  ]);

  if ((activeSignalsResult as any).error) {
    const msg = `intelligence_signals read failed: ${(activeSignalsResult as any).error.message ?? (activeSignalsResult as any).error}`;
    console.error('[signal-tick]', msg);
    result.errors.push(msg);
    return result;
  }
  if (prices.size === 0) {
    result.errors.push('Failed to fetch prices from CoinGecko');
    return result;
  }

  const recentSignals = ((activeSignalsResult as any).data || []) as Array<{ symbol: string; signal_type: string }>;
  const dupeKey = (sym: string, dir: string) => `${sym}::${dir}`;
  const recentDupes = new Set<string>(recentSignals.map(s => dupeKey(s.symbol, s.signal_type)));

  result.regime = detectMarketRegime(prices);

  const candidates: Candidate[] = [];
  for (const price of prices.values()) {
    const c = generateCandidate(price, result.regime);
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

  if (ranked.length > 0) {
    const expiresAt = new Date(Date.now() + SIGNAL_TTL_MS).toISOString();
    const rows = ranked.map(c => ({
      symbol: c.ticker,
      signal_type: c.signalType,
      confidence: c.confidence,
      current_price: c.currentPrice,
      entry_min: c.entryMin,
      entry_max: c.entryMax,
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

  // Expire stale signals (cleanup pass)
  const { count: expiredCount, error: expireErr } = await supabase
    .from('intelligence_signals')
    .update({ status: 'expired', completed_at: new Date().toISOString() }, { count: 'exact' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString());
  if (expireErr) {
    const msg = `expire pass failed: ${expireErr.message ?? expireErr.code ?? expireErr}`;
    console.error('[signal-tick]', msg);
    result.errors.push(msg);
  } else {
    result.expired = expiredCount ?? 0;
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
