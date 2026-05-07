/**
 * Market sentiment intelligence — Fear & Greed + Binance funding rate +
 * long/short ratio. All free, no API keys, no quotas the cron will hit.
 *
 * The cron calls fetchSentiment() once per tick (~3 parallel HTTP requests, ~300ms).
 * Result is cached in module-level state with a 5-minute TTL so repeated calls
 * within a single function instance reuse the same fetch (Vercel Fluid Compute
 * reuses instances across ticks).
 */

export interface SentimentSnapshot {
  fearGreed: number;          // 0 (extreme fear) - 100 (extreme greed). Daily.
  fearGreedClass: string;     // 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
  fundingRateBTC: number;     // % per 8h. >0.05% = longs paying heavily; <-0.05% = shorts paying
  fundingRateETH: number;
  longShortRatio: number;     // BTC top-trader long/short. >2 = crowd long, <0.5 = crowd short.
  fetchedAt: number;
  partial: boolean;           // true if any source failed; the others are still valid
}

let cache: SentimentSnapshot | null = null;
const TTL_MS = 5 * 60 * 1000;

const FNG_URL    = 'https://api.alternative.me/fng/?limit=1';
const FUNDING_URL = (sym: string) => `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${sym}`;
const LSR_URL    = 'https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1';

async function fetchJSON(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchSentiment(): Promise<SentimentSnapshot> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache;

  const results = await Promise.allSettled([
    fetchJSON(FNG_URL),
    fetchJSON(FUNDING_URL('BTCUSDT')),
    fetchJSON(FUNDING_URL('ETHUSDT')),
    fetchJSON(LSR_URL),
  ]);

  const snap: SentimentSnapshot = {
    fearGreed: cache?.fearGreed ?? 50,
    fearGreedClass: cache?.fearGreedClass ?? 'Neutral',
    fundingRateBTC: cache?.fundingRateBTC ?? 0,
    fundingRateETH: cache?.fundingRateETH ?? 0,
    longShortRatio: cache?.longShortRatio ?? 1,
    fetchedAt: Date.now(),
    partial: false,
  };

  // Fear & Greed
  if (results[0].status === 'fulfilled') {
    const d = results[0].value?.data?.[0];
    if (d) {
      snap.fearGreed = Number(d.value);
      snap.fearGreedClass = String(d.value_classification ?? 'Neutral');
    }
  } else snap.partial = true;

  // BTC funding (premiumIndex returns lastFundingRate as fraction; *100 for %)
  if (results[1].status === 'fulfilled') {
    const r = Number(results[1].value?.lastFundingRate ?? 0) * 100;
    snap.fundingRateBTC = r;
  } else snap.partial = true;

  // ETH funding
  if (results[2].status === 'fulfilled') {
    const r = Number(results[2].value?.lastFundingRate ?? 0) * 100;
    snap.fundingRateETH = r;
  } else snap.partial = true;

  // Long/Short ratio
  if (results[3].status === 'fulfilled') {
    const arr = results[3].value;
    if (Array.isArray(arr) && arr[0]) {
      snap.longShortRatio = Number(arr[0].longShortRatio ?? 1);
    }
  } else snap.partial = true;

  cache = snap;
  return snap;
}

/**
 * Translate a sentiment snapshot into a directional bias adjustment for a
 * candidate trade. Positive bias = LONG-favorable, negative = SHORT-favorable.
 * Range roughly -15 to +15, fed into the quality scorer.
 */
export function sentimentBias(snap: SentimentSnapshot): { bias: number; reasons: string[] } {
  const reasons: string[] = [];
  let bias = 0;

  // Fear & Greed contrarian: extreme fear = buy, extreme greed = sell
  if (snap.fearGreed <= 20) { bias += 6; reasons.push(`+6 extreme fear (F&G=${snap.fearGreed})`); }
  else if (snap.fearGreed <= 30) { bias += 3; reasons.push(`+3 fear (F&G=${snap.fearGreed})`); }
  else if (snap.fearGreed >= 80) { bias -= 6; reasons.push(`-6 extreme greed (F&G=${snap.fearGreed})`); }
  else if (snap.fearGreed >= 70) { bias -= 3; reasons.push(`-3 greed (F&G=${snap.fearGreed})`); }

  // Funding rate contrarian: very positive = longs over-leveraged → expect squeeze down
  // (BTC funding moves the whole market; ETH adds confirmation)
  const avgFunding = (snap.fundingRateBTC + snap.fundingRateETH) / 2;
  if (avgFunding > 0.05) { bias -= 5; reasons.push(`-5 funding hot (${avgFunding.toFixed(3)}%)`); }
  else if (avgFunding > 0.02) { bias -= 2; reasons.push(`-2 funding warm`); }
  else if (avgFunding < -0.05) { bias += 5; reasons.push(`+5 funding inverted (${avgFunding.toFixed(3)}%)`); }
  else if (avgFunding < -0.02) { bias += 2; reasons.push(`+2 funding cool`); }

  // L/S ratio contrarian: crowd-long usually loses
  if (snap.longShortRatio >= 2.5) { bias -= 4; reasons.push(`-4 crowd long (L/S=${snap.longShortRatio.toFixed(2)})`); }
  else if (snap.longShortRatio >= 1.8) { bias -= 2; reasons.push(`-2 crowd lean-long`); }
  else if (snap.longShortRatio <= 0.4) { bias += 4; reasons.push(`+4 crowd short (L/S=${snap.longShortRatio.toFixed(2)})`); }
  else if (snap.longShortRatio <= 0.6) { bias += 2; reasons.push(`+2 crowd lean-short`); }

  return { bias: Math.max(-15, Math.min(15, bias)), reasons };
}
