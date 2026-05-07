/**
 * Liquidation cascade pulse — free, no API key.
 *
 * The /allForceOrders Binance endpoint requires premium, so we infer cascade
 * pressure from public 1-minute klines on Binance Futures. A "cascade candle"
 * is a recent bar with abnormal volume AND abnormal range AND a wick that
 * suggests forced unwinds (long lower wick on dumps = longs liquidated, long
 * upper wick on pumps = shorts squeezed).
 *
 * Output: per-symbol cascade pressure (-100..+100). Negative = down-cascade
 * (longs being flushed) → bearish in the immediate term. Positive = up-cascade
 * (shorts being squeezed) → bullish.
 *
 * Cached 60s — much shorter than sentiment because cascades move fast.
 */

const KLINE_URL = (sym: string) =>
  `https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=1m&limit=20`;

export interface LiquidationPulse {
  pressure: number;      // -100 (down-cascade) .. +100 (up-cascade)
  intensity: number;     // 0 (calm) .. 100 (extreme)
  detectedAt: number;
  sample: number;        // count of cascade candles in lookback window
}

interface CacheEntry {
  data: LiquidationPulse;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 1000;

async function fetchJSON(url: string, timeoutMs = 6000): Promise<any> {
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

export async function fetchLiquidationPulse(symbol: string): Promise<LiquidationPulse> {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) return hit.data;

  const empty: LiquidationPulse = { pressure: 0, intensity: 0, detectedAt: Date.now(), sample: 0 };

  let raw: any[];
  try {
    raw = await fetchJSON(KLINE_URL(symbol));
  } catch {
    cache.set(symbol, { data: empty, fetchedAt: Date.now() });
    return empty;
  }
  if (!Array.isArray(raw) || raw.length < 10) {
    cache.set(symbol, { data: empty, fetchedAt: Date.now() });
    return empty;
  }

  // Binance kline schema: [openTime, open, high, low, close, volume, closeTime, qVol, n, ...]
  const candles = raw.map(k => ({
    open:   Number(k[1]),
    high:   Number(k[2]),
    low:    Number(k[3]),
    close:  Number(k[4]),
    volume: Number(k[5]),
  }));

  // Median volume + range (excluding the most recent 3 — those are the candidates)
  const baseline = candles.slice(0, -3);
  const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b);
  const median = (arr: number[]) => sorted(arr)[Math.floor(arr.length / 2)] ?? 0;

  const medVol = median(baseline.map(c => c.volume));
  const medRange = median(baseline.map(c => (c.high - c.low) / Math.max(1e-9, c.close)));

  if (medVol === 0 || medRange === 0) {
    cache.set(symbol, { data: empty, fetchedAt: Date.now() });
    return empty;
  }

  // Score the most recent 3 candles for cascade signature
  const recent = candles.slice(-3);
  let pressureSum = 0;
  let cascadeCount = 0;
  let maxIntensity = 0;

  for (const c of recent) {
    const range = (c.high - c.low) / Math.max(1e-9, c.close);
    const volRatio = c.volume / medVol;
    const rangeRatio = range / medRange;

    // Cascade requires both abnormal volume AND abnormal range
    if (volRatio < 2 || rangeRatio < 1.8) continue;

    cascadeCount++;
    const body = c.close - c.open;
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const totalRange = c.high - c.low || 1e-9;

    // Direction: body sign + dominant wick
    // Dump cascade: long lower wick OR strong red body = longs liquidated → bearish
    // Pump cascade: long upper wick OR strong green body = shorts squeezed → bullish
    const bodyScore = (body / totalRange) * 60;             // -60..+60
    const wickScore = ((upperWick - lowerWick) / totalRange) * 30; // -30..+30 (upper wick = bullish squeeze)
    const dirScore = bodyScore + wickScore;

    // Magnitude scaled by how extreme the volume + range are
    const magnitude = Math.min(2.5, (volRatio + rangeRatio) / 2);
    const candlePressure = Math.max(-100, Math.min(100, dirScore * magnitude));

    pressureSum += candlePressure;
    const intensity = Math.min(100, volRatio * 20 + rangeRatio * 15);
    if (intensity > maxIntensity) maxIntensity = intensity;
  }

  const pressure = cascadeCount > 0 ? pressureSum / cascadeCount : 0;
  const result: LiquidationPulse = {
    pressure: Math.round(pressure),
    intensity: Math.round(maxIntensity),
    detectedAt: Date.now(),
    sample: cascadeCount,
  };
  cache.set(symbol, { data: result, fetchedAt: Date.now() });
  return result;
}

/**
 * Translate a per-symbol pulse into a directional confidence adjustment.
 * Aligned cascade → boost; opposing cascade → strong penalty (we don't fight cascades).
 */
export function liquidationBias(
  pulse: LiquidationPulse,
  signalDirection: 'LONG' | 'SHORT'
): { bias: number; reasons: string[] } {
  if (pulse.sample === 0 || pulse.intensity < 30) {
    return { bias: 0, reasons: [] };
  }

  const aligned = (signalDirection === 'LONG' && pulse.pressure > 0)
              || (signalDirection === 'SHORT' && pulse.pressure < 0);
  const mag = Math.min(15, Math.abs(pulse.pressure) / 6);

  if (aligned) return { bias: +mag, reasons: [`+${mag.toFixed(0)} cascade aligned (p=${pulse.pressure}, i=${pulse.intensity})`] };
  return { bias: -mag * 1.4, reasons: [`-${(mag * 1.4).toFixed(0)} cascade opposing (p=${pulse.pressure}, i=${pulse.intensity})`] };
}
