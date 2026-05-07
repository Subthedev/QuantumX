/**
 * Pure MarketState enum.
 *
 * This module has zero dependencies — no localStorage, no fetch, no Supabase.
 * It is safe to import from both browser engines and Vercel serverless
 * functions.
 *
 * The full marketStateDetectionEngine (with CoinGecko fetching, caching, and
 * cross-validation) lives in src/services/marketStateDetectionEngine.ts and
 * re-exports this enum.
 */

export enum MarketState {
  BULLISH_HIGH_VOL = 'BULLISH_HIGH_VOL',
  BULLISH_LOW_VOL = 'BULLISH_LOW_VOL',
  BEARISH_HIGH_VOL = 'BEARISH_HIGH_VOL',
  BEARISH_LOW_VOL = 'BEARISH_LOW_VOL',
  RANGEBOUND = 'RANGEBOUND',
}
