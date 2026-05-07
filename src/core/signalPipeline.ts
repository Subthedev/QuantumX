/**
 * Runtime-agnostic intelligence-signal pipeline.
 *
 * Produces SignalCandidates suitable for writing to the `intelligence_signals`
 * table. This is the server-side version of what globalHubService does in the
 * browser, but trimmed down: no setInterval timers, no Delta V2 ML model,
 * no Zeta calibration. Just strategy-matrix scoring + confidence ranking.
 *
 * Runs from /api/agents/signal-tick (every 5 minutes via Vercel Cron).
 *
 * Dependencies: only @/core/marketState and @/services/strategyMatrix
 * (verified pure after Phase 1.A's extraction).
 */

import { MarketState } from './marketState';
import { strategyMatrix, AgentType, type StrategyProfile } from '../services/strategyMatrix';
import type { PriceData, AutonomousBrain } from './tradeDecision';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SignalCandidate {
  symbol: string;        // 'BTC' (no USDT suffix — matches intelligence_signals convention)
  fullSymbol: string;    // 'BTCUSDT' — for cross-referencing trade-tick
  signalType: 'LONG' | 'SHORT';
  confidence: number;    // 0-100
  currentPrice: number;
  entryMin: number;
  entryMax: number;
  target1: number;
  target2: number;
  stopLoss: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  strength: number;      // 0-10 — used by intelligence_signals.strength
  strategy: string;
  regime: MarketState;
  thesis: string;
  invalidation: string;
  expiresInMs: number;
}

export interface SignalUniverse {
  symbol: string;        // 'BTCUSDT'
  display: string;       // 'BTC' (without /USD)
  tier: 'major' | 'mid' | 'volatile';
}

