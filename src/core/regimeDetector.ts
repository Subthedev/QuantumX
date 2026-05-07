/**
 * Pure regime detector — runtime-agnostic.
 *
 * Takes top-N crypto market data (already fetched by the caller) and returns
 * a 5-state market regime classification with confidence + diagnostic metrics.
 *
 * Algorithm matches src/services/marketStateDetectionEngine.ts so the browser
 * UI and the Vercel cron see identical regimes when given identical data.
 *
 * Pure: no fetch, no cache, no localStorage. Browser/server both pass in their
 * own slurped market data.
 */

import { MarketState } from './marketState';

export interface CoinSnapshot {
  symbol: string;
  current_price: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  market_cap: number;
  price_change_percentage_24h: number;
  market_cap_change_percentage_24h?: number;
  price_change_percentage_7d_in_currency?: number;
}

export interface RegimeAnalysis {
  state: MarketState;
  confidence: number;       // 0-100
  volatility: number;       // 0-100 (normalized)
  trendStrength: number;    // -100..+100
  rangeScore: number;       // 0-100 (higher = more rangebound)
  bullishRatio: number;     // 0-1 (% of coins up)
  avgPriceChange24h: number;
  avgVolumeRatio: number;   // total_volume / market_cap, %
  sampleSize: number;
  timestamp: number;
}

const HIGH_VOL_THRESHOLD = 40;
const LOW_VOL_THRESHOLD = 20;
const BULLISH_THRESHOLD = 15;
const BEARISH_THRESHOLD = -15;
const RANGE_THRESHOLD = 60;

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Classify market regime from top-N coin snapshots.
 *
 * @param coins  Top-N (typically 50) coin snapshots, sorted by market cap.
 * @returns Full regime analysis. State defaults to RANGEBOUND on empty input.
 */
export function detectRegimeFromCoins(coins: CoinSnapshot[]): RegimeAnalysis {
  const now = Date.now();
  if (!coins || coins.length === 0) {
    return {
      state: MarketState.RANGEBOUND,
      confidence: 40,
      volatility: 0,
      trendStrength: 0,
      rangeScore: 100,
      bullishRatio: 0.5,
      avgPriceChange24h: 0,
      avgVolumeRatio: 0,
      sampleSize: 0,
      timestamp: now,
    };
  }

  const priceChanges = coins.map(c => c.price_change_percentage_24h ?? 0);
  const avgPriceChange = priceChanges.reduce((s, v) => s + v, 0) / priceChanges.length;
  const sd = stdDev(priceChanges);

  // Volatility 0-100 — sd of cross-sectional returns scaled by 5
  const volatility = clamp(sd * 5, 0, 100);
  // Trend strength -100..+100 — avg change × 2
  const trendStrength = clamp(avgPriceChange * 2, -100, 100);
  const rangeScore = 100 - Math.abs(trendStrength);

  const bullishCount = priceChanges.filter(p => p > 0).length;
  const bullishRatio = bullishCount / priceChanges.length;

  const avgVolumeRatio = coins.reduce((s, c) => {
    const ratio = c.market_cap > 0 ? (c.total_volume / c.market_cap) * 100 : 0;
    return s + ratio;
  }, 0) / coins.length;

  // Decision tree (mirrors marketStateDetectionEngine.classifyMarketState)
  let state: MarketState;
  let confidence: number;

  if (rangeScore > RANGE_THRESHOLD && volatility < LOW_VOL_THRESHOLD) {
    state = MarketState.RANGEBOUND;
    confidence = rangeScore;
  } else if (trendStrength > BULLISH_THRESHOLD) {
    if (volatility > HIGH_VOL_THRESHOLD) {
      state = MarketState.BULLISH_HIGH_VOL;
      confidence = (trendStrength + volatility) / 2;
    } else {
      state = MarketState.BULLISH_LOW_VOL;
      confidence = trendStrength + (100 - volatility) / 2;
    }
  } else if (trendStrength < BEARISH_THRESHOLD) {
    if (volatility > HIGH_VOL_THRESHOLD) {
      state = MarketState.BEARISH_HIGH_VOL;
      confidence = (Math.abs(trendStrength) + volatility) / 2;
    } else {
      state = MarketState.BEARISH_LOW_VOL;
      confidence = Math.abs(trendStrength) + (100 - volatility) / 2;
    }
  } else {
    state = MarketState.RANGEBOUND;
    confidence = 50 + rangeScore / 4;
  }

  // Reduce confidence if breadth disagrees with direction
  if (state.startsWith('BULLISH') && bullishRatio < 0.4) confidence *= 0.8;
  else if (state.startsWith('BEARISH') && bullishRatio > 0.6) confidence *= 0.8;

  confidence = clamp(confidence, 40, 95);

  return {
    state,
    confidence,
    volatility,
    trendStrength,
    rangeScore,
    bullishRatio,
    avgPriceChange24h: avgPriceChange,
    avgVolumeRatio,
    sampleSize: coins.length,
    timestamp: now,
  };
}
