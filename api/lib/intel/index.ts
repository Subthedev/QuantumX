/**
 * Intelligence layer aggregator.
 *
 * One call site: `evaluateIntel(candidate, ctx)` returns a unified score adjustment
 * (-50..+50) plus a reasons trace. The cron builds `IntelContext` once per tick
 * (sentiment + cohort + liquidation pulses + persisted state) and feeds it into
 * decideTrade for each agent.
 *
 * On trade close, the cron calls `trainOnClose()` to update both the strategy
 * performance EWMA and the ML weights, then persists the new state back to
 * autonomous_state.state.
 */

import { scoreSignalQuality, type QualityInput, type AgentRiskProfile } from './quality';
import { fetchSentiment, sentimentBias, type SentimentSnapshot } from './sentiment';
import { fetchLiquidationPulse, liquidationBias, type LiquidationPulse } from './liquidations';
import { feedbackBias, recordOutcome, type StrategyPerformance } from './feedback';
import { defaultWeights, mlBias, trainOne, type MLWeights, type MLFeatureInput } from './ml';

export type { AgentRiskProfile, SentimentSnapshot, LiquidationPulse, StrategyPerformance, MLWeights };

export { fetchSentiment, fetchLiquidationPulse, defaultWeights };

/** Pre-tick context shared across all agent decisions in a single tick. */
export interface IntelContext {
  sentiment: SentimentSnapshot | null;
  cohort: Array<{ symbol: string; change24h: number }>;
  liquidationPulses: Map<string, LiquidationPulse>;   // key = symbol
  strategyPerformance: StrategyPerformance;
  mlWeights: MLWeights;
}

/** Per-candidate intel score result. */
export interface IntelEvaluation {
  totalAdjustment: number;     // -50..+50, applied to base confidence
  effectiveConfidence: number; // base + adjustment, clamped 0..100
  qualityScore: number;        // 0..100 from the standalone quality scorer
  pWin: number;                // ML win probability 0..1
  reasons: string[];           // human-readable trace
  shouldTake: boolean;         // false if any veto OR effectiveConfidence < floor
  vetoReason?: string;
}

