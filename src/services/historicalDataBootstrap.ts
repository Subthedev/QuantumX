/**
 * HISTORICAL DATA BOOTSTRAP - ML Training Data from Binance
 *
 * Fetches real historical kline data and simulates signal outcomes
 * to pre-train the ML model before live trading begins.
 *
 * Strategy: Applies the same ATR-based TP/SL logic used in production
 * to historical candles, generating realistic WIN/LOSS/TIMEOUT labels.
 */

import { deltaV2QualityEngine, type StrategyType, type MarketRegime } from './deltaV2QualityEngine';
import { zetaLearningEngine } from './zetaLearningEngine';

interface HistoricalCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SimulatedOutcome {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  exit: number;
  returnPct: number;
  outcome: 'WIN' | 'LOSS' | 'TIMEOUT';
  strategy: StrategyType;
  regime: MarketRegime;
  quality_score: number;
  timestamp: number;
}

const BINANCE_KLINES = 'https://api.binance.com/api/v3/klines';

// Coins to bootstrap from — focused set for best ML signal
const BOOTSTRAP_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];

const STRATEGIES: StrategyType[] = [
  'MOMENTUM', 'MEAN_REVERSION', 'BREAKOUT', 'SUPPORT_RESISTANCE'
];

/**
 * Fetch historical klines from Binance
 */
