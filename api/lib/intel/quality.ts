/**
 * Pre-trade quality scorer.
 *
 * Takes a candidate signal + market context and returns a 0-100 quality score
 * plus the reasons that drove it. The cron uses this to gate weak trades that
 * the per-agent generator would otherwise let through, and to bias selection
 * when multiple pairs all generate signals at the same tick.
 *
 * Pure-function, zero external deps, ~1ms. Safe to call hundreds of times per
 * tick without any IO.
 */

export type AgentRiskProfile = 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';

export interface QualityInput {
  agentRiskProfile: AgentRiskProfile;   // AGGRESSIVE=trend, BALANCED=reversion, CONSERVATIVE=vol
  signalDirection: 'LONG' | 'SHORT';
  signalConfidence: number;             // from generateStrategySignal in core
  signalStrategyName: string;           // e.g. 'momentum-trend', 'mean-reversion', 'volatility-surf'
  marketState: string;
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  // Cohort context — other pairs at this tick. Used for cross-asset coherence.
  cohort?: Array<{ symbol: string; change24h: number }>;
}

export interface QualityScore {
  score: number;                   // 0-100
  reasons: string[];               // human-readable contributions, +N or -N each
  shouldTake: boolean;             // score >= 55 AND no veto
  veto?: string;                   // hard rejection reason if any
}

const QUALITY_FLOOR = 55;

export function scoreSignalQuality(input: QualityInput): QualityScore {
  let score = 50; // start neutral
  const reasons: string[] = [];
  let veto: string | undefined;

  const range = input.high24h > 0 ? ((input.high24h - input.low24h) / input.price) * 100 : 0;
  const positionInRange = input.high24h > input.low24h
    ? (input.price - input.low24h) / (input.high24h - input.low24h)
    : 0.5;

  // ─── 1. Strategy ↔ regime fit (strongest signal) ──────────────────────────
  const isHighVol = input.marketState.includes('HIGH_VOL');
  const isBullish = input.marketState.startsWith('BULLISH');
  const isBearish = input.marketState.startsWith('BEARISH');
  const isRangebound = input.marketState === 'RANGEBOUND';

  if (input.agentRiskProfile === 'AGGRESSIVE') {
    // Trend strategies want trending regimes
    if (isBullish && input.signalDirection === 'LONG')   { score += 12; reasons.push('+12 trend↔bullish-LONG fit'); }
    else if (isBearish && input.signalDirection === 'SHORT') { score += 12; reasons.push('+12 trend↔bearish-SHORT fit'); }
    else if (isRangebound) { score -= 10; reasons.push('-10 trend strategy in rangebound'); }
    else { score -= 6; reasons.push('-6 trend fighting regime'); }
  } else if (input.agentRiskProfile === 'BALANCED') {
    // Reversion wants rangebound or low-vol; punished in strong trends
    if (isRangebound) { score += 14; reasons.push('+14 reversion↔rangebound fit'); }
    else if (!isHighVol) { score += 6; reasons.push('+6 reversion in low-vol regime'); }
    else if (isHighVol) {
      // Reversion in high-vol can still work but is risky — small penalty
      score -= 8; reasons.push('-8 reversion in high-vol regime');
    }
    // Catching falling knives: extreme momentum AGAINST reversion direction
    if (input.signalDirection === 'LONG' && input.change24h < -6) {
      score -= 10; reasons.push('-10 reversion-LONG vs strong dump (knife catch)');
    }
    if (input.signalDirection === 'SHORT' && input.change24h > 6) {
      score -= 10; reasons.push('-10 reversion-SHORT vs strong rip (rocket grab)');
    }
  } else { // CONSERVATIVE
    // Vol/breakout wants high-vol regimes
    if (isHighVol) { score += 14; reasons.push('+14 vol-breakout↔high-vol fit'); }
    else if (isRangebound && range < 2) { score -= 12; reasons.push('-12 vol strategy in dead market'); }
  }

  // ─── 2. Range health (need real movement to trade) ────────────────────────
  if (range < 1) { veto = 'range too tight (<1%)'; }
  else if (range < 1.5) { score -= 6; reasons.push('-6 thin 24h range'); }
  else if (range > 8) { score += 4; reasons.push('+4 wide range = opportunity'); }

  // ─── 3. Position-in-range support for direction ───────────────────────────
  // For LONGs, lower in range is generally better entry; for SHORTs, higher is better.
  // (Reversion already exploits extremes, so this is a small modifier.)
  if (input.signalDirection === 'LONG' && positionInRange < 0.4) { score += 4; reasons.push('+4 LONG in lower-range'); }
  if (input.signalDirection === 'SHORT' && positionInRange > 0.6) { score += 4; reasons.push('+4 SHORT in upper-range'); }
  if (input.signalDirection === 'LONG' && positionInRange > 0.85) { score -= 6; reasons.push('-6 LONG near 24h high'); }
  if (input.signalDirection === 'SHORT' && positionInRange < 0.15) { score -= 6; reasons.push('-6 SHORT near 24h low'); }

  // ─── 4. Cross-asset coherence ─────────────────────────────────────────────
  // If our LONG signal is for a coin going up while the basket as a whole is dumping,
  // that's idiosyncratic and risky. Reward signals that align with the broader move.
  if (input.cohort && input.cohort.length >= 3) {
    const others = input.cohort.filter(c => c.symbol !== input.symbol);
    if (others.length > 0) {
      const avgChange = others.reduce((s, c) => s + c.change24h, 0) / others.length;
      if (input.signalDirection === 'LONG' && avgChange > 1) { score += 3; reasons.push(`+3 basket up (${avgChange.toFixed(1)}%)`); }
      if (input.signalDirection === 'LONG' && avgChange < -3) { score -= 6; reasons.push(`-6 going LONG against basket dump (${avgChange.toFixed(1)}%)`); }
      if (input.signalDirection === 'SHORT' && avgChange < -1) { score += 3; reasons.push(`+3 basket down (${avgChange.toFixed(1)}%)`); }
      if (input.signalDirection === 'SHORT' && avgChange > 3) { score -= 6; reasons.push(`-6 going SHORT against basket pump (${avgChange.toFixed(1)}%)`); }
    }
  }

  // ─── 5. Time-of-day (UTC) ─────────────────────────────────────────────────
  // Crypto's deepest liquidity is during EU/US overlap (~12:00-20:00 UTC).
  // Asia session (00:00-08:00 UTC) is choppier; signals less reliable.
  const hourUTC = new Date().getUTCHours();
  if (hourUTC >= 13 && hourUTC <= 20) { score += 3; reasons.push('+3 EU/US session'); }
  else if (hourUTC >= 3 && hourUTC <= 7) { score -= 4; reasons.push('-4 dead-zone session (Asia early)'); }

  // ─── 6. Confidence carry-through ──────────────────────────────────────────
  // The per-agent generator already produced a confidence. Carry it as a small
  // sanity factor — anomalously high (>85) gets a cap, anomalously low (<55) gets a tap.
  if (input.signalConfidence >= 80) { score += 4; reasons.push(`+4 generator confidence ${input.signalConfidence.toFixed(0)}`); }
  else if (input.signalConfidence < 55) { score -= 4; reasons.push(`-4 generator confidence only ${input.signalConfidence.toFixed(0)}`); }

  // ─── Clamp + final ────────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, Math.round(score)));
  const shouldTake = !veto && score >= QUALITY_FLOOR;

  return { score, reasons, shouldTake, veto };
}