export interface IntelCandidate {
  agentRiskProfile: AgentRiskProfile;
  signalDirection: 'LONG' | 'SHORT';
  signalConfidence: number;
  signalStrategyName: string;
  marketState: string;
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

const FLOOR = 50;

export function evaluateIntel(c: IntelCandidate, ctx: IntelContext): IntelEvaluation {
  const reasons: string[] = [];

  // 1. Quality scorer (standalone — uses cohort)
  const q: QualityInput = {
    agentRiskProfile: c.agentRiskProfile,
    signalDirection: c.signalDirection,
    signalConfidence: c.signalConfidence,
    signalStrategyName: c.signalStrategyName,
    marketState: c.marketState,
    symbol: c.symbol,
    price: c.price,
    change24h: c.change24h,
    high24h: c.high24h,
    low24h: c.low24h,
    volume: c.volume,
    cohort: ctx.cohort,
  };
  const quality = scoreSignalQuality(q);
  reasons.push(`quality=${quality.score}`);
  for (const r of quality.reasons.slice(0, 4)) reasons.push(`  · ${r}`);

  if (quality.veto) {
    return {
      totalAdjustment: 0,
      effectiveConfidence: 0,
      qualityScore: quality.score,
      pWin: 0,
      reasons: [`veto: ${quality.veto}`],
      shouldTake: false,
      vetoReason: quality.veto,
    };
  }

  // 2. Sentiment bias (LONG-positive becomes positive when bias is positive)
  let sentBiasMag = 0;
  if (ctx.sentiment) {
    const sb = sentimentBias(ctx.sentiment);
    // sb.bias is direction-agnostic LONG-positive. Flip for SHORT signals.
    sentBiasMag = c.signalDirection === 'LONG' ? sb.bias : -sb.bias;
    if (sb.reasons.length > 0) reasons.push(`sent=${sentBiasMag >= 0 ? '+' : ''}${sentBiasMag.toFixed(0)} (${sb.reasons.slice(0, 2).join(', ')})`);
  }

  // 3. Liquidation cascade bias
  const pulse = ctx.liquidationPulses.get(c.symbol);
  let liqBiasMag = 0;
  if (pulse) {
    const lb = liquidationBias(pulse, c.signalDirection);
    liqBiasMag = lb.bias;
    if (lb.reasons.length > 0) reasons.push(`liq=${liqBiasMag >= 0 ? '+' : ''}${liqBiasMag.toFixed(0)}`);
  }

  // 4. Feedback bias (historical performance for this strategy + regime)
  const fb = feedbackBias(ctx.strategyPerformance, c.signalStrategyName, c.marketState);
  if (fb.reasons.length > 0) reasons.push(`fb=${fb.bias >= 0 ? '+' : ''}${fb.bias.toFixed(0)}`);

  // 5. ML predictor
  const mlInput: MLFeatureInput = {
    qualityScore: quality.score,
    signalConfidence: c.signalConfidence,
    sentimentBias: sentBiasMag,
    liquidationBias: liqBiasMag,
    feedbackBias: fb.bias,
    agentRiskProfile: c.agentRiskProfile,
    regime: c.marketState,
    direction: c.signalDirection,
  };
  const ml = mlBias(ctx.mlWeights, mlInput);
  reasons.push(`ml=${ml.bias >= 0 ? '+' : ''}${ml.bias.toFixed(0)} pWin=${(ml.pWin * 100).toFixed(0)}%`);

  // Aggregate: quality contributes (score-50)/2 (so 80 quality = +15, 30 quality = -10)
  // The other biases each contribute their full magnitude. Total clamped to ±50.
  const qualityContrib = (quality.score - 50) / 2;
  const total = clamp(qualityContrib + sentBiasMag + liqBiasMag + fb.bias + ml.bias, -50, 50);
  const effective = clamp(c.signalConfidence + total, 0, 100);

  return {
    totalAdjustment: total,
    effectiveConfidence: effective,
    qualityScore: quality.score,
    pWin: ml.pWin,
    reasons,
    shouldTake: effective >= FLOOR,
  };
}

/**
 * Build a fresh IntelContext for one tick. Fetches sentiment + per-symbol
 * cascades in parallel (all free APIs, no keys, ~600ms total).
 *
 * `persisted` is whatever was in autonomous_state.state.intel; missing parts
 * fall back to defaults.
 */
export async function buildIntelContext(
  prices: Map<string, { symbol: string; change24h: number }>,
  symbols: string[],
  persisted: { strategyPerformance?: StrategyPerformance; mlWeights?: MLWeights } | null,
): Promise<IntelContext> {
  const cohort = Array.from(prices.values()).map(p => ({ symbol: p.symbol, change24h: p.change24h }));

  const sentimentPromise = fetchSentiment().catch(() => null);
  const pulsePromises = symbols.map(s => fetchLiquidationPulse(s).then(p => [s, p] as [string, LiquidationPulse]).catch(() => null));

  const [sentiment, pulseResults] = await Promise.all([sentimentPromise, Promise.all(pulsePromises)]);

  const liquidationPulses = new Map<string, LiquidationPulse>();
  for (const r of pulseResults) {
    if (r) liquidationPulses.set(r[0], r[1]);
  }

  return {
    sentiment,
    cohort,
    liquidationPulses,
    strategyPerformance: persisted?.strategyPerformance ?? {},
    mlWeights: persisted?.mlWeights ?? defaultWeights(),
  };
}

/**
 * Update intel state from a closed trade. Called once per close, before
 * persisting autonomous_state.state.
 */
export function trainOnClose(
  ctx: IntelContext,
  args: {
    agentRiskProfile: AgentRiskProfile;
    strategyName: string;
    regime: string;
    direction: 'LONG' | 'SHORT';
    isWin: boolean;
    pnlPercent: number;
    // The intel state at the time of opening — best-effort, for ML credit assignment.
    // If unavailable, we use the closing-tick context (still valid because regime
    // doesn't usually flip mid-trade and sentiment moves slowly).
    qualityScoreAtOpen?: number;
    signalConfidenceAtOpen?: number;
    sentimentBiasAtOpen?: number;
    liquidationBiasAtOpen?: number;
    feedbackBiasAtOpen?: number;
  }
): { perf: StrategyPerformance; weights: MLWeights } {
  // 1. Update strategy performance EWMA
  recordOutcome(ctx.strategyPerformance, args.strategyName, args.regime, args.isWin, args.pnlPercent);

  // 2. SGD step for ML
  const featureInput: MLFeatureInput = {
    qualityScore: args.qualityScoreAtOpen ?? 60,
    signalConfidence: args.signalConfidenceAtOpen ?? 70,
    sentimentBias: args.sentimentBiasAtOpen ?? 0,
    liquidationBias: args.liquidationBiasAtOpen ?? 0,
    feedbackBias: args.feedbackBiasAtOpen ?? 0,
    agentRiskProfile: args.agentRiskProfile,
    regime: args.regime,
    direction: args.direction,
  };
  trainOne(ctx.mlWeights, featureInput, args.isWin);

  return { perf: ctx.strategyPerformance, weights: ctx.mlWeights };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