export const DEFAULT_SIGNAL_UNIVERSE: SignalUniverse[] = [
  { symbol: 'BTCUSDT',  display: 'BTC',  tier: 'major' },
  { symbol: 'ETHUSDT',  display: 'ETH',  tier: 'major' },
  { symbol: 'SOLUSDT',  display: 'SOL',  tier: 'major' },
  { symbol: 'BNBUSDT',  display: 'BNB',  tier: 'mid' },
  { symbol: 'XRPUSDT',  display: 'XRP',  tier: 'mid' },
  { symbol: 'DOGEUSDT', display: 'DOGE', tier: 'volatile' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Strategy-driven scoring per pair
// ─────────────────────────────────────────────────────────────────────────────

interface PairScore {
  symbol: string;
  display: string;
  price: PriceData;
  bestStrategy: StrategyProfile;
  bestSignal: { direction: 'LONG' | 'SHORT'; confidence: number; tpPct: number; slPct: number };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function scorePair(
  pair: SignalUniverse,
  price: PriceData,
  marketState: MarketState,
  brain: AutonomousBrain,
): PairScore | null {
  const candidates = strategyMatrix.getSuitableStrategies(marketState, 50);
  if (candidates.length === 0) return null;

  let best: { strategy: StrategyProfile; direction: 'LONG' | 'SHORT'; confidence: number; tpPct: number; slPct: number } | null = null;

  for (const { strategy } of candidates.slice(0, 5)) {
    // Skip blacklisted strategy/regime combos
    const key = `${strategy.name}-${marketState}`;
    if (brain.blacklistedStrategies?.includes(key)) continue;

    // Multi-confirmation direction (same as tradeDecision)
    const range = price.high24h - price.low24h;
    const rangePos = range > 0 ? (price.price - price.low24h) / range : 0.5;
    let bull = 0;
    let bear = 0;

    if (marketState.startsWith('BULLISH')) bull += 2;
    else if (marketState.startsWith('BEARISH')) bear += 2;

    if (price.change24h > 2) bull += 1.5;
    else if (price.change24h < -2) bear += 1.5;

    if (strategy.agent === AgentType.BETAX) {
      if (rangePos < 0.3) bull += 1;
      else if (rangePos > 0.7) bear += 1;
    }

    if (strategy.agent === AgentType.ALPHAX) {
      if (bull > bear) bull += 1.5; else bear += 1.5;
    } else if (strategy.agent === AgentType.BETAX) {
      if (price.change24h > 5) bear += 1.5;
      else if (price.change24h < -5) bull += 1.5;
    } else if (strategy.agent === AgentType.QUANTUMX) {
      if (Math.abs(price.change24h) > 3) {
        if (price.change24h > 0) bull += 1.5; else bear += 1.5;
      }
    }

    if (price.volume > 0) {
      if (bull > bear && price.change24h > 0) bull += 0.5;
      else if (bear > bull && price.change24h < 0) bear += 0.5;
    }

    const totalScore = bull + bear;
    const directionStrength = totalScore > 0 ? Math.abs(bull - bear) / totalScore : 0;
    const direction: 'LONG' | 'SHORT' = bull >= bear ? 'LONG' : 'SHORT';

    // Adaptive R:R based on regime + strategy type
    const isHighVol = marketState.includes('HIGH_VOL');
    const isRange = marketState === MarketState.RANGEBOUND;
    let baseTP: number;
    let baseSL: number;
    if (strategy.agent === AgentType.ALPHAX) { baseTP = 3.5; baseSL = 1.4; }
    else if (strategy.agent === AgentType.BETAX) { baseTP = 2.5; baseSL = 1.2; }
    else { baseTP = 4.5; baseSL = 2.0; }

    const range24hPct = price.high24h > 0 ? ((price.high24h - price.low24h) / price.price) * 100 : 2;
    const volMult = isHighVol ? 1.4 : (isRange ? 0.7 : 1.0);
    const rangeAdj = clamp(range24hPct / 4, 0.6, 1.5);

    let tpPct = baseTP * volMult * rangeAdj;
    let slPct = baseSL * volMult * rangeAdj;
    if (tpPct / slPct < 1.8) tpPct = slPct * 1.8;
    tpPct = clamp(tpPct, 1.5, 10);
    slPct = clamp(slPct, 0.75, 4);

    const suitability = strategy.suitability[marketState];
    const directionBonus = directionStrength * 15;

    // Apply autonomous brain strategy bias to confidence (modest scaling)
    const bias = brain.strategyBias[`${strategy.name}-${marketState}`]
      ?? brain.strategyBias[strategy.name]
      ?? 1.0;
    const biasBonus = (clamp(bias, 0.1, 2.0) - 1.0) * 5; // -4.5 to +5

    const confidence = clamp(suitability + directionBonus + biasBonus, 0, 95);

    if (!best || confidence > best.confidence) {
      best = { strategy, direction, confidence, tpPct, slPct };
    }
  }

  if (!best) return null;
  return {
    symbol: pair.symbol,
    display: pair.display,
    price,
    bestStrategy: best.strategy,
    bestSignal: best,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineConfig {
  minConfidence: number;       // default 65
  maxSignals: number;          // default 4 — top-N selection
  expiresInMs: number;         // default 2 hours
  fearGreedIndex?: number;     // optional — passed through to thesis
}

const DEFAULT_CONFIG: Required<PipelineConfig> = {
  minConfidence: 65,
  maxSignals: 4,
  expiresInMs: 2 * 60 * 60 * 1000,
  fearGreedIndex: 50,
};

export function generateSignalCandidates(
  prices: Map<string, PriceData>,
  marketState: MarketState,
  brain: AutonomousBrain,
  universe: SignalUniverse[] = DEFAULT_SIGNAL_UNIVERSE,
  config: Partial<PipelineConfig> = {},
): SignalCandidate[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const scores: PairScore[] = [];
  for (const pair of universe) {
    const price = prices.get(pair.symbol);
    if (!price) continue;
    const score = scorePair(pair, price, marketState, brain);
    if (score && score.bestSignal.confidence >= cfg.minConfidence) {
      scores.push(score);
    }
  }

  // Sort by confidence DESC, take top N
  scores.sort((a, b) => b.bestSignal.confidence - a.bestSignal.confidence);
  const top = scores.slice(0, cfg.maxSignals);

  return top.map(s => toCandidate(s, marketState, cfg));
}

function toCandidate(
  score: PairScore,
  regime: MarketState,
  cfg: Required<PipelineConfig>,
): SignalCandidate {
  const { price, bestSignal: sig, bestStrategy, display, symbol } = score;
  const isLong = sig.direction === 'LONG';

  // Entry zone: ±0.3% around current price
  const entrySpread = price.price * 0.003;
  const entryMin = isLong ? price.price - entrySpread : price.price - entrySpread;
  const entryMax = isLong ? price.price + entrySpread : price.price + entrySpread;

  // Targets
  const target1 = isLong
    ? price.price * (1 + sig.tpPct / 100)
    : price.price * (1 - sig.tpPct / 100);
  const target2 = isLong
    ? price.price * (1 + (sig.tpPct * 1.6) / 100)
    : price.price * (1 - (sig.tpPct * 1.6) / 100);
  const stopLoss = isLong
    ? price.price * (1 - sig.slPct / 100)
    : price.price * (1 + sig.slPct / 100);

  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    sig.confidence >= 80 ? 'LOW' :
    sig.confidence >= 65 ? 'MEDIUM' : 'HIGH';

  const strength = Math.round(sig.confidence / 10);

  const directionWord = isLong ? 'LONG' : 'SHORT';
  const thesis = `${bestStrategy.name} signal on ${display}. ${regime.replace(/_/g, ' ')} regime favors ${directionWord} positioning. ` +
    `24h move: ${price.change24h.toFixed(2)}%. Confidence ${sig.confidence.toFixed(0)}% (R:R ${(sig.tpPct / sig.slPct).toFixed(2)}:1).`;

  const invalidation = isLong
    ? `Invalidate if price closes below $${stopLoss.toFixed(2)} or regime shifts BEARISH.`
    : `Invalidate if price closes above $${stopLoss.toFixed(2)} or regime shifts BULLISH.`;

  return {
    symbol: display,
    fullSymbol: symbol,
    signalType: sig.direction,
    confidence: sig.confidence,
    currentPrice: price.price,
    entryMin,
    entryMax,
    target1,
    target2,
    stopLoss,
    riskLevel,
    strength,
    strategy: bestStrategy.name,
    regime,
    thesis,
    invalidation,
    expiresInMs: cfg.expiresInMs,
  };
}
