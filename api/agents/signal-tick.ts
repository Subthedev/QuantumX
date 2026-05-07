/**
 * QuantumX Server-Side Signal Generator — Vercel Cron
 *
 * Runs every 5 minutes via Vercel Cron. One execution = one signal pass:
 *   1. Fetch live prices from CoinGecko
 *   2. Detect market regime
 *   3. Load autonomous brain (strategy bias, blacklist)
 *   4. Run shared signal pipeline → SignalCandidates
 *   5. Deduplicate against intelligence_signals from last 15 min
 *   6. Insert top-N into intelligence_signals (Realtime broadcasts to clients)
 *   7. Mark stale signals (older than 2h) as expired
 *
 * Phase 2 deliverable. This replaces what globalHubService used to do in the
 * browser via setInterval (which died when the tab closed). Now the pipeline
 * runs server-side every 5 min and clients subscribe via Supabase Realtime.
 *
 * Authentication: same `Authorization: Bearer ${CRON_SECRET}` as trade-tick.
 *
 * Route: GET /api/agents/signal-tick
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import {
  generateSignalCandidates,
  DEFAULT_SIGNAL_UNIVERSE,
  type SignalCandidate,
} from '../../src/core/signalPipeline';
import {
  detectMarketStateFromPrices,
  type PriceData,
  type AutonomousBrain,
} from '../../src/core/tradeDecision';

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
  const ids = DEFAULT_SIGNAL_UNIVERSE.map(p => COINGECKO_IDS[p.symbol]).filter(Boolean).join(',');
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
    console.error('[signal-tick] CoinGecko fetch failed:', err?.message);
  }
  return map;
}

// ─── Fear & Greed (best-effort) ───────────────────────────────────────────────

async function fetchFearGreedIndex(): Promise<number> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch('https://api.alternative.me/fng/', { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!r.ok) return 50;
    const data: any = await r.json();
    const v = data?.data?.[0]?.value;
    return v ? Number(v) : 50;
  } catch {
    return 50;
  }
}

// ─── Brain loader (same as trade-tick) ────────────────────────────────────────

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

async function loadAutonomousBrain(supabase: any): Promise<AutonomousBrain> {
  try {
    const { data, error } = await supabase
      .from('autonomous_state')
      .select('state')
      .eq('id', 'singleton')
      .single();
    if (error || !data?.state) return DEFAULT_BRAIN;
    const s = data.state;
    return {
      positionSizeMultiplier: clamp(Number(s.positionSizeMultiplier ?? 1.0), 0.25, 1.5),
      signalFrequencyMultiplier: clamp(Number(s.signalFrequencyMultiplier ?? 1.0), 0.5, 2.0),
      regimeTransitionPenalty: clamp(Number(s.regimeTransitionPenalty ?? 1.0), 0.5, 1.0),
      strategyBias: s.strategyBias || {},
      blacklistedStrategies: s.blacklistedStrategies || [],
    };
  } catch {
    return DEFAULT_BRAIN;
  }
}

// ─── Insert helpers ───────────────────────────────────────────────────────────

interface InsertResult {
  inserted: number;
  skippedDuplicate: number;
  errors: string[];
}

async function insertSignals(
  supabase: any,
  candidates: SignalCandidate[],
  fearGreedIndex: number,
): Promise<InsertResult> {
  const result: InsertResult = { inserted: 0, skippedDuplicate: 0, errors: [] };
  if (candidates.length === 0) return result;

  // Dedup: any candidate that matches symbol+signal_type within last 15 min is skipped
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const symbols = candidates.map(c => c.symbol);
  const { data: recent } = await supabase
    .from('intelligence_signals')
    .select('symbol, signal_type')
    .in('symbol', symbols)
    .gte('created_at', since);

  const recentSet = new Set<string>(
    (recent ?? []).map((r: any) => `${r.symbol}-${r.signal_type}`)
  );

  const rows: any[] = [];
  for (const c of candidates) {
    if (recentSet.has(`${c.symbol}-${c.signalType}`)) {
      result.skippedDuplicate++;
      continue;
    }
    rows.push({
      symbol: c.symbol,
      signal_type: c.signalType,
      confidence: c.confidence,
      current_price: c.currentPrice,
      entry_min: c.entryMin,
      entry_max: c.entryMax,
      target_1: c.target1,
      target_2: c.target2,
      stop_loss: c.stopLoss,
      risk_level: c.riskLevel,
      strength: String(c.strength),
      status: 'active',
      timeframe: '1h',
      expires_at: new Date(Date.now() + c.expiresInMs).toISOString(),
      regime: c.regime,
      fear_greed_index: fearGreedIndex,
      funding_rate: 0,
      thesis: c.thesis,
      invalidation: c.invalidation,
    });
  }

  if (rows.length === 0) return result;

  const { error, data } = await supabase
    .from('intelligence_signals')
    .insert(rows)
    .select('id');

  if (error) {
    result.errors.push(error.message);
    console.error('[signal-tick] insert failed:', error.message);
  } else {
    result.inserted = data?.length ?? 0;
  }

  return result;
}

async function expireStaleSignals(supabase: any): Promise<number> {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('intelligence_signals')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('expires_at', cutoff)
    .select('id');
  if (error) {
    console.warn('[signal-tick] expire failed:', error.message);
    return 0;
  }
  return data?.length ?? 0;
}

// ─── Tick logic ───────────────────────────────────────────────────────────────

interface TickResult {
  generated: number;
  inserted: number;
  skippedDuplicate: number;
  expired: number;
  regime: string;
  fearGreed: number;
  errors: string[];
}

async function runSignalTick(): Promise<TickResult> {
  const supabase = getSupabase();
  const result: TickResult = {
    generated: 0, inserted: 0, skippedDuplicate: 0, expired: 0,
    regime: 'RANGEBOUND', fearGreed: 50, errors: [],
  };

  // 1. Load all state in parallel
  const [prices, brain, fearGreedIndex] = await Promise.all([
    fetchPrices(),
    loadAutonomousBrain(supabase),
    fetchFearGreedIndex(),
  ]);

  if (prices.size === 0) {
    result.errors.push('Failed to fetch any prices');
    return result;
  }

  result.fearGreed = fearGreedIndex;
  const marketState = detectMarketStateFromPrices(prices);
  result.regime = marketState;

  console.info(`[signal-tick] regime=${marketState} fg=${fearGreedIndex} pairs=${prices.size}`);

  // 2. Generate candidates via shared pipeline
  const candidates = generateSignalCandidates(
    prices,
    marketState,
    brain,
    DEFAULT_SIGNAL_UNIVERSE,
    { minConfidence: 65, maxSignals: 4, expiresInMs: 2 * 60 * 60 * 1000, fearGreedIndex },
  );
  result.generated = candidates.length;

  // 3. Insert with dedup
  const insertResult = await insertSignals(supabase, candidates, fearGreedIndex);
  result.inserted = insertResult.inserted;
  result.skippedDuplicate = insertResult.skippedDuplicate;
  result.errors.push(...insertResult.errors);

  // 4. Expire stale signals
  result.expired = await expireStaleSignals(supabase);

  return result;
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
    const result = await runSignalTick();
    const elapsedMs = Date.now() - startedAt;
    console.info(`[signal-tick] DONE in ${elapsedMs}ms`, JSON.stringify(result));
    return res.status(200).json({ ok: true, elapsedMs, ...result });
  } catch (err: any) {
    console.error('[signal-tick] FATAL', err);
    return res.status(500).json({ error: 'Tick failed', message: err?.message });
  }
}

export const config = {
  maxDuration: 60,
};