async function fetchKlines(
  symbol: string,
  interval: string = '1h',
  limit: number = 500
): Promise<HistoricalCandle[]> {
  try {
    const response = await fetch(
      `${BINANCE_KLINES}?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!response.ok) return [];

    const data = await response.json();
    return data.map((k: any) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (err) {
    console.warn(`[Bootstrap] Failed to fetch ${symbol} klines:`, err);
    return [];
  }
}

/**
 * Calculate ATR from candles (14-period)
 */
function calculateATR(candles: HistoricalCandle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  let atrSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1]?.close || candles[i].open;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    atrSum += tr;
  }

  return atrSum / period;
}

/**
 * Detect market regime from recent candles
 */
function detectRegime(candles: HistoricalCandle[]): MarketRegime {
  if (candles.length < 20) return 'SIDEWAYS';

  const recent = candles.slice(-20);
  const firstPrice = recent[0].close;
  const lastPrice = recent[recent.length - 1].close;
  const changePct = ((lastPrice - firstPrice) / firstPrice) * 100;

  // Calculate volatility
  const returns = recent.slice(1).map((c, i) =>
    Math.abs((c.close - recent[i].close) / recent[i].close)
  );
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;

  if (avgReturn > 0.03) return 'HIGH_VOLATILITY';
  if (avgReturn < 0.008) return 'LOW_VOLATILITY';
  if (changePct > 5) return 'BULLISH_TREND';
  if (changePct < -5) return 'BEARISH_TREND';
  return 'SIDEWAYS';
}

/**
 * Simulate a signal on historical candles
 * Uses the same ATR-based TP/SL as production (1x ATR TP1, 0.75x ATR SL)
 */
function simulateSignal(
  candles: HistoricalCandle[],
  entryIdx: number,
  direction: 'LONG' | 'SHORT',
  atr: number,
  lookForward: number = 24 // candles to look forward
): { outcome: 'WIN' | 'LOSS' | 'TIMEOUT'; exitPrice: number; returnPct: number } {
  const entry = candles[entryIdx].close;
  const atrPct = atr / entry;

  // Same TP/SL as production
  const tp1 = direction === 'LONG'
    ? entry * (1 + atrPct * 1.0)
    : entry * (1 - atrPct * 1.0);
  const sl = direction === 'LONG'
    ? entry * (1 - atrPct * 0.75)
    : entry * (1 + atrPct * 0.75);

  // Walk forward through candles
  const endIdx = Math.min(entryIdx + lookForward, candles.length - 1);

  for (let i = entryIdx + 1; i <= endIdx; i++) {
    const candle = candles[i];

    if (direction === 'LONG') {
      // Check SL first (conservative — assumes worst case within candle)
      if (candle.low <= sl) {
        const ret = ((sl - entry) / entry) * 100;
        return { outcome: 'LOSS', exitPrice: sl, returnPct: ret };
      }
      if (candle.high >= tp1) {
        const ret = ((tp1 - entry) / entry) * 100;
        return { outcome: 'WIN', exitPrice: tp1, returnPct: ret };
      }
    } else {
      if (candle.high >= sl) {
        const ret = ((entry - sl) / entry) * 100;
        return { outcome: 'LOSS', exitPrice: sl, returnPct: ret };
      }
      if (candle.low <= tp1) {
        const ret = ((entry - tp1) / entry) * 100;
        return { outcome: 'WIN', exitPrice: tp1, returnPct: ret };
      }
    }
  }

  // Timeout
  const lastPrice = candles[endIdx].close;
  const ret = direction === 'LONG'
    ? ((lastPrice - entry) / entry) * 100
    : ((entry - lastPrice) / entry) * 100;
  return { outcome: 'TIMEOUT', exitPrice: lastPrice, returnPct: ret };
}

/**
 * Generate direction signal from candles (simple momentum + mean reversion)
 */
function generateDirection(
  candles: HistoricalCandle[],
  idx: number,
  strategy: StrategyType
): 'LONG' | 'SHORT' {
  const recent = candles.slice(Math.max(0, idx - 10), idx + 1);
  const change = ((recent[recent.length - 1].close - recent[0].close) / recent[0].close) * 100;

  if (strategy === 'MOMENTUM' || strategy === 'BREAKOUT') {
    return change > 0 ? 'LONG' : 'SHORT';
  }
  // Mean reversion / support-resistance: fade the move
  return change > 0 ? 'SHORT' : 'LONG';
}

/**
 * Bootstrap ML with historical data
 * Call this once on app startup to pre-train the model
 */
export async function bootstrapMLFromHistory(): Promise<{ loaded: number; winRate: number }> {
  const STORAGE_KEY = 'ml_bootstrap_done_v2';

  // Only bootstrap once
  if (localStorage.getItem(STORAGE_KEY)) {
    console.log('[Bootstrap] ML already bootstrapped from historical data');
    return { loaded: 0, winRate: 0 };
  }

  console.log('[Bootstrap] Fetching historical data from Binance for ML training...');

  const allOutcomes: SimulatedOutcome[] = [];

  for (const symbol of BOOTSTRAP_SYMBOLS) {
    // Fetch 500 hourly candles (~21 days)
    const candles = await fetchKlines(symbol, '1h', 500);
    if (candles.length < 50) {
      console.warn(`[Bootstrap] Insufficient data for ${symbol}, skipping`);
      continue;
    }

    console.log(`[Bootstrap] ${symbol}: ${candles.length} candles loaded`);

    // Generate simulated signals every 6 candles (every 6 hours)
    for (let i = 30; i < candles.length - 24; i += 6) {
      const atr = calculateATR(candles.slice(0, i + 1));
      if (atr <= 0) continue;

      const regime = detectRegime(candles.slice(0, i + 1));

      for (const strategy of STRATEGIES) {
        const direction = generateDirection(candles, i, strategy);
        const result = simulateSignal(candles, i, direction, atr, 24);

        const quality = 40 + Math.random() * 40; // Simulate quality score range

        allOutcomes.push({
          symbol: symbol.replace('USDT', ''),
          direction,
          entry: candles[i].close,
          exit: result.exitPrice,
          returnPct: result.returnPct,
          outcome: result.outcome,
          strategy,
          regime,
          quality_score: quality,
          timestamp: candles[i].openTime
        });
      }
    }
  }

  if (allOutcomes.length === 0) {
    console.warn('[Bootstrap] No historical outcomes generated');
    return { loaded: 0, winRate: 0 };
  }

  // Feed outcomes into Delta V2 ML
  let wins = 0;
  for (const o of allOutcomes) {
    const win = o.outcome === 'WIN';
    if (win) wins++;

    deltaV2QualityEngine.recordOutcome(
      `bootstrap-${o.timestamp}`,
      {
        id: `bootstrap-${o.timestamp}`,
        symbol: o.symbol,
        direction: o.direction,
        confidence: o.quality_score,
        grade: 'B',
        strategy: o.strategy,
        technicals: { rsi: 50, macd: 0, volume: 1, volatility: 0.03 },
        timestamp: o.timestamp
      },
      o.outcome === 'WIN' ? 'WIN' : 'LOSS',
      o.returnPct
    );
  }

  // Feed outcomes into Zeta Learning Engine for fast self-improvement bootstrapping
  for (const o of allOutcomes) {
    zetaLearningEngine.processSignalOutcome({
      signalId: `bootstrap-${o.timestamp}`,
      symbol: o.symbol,
      direction: o.direction,
      outcome: o.outcome,
      entryPrice: o.entry,
      exitPrice: o.exit,
      confidence: o.quality_score,
      strategy: o.strategy,
      regime: o.regime,
      returnPct: o.returnPct,
      timestamp: o.timestamp
    });
  }
  console.log(`[Bootstrap] Fed ${allOutcomes.length} outcomes into Zeta learning engine`);

  // Also save to localStorage outcomes store for Zeta
  const OUTCOMES_KEY = 'signal_outcomes_v1';
  const existing = JSON.parse(localStorage.getItem(OUTCOMES_KEY) || '[]');
  const bootstrapOutcomes = allOutcomes.map(o => ({
    signal_id: `bootstrap-${o.timestamp}`,
    symbol: o.symbol,
    direction: o.direction,
    strategy: o.strategy,
    market_regime: o.regime,
    entry_price: o.entry,
    exit_price: o.exit,
    return_pct: o.returnPct,
    outcome: o.outcome,
    quality_score: o.quality_score,
    created_at: new Date(o.timestamp).toISOString()
  }));

  const merged = [...bootstrapOutcomes, ...existing].slice(0, 500);
  localStorage.setItem(OUTCOMES_KEY, JSON.stringify(merged));

  const winRate = (wins / allOutcomes.length) * 100;
  console.log(
    `[Bootstrap] ML trained with ${allOutcomes.length} historical outcomes | ` +
    `Win Rate: ${winRate.toFixed(1)}% | ` +
    `Wins: ${wins}, Losses: ${allOutcomes.length - wins}`
  );

  localStorage.setItem(STORAGE_KEY, Date.now().toString());

  return { loaded: allOutcomes.length, winRate };
}
